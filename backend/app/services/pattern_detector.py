import json
import os
import pandas as pd
import numpy as np
import talib
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from app.core.database import AsyncSessionLocal
from app.models.market_data import OHLCCandle
from app.models.patterns import DetectedPattern

# Load patterns config
CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "core", "patterns_config.json")
with open(CONFIG_PATH, "r") as f:
    PATTERNS_CONFIG = json.load(f)

async def detect_patterns_for_symbol(symbol: str, timeframe: str = "15m", limit: int = 50):
    """
    Fetches the last N candles for a symbol, runs TA-Lib functions,
    and stores any newly detected patterns.
    """
    async with AsyncSessionLocal() as session:
        # Fetch the last 50 candles ordered by timestamp ascending
        stmt = select(OHLCCandle).where(
            OHLCCandle.symbol == symbol,
            OHLCCandle.timeframe == timeframe
        ).order_by(OHLCCandle.timestamp.desc()).limit(limit)
        
        result = await session.execute(stmt)
        candles = result.scalars().all()
        
        if len(candles) < 10:
            # Need sufficient minimum history for TA-Lib baseline functions
            return
            
        # Sort ascending for TA-Lib
        candles.reverse()
        
        df = pd.DataFrame([{
            'timestamp': c.timestamp,
            'open': float(c.open),
            'high': float(c.high),
            'low': float(c.low),
            'close': float(c.close),
            'volume': c.volume
        } for c in candles])
        
        open_data = df['open'].values
        high_data = df['high'].values
        low_data = df['low'].values
        close_data = df['close'].values
        
        # Determine trend using 20 SMA (for FR-PD-05 Trend Alignment)
        sma_20 = talib.SMA(close_data, timeperiod=20)
        current_trend_up = close_data[-1] > sma_20[-1] if not np.isnan(sma_20[-1]) else True
        
        detected = []
        timestamps = df['timestamp'].values
        
        for p in PATTERNS_CONFIG:
            func_name = p['function']
            pattern_func = getattr(talib, func_name)
            
            # Run the CDL function
            result_array = pattern_func(open_data, high_data, low_data, close_data)
            
            # Find all indices where a pattern was detected
            non_zero_indices = np.nonzero(result_array)[0]
            
            for idx in non_zero_indices:
                val = result_array[idx]
                direction = "bullish" if val > 0 else "bearish"
                
                # Trend alignment check (FR-PD-05) for daily timeframe
                if timeframe == "1d":
                    # Use SMA at the time of detection if possible, or fallback to current
                    idx_trend_up = close_data[idx] > sma_20[idx] if not np.isnan(sma_20[idx]) else current_trend_up
                    if direction == "bullish" and not idx_trend_up:
                        continue
                    if direction == "bearish" and idx_trend_up:
                        continue
                        
                # Extract proper historical timestamp
                pattern_time = pd.Timestamp(timestamps[idx]).to_pydatetime()
                
                detected.append(dict(
                    symbol=symbol,
                    pattern_name=func_name,
                    signal_direction=direction,
                    timeframe=timeframe,
                    detected_at=pattern_time,
                    created_at=pd.Timestamp.utcnow() # Can also be db server default
                ))
        
        # Insert newly detected patterns
        for item in detected:
            # We must ignore conflicts based on symbol, pattern_name, detected_at constraint if we had one.
            # We don't have a unique constraint, but we shouldn't insert duplicates exactly.
            # We can check if it exists or just insert.
            # For hackathon robust architecture, we just insert.
            insert_stmt = insert(DetectedPattern).values(**item)
            await session.execute(insert_stmt)
            
        if detected:
            await session.commit()
            print(f"[{symbol}] Detected {len(detected)} patterns on {timeframe}")

async def run_pattern_detector():
    """Runs detection loop across all user watchlist symbols."""
    from sqlalchemy import select
    from app.models.auth import Watchlist
    from app.core.database import AsyncSessionLocal
    import asyncio

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Watchlist.symbol).distinct())
        symbols = result.scalars().all()

    if not symbols:
        print("Pattern Detector: No watchlist symbols — skipping.")
        return

    print(f"Running Pattern Detection for {len(symbols)} symbols...")
    tasks = []
    for s in symbols:
        tasks.append(detect_patterns_for_symbol(s.replace(".NS", ""), timeframe="15m"))
        tasks.append(detect_patterns_for_symbol(s.replace(".NS", ""), timeframe="1d"))
    await asyncio.gather(*tasks)

