import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.market_data import OHLCCandle
from sqlalchemy.dialects.postgresql import insert
import pytz

# For hackathon demonstration, we use top 10 Nifty stocks
TARGET_SYMBOLS = [
    "RELIANCE.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS", "ITC.NS",
    "TCS.NS", "LARSEN.NS", "BAJFINANCE.NS", "KOTAKBANK.NS", "AXISBANK.NS"
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
                    timeframe="15m" if interval == "15m" else "1d",
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
    """Runs the pipeline for all target symbols."""
    print("Running market data pipeline iteration...")
    tasks = [fetch_and_store_klines(symbol, period="5d", interval="15m") for symbol in TARGET_SYMBOLS]
    await asyncio.gather(*tasks)
