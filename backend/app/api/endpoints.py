import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
import json
from datetime import datetime, timedelta

from app.core.database import get_db, AsyncSessionLocal
from app.models.signals import Signal
from app.models.market_data import OHLCCandle
from app.models.patterns import DetectedPattern
from app.models.events import CorporateEvent
from app.services.llm_explainer import llm_service

router = APIRouter()

# ── Signals Feed ────────────────────────────────────────────────────────────

@router.get("/signals")
async def get_signals(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    symbol: Optional[str] = None,
    signal_type: Optional[str] = None,           # "pattern" | "opportunity"
    direction: Optional[str] = None,              # "bullish" | "bearish"
    min_win_rate: Optional[float] = None,         # e.g. 60.0
    min_confluence: Optional[int] = None,         # 0-3
    high_confluence_only: bool = False,
    archived: bool = False,                       # include is_active=FALSE
    deduplicate_symbol: bool = False,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Signal)

    if not archived:
        stmt = stmt.where(Signal.is_active == True)
    if symbol:
        stmt = stmt.where(Signal.symbol == symbol.upper())
    if signal_type:
        stmt = stmt.where(Signal.signal_type == signal_type)
    if high_confluence_only:
        stmt = stmt.where(Signal.high_confluence == True)
    if direction:
        # direction comes from the linked detected_pattern
        stmt = stmt.join(DetectedPattern, Signal.pattern_id == DetectedPattern.id, isouter=True)
        stmt = stmt.where(DetectedPattern.signal_direction == direction.lower())
    if min_win_rate is not None:
        stmt = stmt.where(Signal.win_rate_15d >= min_win_rate)
    if min_confluence is not None:
        stmt = stmt.where(Signal.confluence_score >= min_confluence)

    # We fetch an excess amount to do memory deduplication, since SQL DISTINCT ON interferes with global order by rank
    stmt = stmt.order_by(desc(Signal.signal_rank), desc(Signal.created_at)).limit(300)
    result = await db.execute(stmt)
    all_signals = result.scalars().all()
    
    unique_signals = []
    seen_symbols = set()
    for s in all_signals:
        if deduplicate_symbol:
            if s.symbol in seen_symbols:
                continue
            seen_symbols.add(s.symbol)
        unique_signals.append(s)

    paged_signals = unique_signals[skip : skip + limit]

    return {
        "data": [_signal_to_dict(s) for s in paged_signals],
        "skip": skip,
        "limit": limit,
        "total": len(unique_signals)
    }


@router.get("/signals/{signal_id}")
async def get_signal_detail(signal_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    """Full signal detail — backtest metrics, confluence events, paragraph explanation."""
    stmt = select(Signal).where(Signal.id == signal_id)
    result = await db.execute(stmt)
    signal = result.scalars().first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    detail = _signal_to_dict(signal)

    # Attach pattern
    if signal.pattern_id:
        p_stmt = select(DetectedPattern).where(DetectedPattern.id == signal.pattern_id)
        p_res = await db.execute(p_stmt)
        pattern = p_res.scalars().first()
        if pattern:
            detail["pattern"] = {
                "pattern_name": pattern.pattern_name,
                "signal_direction": pattern.signal_direction,
                "timeframe": pattern.timeframe,
                "detected_at": pattern.detected_at.isoformat() if pattern.detected_at else None,
            }

    # Attach corporate events
    if signal.event_ids:
        e_stmt = select(CorporateEvent).where(CorporateEvent.id.in_(signal.event_ids))
        e_res = await db.execute(e_stmt)
        events = e_res.scalars().all()
        detail["events"] = [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "event_date": e.event_date.isoformat() if e.event_date else None,
                "party_name": e.party_name,
                "total_value_cr": float(e.total_value_cr) if e.total_value_cr else None,
                "source_reference": e.source_reference,
                "is_anomaly": e.is_anomaly,
            }
            for e in events
        ]

    return detail

