"""
market_data.py — OHLCV Historical Data Pipeline.

Data Source Priority:
  1. Angel One SmartAPI getCandleData (primary — if broker session is active)
  2. yfinance (fallback — when broker is not authenticated)

This dual-source architecture ensures the pipeline always works,
even before the user connects their Angel One credentials.
Angel One data is more reliable, faster, and doesn't have rate-limits
for NSE equities specifically.

Interval mappings:
  yfinance "15m" / "1d"  ←→  Angel One "FIFTEEN_MINUTE" / "ONE_DAY"
"""
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import asyncio
import logging
import pytz

from app.core.database import AsyncSessionLocal
from app.models.market_data import OHLCCandle
from sqlalchemy.dialects.postgresql import insert

logger = logging.getLogger("investorradar.market_data")
IST = pytz.timezone("Asia/Kolkata")

# ── Date range helpers ────────────────────────────────────────────────────────

def _date_range_for(interval: str) -> tuple[datetime, datetime]:
    """
    Returns (from_date, to_date) in IST for a given candle interval.
    Limits are per Angel One API documentation.
    """
    now = datetime.now(IST)
    ranges = {
        "1m":  timedelta(days=29),    # Angel One: max 30 days for 1m
        "5m":  timedelta(days=45),    # Angel One: max 100 days for 5m
        "15m": timedelta(days=200),   # Angel One: max 200 days for 15m
        "30m": timedelta(days=200),   # Angel One: max 200 days for 30m
        "1h":  timedelta(days=365),   # Angel One: max 2 years for 1h
        "1d":  timedelta(days=730),   # Angel One: unlimited — use 2 years
    }
    delta = ranges.get(interval, timedelta(days=30))
    from_date = now - delta
    return from_date, now


# ── DB upsert helper ──────────────────────────────────────────────────────────

async def _upsert_candles(symbol: str, interval: str, candles: list[dict]):
    """
    Bulk upsert OHLCV candles into the DB.
    Handles timezone normalisation and OHLC validation.
    """
    if not candles:
        return

    async with AsyncSessionLocal() as session:
        for c in candles:
            ts = c["timestamp"]
            # Ensure timezone-aware in IST
            if ts.tzinfo is None:
                ts = IST.localize(ts)
            else:
                ts = ts.astimezone(IST)

            o, h, l, cl, vol = c["open"], c["high"], c["low"], c["close"], c["volume"]

            # OHLC integrity check
            if not (h >= o and h >= cl and h >= l and l <= o and l <= cl):
                continue

            stmt = insert(OHLCCandle).values(
                symbol=symbol,
                timestamp=ts,
                timeframe=interval,
                open=o,
                high=h,
                low=l,
                close=cl,
                volume=vol,
                is_stale=False,
            ).on_conflict_do_update(
                index_elements=["symbol", "timestamp", "timeframe"],
                set_=dict(open=o, high=h, low=l, close=cl, volume=vol),
            )
            await session.execute(stmt)
        await session.commit()

    logger.info(f"market_data: Upserted {len(candles)} candles for {symbol} @ {interval}")


# ── Angel One fetch ───────────────────────────────────────────────────────────

async def _fetch_via_angel_one(symbol: str, interval: str) -> list[dict]:
    """
    Fetch OHLCV candles from Angel One getCandleData API.
    Runs the synchronous SDK call in a thread pool to avoid blocking the event loop.
    Returns [] on any failure so caller can fallback to yfinance.
    """
    from app.services.broker_service import broker_service

    if not broker_service._is_authenticated:
        return []

    from_date, to_date = _date_range_for(interval)

    loop = asyncio.get_running_loop()
    candles = await loop.run_in_executor(
        None,
        lambda: broker_service.get_historical_candles(
            symbol=symbol,
            interval=interval,
            from_date=from_date,
            to_date=to_date,
        )
    )
    return candles or []


# ── yfinance fallback fetch ───────────────────────────────────────────────────

