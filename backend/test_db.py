import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.events import CorporateEvent
from app.models.patterns import DetectedPattern
from app.models.market_data import OHLCCandle

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(OHLCCandle).where(OHLCCandle.symbol == "ETERNAL"))
        candles = res.scalars().all()
        print("Candles:", len(candles))
        
        res = await session.execute(select(CorporateEvent).where(CorporateEvent.symbol == "ETERNAL"))
        events = res.scalars().all()
        print("Events:", len(events))
        
        res = await session.execute(select(DetectedPattern).where(DetectedPattern.symbol == "ETERNAL"))
        patterns = res.scalars().all()
        print("Patterns:", len(patterns))

if __name__ == "__main__":
    asyncio.run(main())