@router.post("/stock/{symbol}/analyze")
async def analyze_stock_on_demand(symbol: str = Path(...), db: AsyncSession = Depends(get_db)):
    """
    On-Demand Pipeline trigger.
    Fetches missing historical data for a newly searched completely unknown symbol,
    runs the pattern detector, scores confluence, and prepares it for the UI.
    """
    from app.services.market_data import fetch_and_store_klines
    from app.services.pattern_detector import detect_patterns_for_symbol
    from app.services.confluence_scorer import process_new_patterns
    import logging
    
    logger = logging.getLogger("investorradar.api")
    symbol_ns = symbol.upper()
    if not symbol_ns.endswith(".NS"):
        symbol_ns += ".NS"
    base_symbol = symbol_ns.replace(".NS", "")
    
    logger.info(f"On-Demand Analysis started for {symbol_ns}")
    try:
        # 1. Fetch market data (15m and 1d)
        await fetch_and_store_klines(symbol_ns, period="5d", interval="15m")
        await fetch_and_store_klines(symbol_ns, period="2mo", interval="1d")
        
        # 2. Detect patterns
        await detect_patterns_for_symbol(base_symbol, timeframe="15m")
        await detect_patterns_for_symbol(base_symbol, timeframe="1d")
        
        # 3. Score confluence (this naturally picks up newly inserted patterns)
        await process_new_patterns()
        
        return {"status": "success", "message": f"Successfully ran analysis pipeline for {base_symbol}"}
    except Exception as e:
        logger.error(f"Error during on-demand analysis for {symbol_ns}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        

# ── Stock Data ────────────────────────────────────────────────────────────────

@router.get("/search")
async def search_stock(q: str = Query(...)):
    """Resolves generic search terms into precise Yahoo Finance tickers."""
    import requests
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get(f"https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=5&newsCount=0", headers=headers)
    if res.status_code == 200:
        data = res.json()
        quotes = data.get("quotes", [])
        for q_dict in quotes:
            ex = q_dict.get('exchange', '')
            sym = q_dict.get('symbol', '')
            if ex in ['NSI', 'BSE'] and not sym.endswith(".BO"):
                return {"symbol": sym, "name": q_dict.get('shortname')}
        if quotes:
            return {"symbol": quotes[0].get('symbol'), "name": quotes[0].get('shortname')}
    
    # Fallback to direct input
    sym = q.upper()
    if not sym.endswith(".NS"): sym += ".NS"
    return {"symbol": sym, "name": q.upper()}


@router.get("/stock/{symbol}")
async def get_stock_ohlcv(
    symbol: str = Path(...),
    timeframe: str = Query("15m", regex="^(1m|5m|15m|1d)$"),
    from_ts: Optional[str] = Query(None, alias="from"),
    to_ts: Optional[str] = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db)
):
    """OHLCV formatted for lightweight-charts. Supports timeframe + date range filters."""
    clean_sym = symbol.upper().replace(".NS", "").replace(".BO", "")
    stmt = select(OHLCCandle).where(
        OHLCCandle.symbol == clean_sym,
        OHLCCandle.timeframe == timeframe
    )
    if from_ts:
        stmt = stmt.where(OHLCCandle.timestamp >= datetime.fromisoformat(from_ts))
    if to_ts:
        stmt = stmt.where(OHLCCandle.timestamp <= datetime.fromisoformat(to_ts))
    stmt = stmt.order_by(OHLCCandle.timestamp)

    result = await db.execute(stmt)
    candles = result.scalars().all()

    return [
        {
            "time": int(c.timestamp.timestamp()),
            "open": float(c.open),
            "high": float(c.high),
            "low": float(c.low),
            "close": float(c.close),
            "volume": c.volume
        }
        for c in candles
    ]


@router.get("/stock/{symbol}/patterns")
async def get_stock_patterns(
    symbol: str = Path(...),
    from_ts: Optional[str] = Query(None, alias="from"),
    to_ts: Optional[str] = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db)
):
    clean_sym = symbol.upper().replace(".NS", "").replace(".BO", "")
    stmt = select(DetectedPattern).where(DetectedPattern.symbol == clean_sym)
    if from_ts:
        stmt = stmt.where(DetectedPattern.detected_at >= datetime.fromisoformat(from_ts))
    if to_ts:
        stmt = stmt.where(DetectedPattern.detected_at <= datetime.fromisoformat(to_ts))
    stmt = stmt.order_by(desc(DetectedPattern.detected_at)).limit(100)
    result = await db.execute(stmt)
    patterns = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "symbol": p.symbol,
            "pattern_name": p.pattern_name,
            "signal_direction": p.signal_direction,
            "timeframe": p.timeframe,
            "detected_at": p.detected_at.isoformat() if p.detected_at else None,
        }
        for p in patterns
    ]