_YFINANCE_PERIOD_MAP = {
    "1m":  "7d",    # yfinance max for 1m is 7 days
    "5m":  "60d",   # yfinance max for 5m
    "15m": "60d",   # yfinance max for 15m
    "30m": "60d",
    "1h":  "2y",
    "1d":  "5y",
}

def _fetch_via_yfinance(symbol_ns: str, interval: str) -> list[dict]:
    """
    Fetch OHLCV candles from yfinance as a fallback.
    symbol_ns must include .NS suffix (e.g. "RELIANCE.NS").
    Returns list of candle dicts matching the Angel One format.
    """
    period = _YFINANCE_PERIOD_MAP.get(interval, "5d")
    try:
        ticker = yf.Ticker(symbol_ns)
        df = ticker.history(period=period, interval=interval)
        if df.empty:
            return []

        df = df.reset_index()
        time_col = "Datetime" if "Datetime" in df.columns else "Date"
        candles = []
        for _, row in df.iterrows():
            pt = row[time_col]
            ts = pt.to_pydatetime().astimezone(IST) if pt.tzinfo else IST.localize(pt.to_pydatetime())
            candles.append({
                "timestamp": ts,
                "open":   float(row["Open"]),
                "high":   float(row["High"]),
                "low":    float(row["Low"]),
                "close":  float(row["Close"]),
                "volume": int(row["Volume"]),
            })
        return candles
    except Exception as e:
        logger.warning(f"market_data: yfinance fallback failed for {symbol_ns} {interval}: {e}")
        return []


# ── Public API ────────────────────────────────────────────────────────────────

async def fetch_and_store_klines(symbol: str, interval: str, period: str = None):
    """
    Fetch OHLCV candles for `symbol` at `interval` and upsert to DB.

    Priority: Angel One getCandleData → yfinance fallback.

    Args:
        symbol:   With OR without .NS suffix — handled internally.
        interval: "1m" | "5m" | "15m" | "1h" | "1d"
        period:   Ignored (kept for backward compatibility with existing callers).
                  Date range is computed automatically per interval.
    """
    # Normalise symbol
    symbol_ns = symbol if symbol.endswith(".NS") else symbol + ".NS"
    base_symbol = symbol_ns.replace(".NS", "")

    # ── Try Angel One first ──────────────────────────────────────────────────
    candles = await _fetch_via_angel_one(base_symbol, interval)

    if candles:
        logger.info(f"market_data: ✓ Angel One data for {base_symbol} {interval} ({len(candles)} candles)")
    else:
        # ── Fallback to yfinance ─────────────────────────────────────────────
        logger.info(f"market_data: ↩ Falling back to yfinance for {base_symbol} {interval}")
        candles = await asyncio.get_running_loop().run_in_executor(
            None, lambda: _fetch_via_yfinance(symbol_ns, interval)
        )
        if candles:
            logger.info(f"market_data: ✓ yfinance data for {base_symbol} {interval} ({len(candles)} candles)")

    # Upsert whatever we got
    if candles:
        await _upsert_candles(base_symbol, interval, candles)
    else:
        logger.warning(f"market_data: ✗ No data for {base_symbol} {interval} from any source.")


async def run_market_data_pipeline():
    """
    Scheduled pipeline — fetches 15m + 1d candles for all watchlist symbols.
    Runs every 15 minutes via APScheduler.
    """
    logger.info("market_data: Running pipeline iteration...")

    from app.models.auth import Watchlist
    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Watchlist.symbol).distinct())
        db_symbols = result.scalars().all()

    if not db_symbols:
        logger.info("market_data: No watchlist symbols — skipping pipeline.")
        return

    tasks = []
    for sym in db_symbols:
        tasks.append(fetch_and_store_klines(sym, interval="15m"))
        tasks.append(fetch_and_store_klines(sym, interval="1d"))

    await asyncio.gather(*tasks, return_exceptions=True)
    logger.info(f"market_data: Pipeline complete for {len(db_symbols)} symbols.")
