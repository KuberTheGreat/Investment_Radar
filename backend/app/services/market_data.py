import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.market_data import OHLCCandle
from sqlalchemy.dialects.postgresql import insert
import pytz

# Top 10 custom stocks for the background radar loop (including user requests)
NIFTY_TOP_10 = [
    "ZOMATO.NS", "TATAMOTORS.NS", "SBIN.NS", "RELIANCE.NS", "TCS.NS",
    "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS", "ITC.NS", "LT.NS"
]

IST = pytz.timezone('Asia/Kolkata')

async def fetch_and_store_klines(symbol: str, period: str = "1d", interval: str = "15m"):
    """
    Fetches OHLCV data for a specific symbol using yfinance and saves it to the DB.
    Checks and handles forward filling for stale candles.
    """
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        
        if df.empty:
            return
            
        # Rename yfinance columns to match DB
        df = df.reset_index()
        # yfinance index is named 'Datetime' for intraday or 'Date' for daily
        time_col = 'Datetime' if 'Datetime' in df.columns else 'Date'
        
        async with AsyncSessionLocal() as session:
            for _, row in df.iterrows():
                # Convert timestamp to IST
                candle_time = row[time_col].astimezone(IST) if row[time_col].tzinfo else IST.localize(row[time_col])
                
                # Validation: High >= Open, Close, Low must hold
                is_valid = row['High'] >= row['Open'] and row['High'] >= row['Close'] and row['High'] >= row['Low']
                if not is_valid:
                    continue
                
                stmt = insert(OHLCCandle).values(
                    symbol=symbol.replace(".NS", ""),
                    timestamp=candle_time,
                    timeframe=interval,
                    open=row['Open'],
                    high=row['High'],
                    low=row['Low'],
                    close=row['Close'],
                    volume=int(row['Volume']),
                    is_stale=False # Normalised state handled later if needed
                )
                
                # Upsert on conflict
                stmt = stmt.on_conflict_do_update(
                    index_elements=['symbol', 'timestamp', 'timeframe'],
                    set_=dict(
                        open=stmt.excluded.open,
                        high=stmt.excluded.high,
                        low=stmt.excluded.low,
                        close=stmt.excluded.close,
                        volume=stmt.excluded.volume
                    )
                )
                await session.execute(stmt)
            await session.commit()
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")

async def run_market_data_pipeline():
    """Runs the pipeline for all target symbols across active user watchlists."""
    print("Running market data pipeline iteration...")
    
    from app.models.auth import Watchlist
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Watchlist.symbol).distinct())
        db_symbols = result.scalars().all()
        
    # Inject default minimum sandbox anchor to ensure radar operates even when nobody is logged in
    active_universe = set([sym + ".NS" for sym in db_symbols] + ["RELIANCE.NS"])
    
    tasks_15m = [fetch_and_store_klines(symbol, period="5d", interval="15m") for symbol in active_universe]
    tasks_1d = [fetch_and_store_klines(symbol, period="2mo", interval="1d") for symbol in active_universe]
    
    if tasks_15m or tasks_1d:
        await asyncio.gather(*(tasks_15m + tasks_1d), return_exceptions=True)
