import asyncio
from datetime import datetime, date
from typing import List
from app.core.database import AsyncSessionLocal
from app.models.events import CorporateEvent
from sqlalchemy.dialects.postgresql import insert

async def fetch_and_store_yahoo_news(symbol_ns: str):
    import yfinance as yf
    try:
        base_symbol = symbol_ns.replace(".NS", "").replace(".BO", "")
        # yfinance operations are strictly synchronous, wrapped asynchronously natively inside gather ops
        tkr = yf.Ticker(symbol_ns)
        # Handle dict wrapping occasionally seen in older yf builds
        try:
            news_items = tkr.news
        except:
            news_items = []

        if not news_items or not isinstance(news_items, list): 
            return
            
        async with AsyncSessionLocal() as session:
            for item in news_items:
                pub_time = item.get("providerPublishTime")
                if not pub_time: continue
                
                event_date = datetime.fromtimestamp(pub_time).date()
                title = item.get("title", "News")
                publisher = item.get("publisher", "Yahoo Finance")
                link = item.get("link", "")
                
                # Flag structural anomalies natively if title contains high-impact financial keywords
                is_anomaly = any(x in title.lower() for x in ["dividend", "earnings", "merger", "acquisition", "split", "buyback"])
                
                deal = {
                    "symbol": base_symbol,
                    "event_type": "news",
                    "event_date": event_date,
                    "party_name": publisher,
                    "source_reference": link,
                    "is_anomaly": is_anomaly,
                }
                stmt = insert(CorporateEvent).values(**deal)
                await session.execute(stmt)
            await session.commit()
            print(f"Successfully ingested news for {base_symbol}.")
    except Exception as e:
        print(f"Error fetching news for {symbol_ns}: {e}")

async def fetch_and_store_bse_bulk_deals():
    """Fetches BSE bulk/block deals (Simulated)."""
    try:
        simulated_deals = [
            {
                "symbol": "RELIANCE",
                "event_type": "bulk_deal",
                "event_date": date.today(),
                "party_name": "ABC Capital",
                "quantity": 500000,
                "price_per_share": 2900.50,
                "total_value_cr": 145.02,
                "is_anomaly": True,
                "source_reference": "https://www.bseindia.com/markets/equity/EQReports/bulk_deals.aspx"
            }
        ]

        async with AsyncSessionLocal() as session:
            for deal in simulated_deals:
                stmt = insert(CorporateEvent).values(**deal)
                await session.execute(stmt)
            await session.commit()
    except Exception as e:
        pass

async def run_corporate_events_pipeline():
    """Runs the scheduled corporate events ingestion for active user Watchlists."""
    print("Running Corporate Events Ingestion Pipeline...")
    await fetch_and_store_bse_bulk_deals()
    
    from app.models.auth import Watchlist
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Watchlist.symbol).distinct())
        db_symbols = result.scalars().all()
        
    # Default guaranteed anchor for hackathon testing visibility
    active_universe = set([sym + ".NS" for sym in db_symbols] + ["RELIANCE.NS"])
    
    tasks = [fetch_and_store_yahoo_news(sym) for sym in active_universe]
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
