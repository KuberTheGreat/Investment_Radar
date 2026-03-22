import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, Query, Path
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import json
from datetime import datetime

from app.core.database import get_db
from app.models.signals import Signal
from app.models.market_data import OHLCCandle
from app.models.patterns import DetectedPattern
from app.models.events import CorporateEvent
from app.services.llm_explainer import llm_service

router = APIRouter()

@router.get("/signals")
async def get_signals(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    symbol: Optional[str] = None,
    signal_type: Optional[str] = None,
    high_confluence_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Signal)
    if symbol:
        stmt = stmt.where(Signal.symbol == symbol.upper())
    if signal_type:
        stmt = stmt.where(Signal.signal_type == signal_type)
    if high_confluence_only:
        stmt = stmt.where(Signal.high_confluence == True)
        
    stmt = stmt.order_by(desc(Signal.signal_rank), desc(Signal.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    signals = result.scalars().all()
    return {"data": signals, "skip": skip, "limit": limit}

@router.get("/stock/{symbol}")
async def get_stock_ohlcv(symbol: str = Path(...), db: AsyncSession = Depends(get_db)):
    """
    Format for lightweight-charts:
    [ { time: 1640995200, open: 32.51, high: 32.51, low: 32.51, close: 32.51 }, ... ]
    """
    stmt = select(OHLCCandle).where(OHLCCandle.symbol == symbol.upper()).order_by(OHLCCandle.timestamp)
    result = await db.execute(stmt)
    candles = result.scalars().all()
    
    data = []
    for c in candles:
        data.append({
            "time": int(c.timestamp.timestamp()),
            "open": float(c.open),
            "high": float(c.high),
            "low": float(c.low),
            "close": float(c.close),
            "volume": c.volume
        })
    return data

@router.get("/stock/{symbol}/patterns")
async def get_stock_patterns(symbol: str = Path(...), db: AsyncSession = Depends(get_db)):
    stmt = select(DetectedPattern).where(DetectedPattern.symbol == symbol.upper()).order_by(desc(DetectedPattern.detected_at)).limit(50)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/stock/{symbol}/events")
async def get_stock_events(symbol: str = Path(...), db: AsyncSession = Depends(get_db)):
    stmt = select(CorporateEvent).where(CorporateEvent.symbol == symbol.upper()).order_by(desc(CorporateEvent.event_date)).limit(50)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/explain/{signal_id}")
async def explain_signal(signal_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    """
    Stream the explanation utilizing SSE
    """
    return EventSourceResponse(llm_service.stream_deep_dive(signal_id, db))

@router.get("/alerts")
async def stream_alerts(db: AsyncSession = Depends(get_db)):
    """
    Stream newly created signals in real-time.
    We poll the DB for new signals since the last check.
    """
    import logging
    logger = logging.getLogger("alerts")
    
    async def event_generator():
        last_checked = datetime.utcnow()
        while True:
            await asyncio.sleep(5)
            # Fetch new signals
            stmt = select(Signal).where(Signal.created_at > last_checked).order_by(Signal.created_at)
            result = await db.execute(stmt)
            new_signals = result.scalars().all()
            
            if new_signals:
                last_checked = datetime.utcnow()
                for sig in new_signals:
                    payload = {
                        "id": str(sig.id),
                        "symbol": sig.symbol,
                        "signal_type": sig.signal_type,
                        "signal_rank": float(sig.signal_rank) if sig.signal_rank else 0,
                        "created_at": sig.created_at.isoformat()
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
            else:
                # Keep-alive ping
                yield ": ping\n\n"
                
    return EventSourceResponse(event_generator())