@router.get("/stock/{symbol}/events")
async def get_stock_events(
    symbol: str = Path(...),
    from_ts: Optional[str] = Query(None, alias="from"),
    to_ts: Optional[str] = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db)
):
    clean_sym = symbol.upper().replace(".NS", "").replace(".BO", "")
    stmt = select(CorporateEvent).where(CorporateEvent.symbol == clean_sym)
    if from_ts:
        stmt = stmt.where(CorporateEvent.event_date >= datetime.fromisoformat(from_ts).date())
    if to_ts:
        stmt = stmt.where(CorporateEvent.event_date <= datetime.fromisoformat(to_ts).date())
    stmt = stmt.order_by(desc(CorporateEvent.event_date)).limit(50)
    result = await db.execute(stmt)
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "symbol": e.symbol,
            "event_type": e.event_type,
            "event_date": e.event_date.isoformat() if e.event_date else None,
            "party_name": e.party_name,
            "quantity": e.quantity,
            "price_per_share": float(e.price_per_share) if e.price_per_share else None,
            "total_value_cr": float(e.total_value_cr) if e.total_value_cr else None,
            "is_anomaly": e.is_anomaly,
            "source_reference": e.source_reference,
        }
        for e in events
    ]


# ── LLM Explain (SSE) ─────────────────────────────────────────────────────────

@router.get("/explain/{signal_id}")
async def explain_signal(signal_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    """Stream deep-dive LLM explanation via SSE."""
    return EventSourceResponse(llm_service.stream_deep_dive(signal_id, db))


# ── Alerts (SSE) ───────────────────────────────────────────────────────────────

@router.get("/alerts")
async def stream_alerts(db: AsyncSession = Depends(get_db)):
    """Real-time SSE push of newly created signals."""
    async def event_generator():
        last_checked = datetime.utcnow()
        while True:
            await asyncio.sleep(5)
            stmt = select(Signal).where(Signal.created_at > last_checked).order_by(Signal.created_at)
            result = await db.execute(stmt)
            new_signals = result.scalars().all()

            if new_signals:
                last_checked = datetime.utcnow()
                for sig in new_signals:
                    yield f"data: {json.dumps({'id': str(sig.id), 'symbol': sig.symbol, 'signal_type': sig.signal_type, 'signal_rank': float(sig.signal_rank) if sig.signal_rank else 0, 'created_at': sig.created_at.isoformat()})}\n\n"
            else:
                yield ": ping\n\n"

    return EventSourceResponse(event_generator())


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health/pipeline")
async def pipeline_health(db: AsyncSession = Depends(get_db)):
    """Extended pipeline health: last refresh, active signals, error count."""
    try:
        # Last OHLC ingestion
        last_candle_stmt = select(func.max(OHLCCandle.timestamp))
        last_candle_res = await db.execute(last_candle_stmt)
        last_refresh_at = last_candle_res.scalar()

        # Active signals count
        active_stmt = select(func.count()).where(Signal.is_active == True)
        active_res = await db.execute(active_stmt)
        active_count = active_res.scalar() or 0

        stale = False
        if last_refresh_at:
            age_minutes = (datetime.utcnow() - last_refresh_at.replace(tzinfo=None)).total_seconds() / 60
            stale = age_minutes > 30

        return {
            "status": "healthy",
            "last_refresh_at": last_refresh_at.isoformat() if last_refresh_at else None,
            "active_signal_count": active_count,
            "data_stale": stale,
            "version": "1.0.0"
        }
    except Exception as e:
        return {"status": "degraded", "error": str(e)}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _signal_to_dict(s: Signal) -> dict:
    return {
        "id": str(s.id),
        "symbol": s.symbol,
        "signal_type": s.signal_type,
        "pattern_id": str(s.pattern_id) if s.pattern_id else None,
        "win_rate_5d": float(s.win_rate_5d) if s.win_rate_5d else None,
        "win_rate_15d": float(s.win_rate_15d) if s.win_rate_15d else None,
        "confluence_score": s.confluence_score,
        "high_confluence": s.high_confluence,
        "signal_rank": float(s.signal_rank) if s.signal_rank else None,
        "one_liner": s.one_liner,
        "paragraph_explanation": s.paragraph_explanation,
        "low_confidence": s.low_confidence,
        "is_active": s.is_active,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "source_reference": s.source_reference,
    }


# ── Signal Expiry Job (called from scheduler in main.py) ──────────────────────

async def expire_old_signals():
    """Sets is_active=FALSE for signals older than 5 trading days (~7 calendar days)."""
    cutoff = datetime.utcnow() - timedelta(days=7)
    async with AsyncSessionLocal() as session:
        stmt = select(Signal).where(Signal.created_at < cutoff, Signal.is_active == True)
        result = await session.execute(stmt)
        old_signals = result.scalars().all()
        for sig in old_signals:
            sig.is_active = False
        await session.commit()
        if old_signals:
            print(f"[expiry] Marked {len(old_signals)} signals as inactive.")
