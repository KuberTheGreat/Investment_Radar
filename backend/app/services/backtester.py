import asyncio
import pandas as pd
import numpy as np
import talib
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
import pytz
from datetime import datetime

from app.core.database import AsyncSessionLocal
from app.models.market_data import OHLCCandle
from app.models.patterns import BacktestResult
from app.models.auth import Watchlist
import json
import os

CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "core", "patterns_config.json"
)
with open(CONFIG_PATH, "r") as f:
    PATTERNS_CONFIG = json.load(f)


async def compute_backtest_for_symbol_pattern(symbol: str, session):
    """
    Computes backtesting metrics for a given symbol across all patterns
    using its historical daily OHLCV data.
    """
    # Fetch all '1d' candles for the symbol
    stmt = (
        select(OHLCCandle)
        .where(OHLCCandle.symbol == symbol, OHLCCandle.timeframe == "1d")
        .order_by(OHLCCandle.timestamp.asc())
    )

    result = await session.execute(stmt)
    candles = result.scalars().all()

    if len(candles) < 20:
        return  # Not enough history to backtest

    df = pd.DataFrame(
        [
            {
                "timestamp": c.timestamp,
                "open": float(c.open),
                "high": float(c.high),
                "low": float(c.low),
                "close": float(c.close),
            }
            for c in candles
        ]
    )

    df["close_5d_fwd"] = df["close"].shift(-5)
    df["close_15d_fwd"] = df["close"].shift(-15)

    # Pre-compute returns
    df["ret_5d"] = (df["close_5d_fwd"] - df["close"]) / df["close"] * 100
    df["ret_15d"] = (df["close_15d_fwd"] - df["close"]) / df["close"] * 100

    open_data = df["open"].values
    high_data = df["high"].values
    low_data = df["low"].values
    close_data = df["close"].values

    for p in PATTERNS_CONFIG:
        func_name = p["function"]
        pattern_func = getattr(talib, func_name)

        # Run CDL function across entire history at once
        results = pattern_func(open_data, high_data, low_data, close_data)
        df["pattern_signal"] = results

        # Filter where pattern occurred
        occurrences = df[df["pattern_signal"] != 0].copy()

        if len(occurrences) == 0:
            continue

        # Re-align bearish pattern expectations (a win for bearish means the price dropped)
        # So we negate the forward returns if the signal was negative.
        # But wait, the standard definition is "win_rate = % occurrences where price moved in expected direction".
        # If signal < 0 (bearish), then return should be < 0 for a win.
        # Let's adjust raw returns to 'expected_gain' based on signal polarity.

        occurrences["expected_gain_5d"] = occurrences.apply(
            lambda row: row["ret_5d"] if row["pattern_signal"] > 0 else -row["ret_5d"],
            axis=1,
        )
        occurrences["expected_gain_15d"] = occurrences.apply(
            lambda row: (
                row["ret_15d"] if row["pattern_signal"] > 0 else -row["ret_15d"]
            ),
            axis=1,
        )

        # Drop NaNs which are recent patterns without 15d future data yet
        valid_5d = occurrences["expected_gain_5d"].dropna()
        valid_15d = occurrences["expected_gain_15d"].dropna()

        sample_count = len(occurrences)  # Total occurrences

        if len(valid_5d) == 0 or len(valid_15d) == 0:
            continue

        win_rate_5d = (valid_5d > 0).mean() * 100
        win_rate_15d = (valid_15d > 0).mean() * 100
        avg_gain_5d = valid_5d.mean()
        avg_gain_15d = valid_15d.mean()

        record = dict(
            symbol=symbol,
            pattern_name=func_name,
            win_rate_5d=round(win_rate_5d, 2),
            win_rate_15d=round(win_rate_15d, 2),
            avg_gain_5d=round(avg_gain_5d, 4),
            avg_gain_15d=round(avg_gain_15d, 4),
            sample_count=sample_count,
            low_confidence=(sample_count < 5),
            last_computed_at=pd.Timestamp.utcnow(),
        )

        stmt = insert(BacktestResult).values(**record)
        stmt = stmt.on_conflict_do_update(
            index_elements=["symbol", "pattern_name"],
            set_=dict(
                win_rate_5d=stmt.excluded.win_rate_5d,
                win_rate_15d=stmt.excluded.win_rate_15d,
                avg_gain_5d=stmt.excluded.avg_gain_5d,
                avg_gain_15d=stmt.excluded.avg_gain_15d,
                sample_count=stmt.excluded.sample_count,
                low_confidence=stmt.excluded.low_confidence,
                last_computed_at=stmt.excluded.last_computed_at,
            ),
        )
        await session.execute(stmt)

    print(f"[{symbol}] Completed Backtest computations.")


async def run_backtesting_engine(symbol: str = None):
    """Runs backtest for a single symbol (on-demand) or all watchlist symbols (scheduled)."""
    print(
        f"Running Backtesting Engine{'for ' + symbol if symbol else ' (all symbols)'}..."
    )
    async with AsyncSessionLocal() as session:
        if symbol:
            symbols = [symbol.upper().replace(".NS", "")]
        else:
            result = await session.execute(select(Watchlist.symbol).distinct())
            symbols = result.scalars().all()

        for s in symbols:
            try:
                await compute_backtest_for_symbol_pattern(s, session)
            except Exception as e:
                print(f"Backtesting error for {s}: {e}")
        await session.commit()
    print("Backtesting complete.")
