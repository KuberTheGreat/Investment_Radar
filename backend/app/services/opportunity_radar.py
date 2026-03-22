import asyncio
import pandas as pd
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.database import AsyncSessionLocal
from app.models.events import CorporateEvent
from app.models.signals import Signal

async def detect_opportunities():
    """
    Opportunity Radar: Runs daily at 19:00 IST.
    Scans corporate events for anomaly patterns without requiring a chart pattern.
    """
    async with AsyncSessionLocal() as session:
        # Fetch events flagged as anomalies
        stmt = select(CorporateEvent).where(
            CorporateEvent.is_anomaly == True
        )
        
        result = await session.execute(stmt)
        anomalies = result.scalars().all()
        
        if not anomalies:
            return
            
        for ev in anomalies:
            # Check if this event already generated an opportunity signal
            sig_stmt = select(Signal).where(
                Signal.signal_type == 'opportunity',
                Signal.event_ids.any(ev.id)
            )
            r = await session.execute(sig_stmt)
            if r.scalars().first():
                continue # Already processed
                
            sig = dict(
                symbol=ev.symbol,
                signal_type="opportunity",
                pattern_id=None,
                event_ids=[ev.id],
                win_rate_5d=0.0, # N/A for raw opportunity
                win_rate_15d=0.0,
                confluence_score=3, # Max out since it's an anomaly 
                high_confluence=True,
                signal_rank=100.0, # High base rank for anomalies
                low_confidence=False,
                is_active=True,
                created_at=pd.Timestamp.utcnow()
            )
            
            insert_stmt = insert(Signal).values(**sig)
            await session.execute(insert_stmt)
            
        await session.commit()
        print("Opportunity Radar complete.")

async def run_opportunity_radar():
    print("Running Opportunity Radar...")
    await detect_opportunities()
