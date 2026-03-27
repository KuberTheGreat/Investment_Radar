import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def truncate():
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM ohlcv_candles WHERE symbol = 'RELIANCE'"))
        await db.execute(text("DELETE FROM signals WHERE symbol = 'RELIANCE'"))
        await db.execute(text("DELETE FROM detected_patterns WHERE symbol = 'RELIANCE'"))
        await db.execute(text("DELETE FROM corporate_events WHERE symbol = 'RELIANCE'"))
        print("Successfully deleted all Reliance artifacts from Supabase.")
        await db.commit()

if __name__ == "__main__":
    asyncio.run(truncate())
