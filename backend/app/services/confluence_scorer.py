import asyncio
from datetime import timedelta
import pandas as pd
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.patterns import DetectedPattern, BacktestResult
from app.models.events import CorporateEvent
from app.models.signals import Signal

async def process_new_patterns():
    """
    Scans for detected patterns that haven't been turned into Signals yet
    and calculates their confluence score based on corporate events.
    """
    async with AsyncSessionLocal() as session:
        # Fetch patterns not yet in signals
        stmt = select(DetectedPattern).outerjoin(
            Signal, DetectedPattern.id == Signal.pattern_id
        ).where(Signal.id == None)
        
        result = await session.execute(stmt)
        new_patterns = result.scalars().all()
        
        if not new_patterns:
            return
            
        print(f"Scoring {len(new_patterns)} new patterns for confluence...")
        
        for pattern in new_patterns:
            # Look for ±3 days events
            p_date = pattern.detected_at.date()
            start_date = p_date - timedelta(days=5) # 5 calendar days covers 3 trading days roughly
            end_date = p_date + timedelta(days=5)
            
            ev_stmt = select(CorporateEvent).where(
                CorporateEvent.symbol == pattern.symbol,
                CorporateEvent.event_date >= start_date,
                CorporateEvent.event_date <= end_date
            )
            ev_result = await session.execute(ev_stmt)
            events = ev_result.scalars().all()
            
            confluence_score = 0
            event_ids = []
            
            for ev in events:
                event_ids.append(ev.id)
                # Logic matching SRS FR-CS-02
                if ev.is_anomaly and confluence_score < 3:
                    confluence_score = 3
                elif ev.total_value_cr and ev.total_value_cr >= 1 and confluence_score < 2:
                    if ev.event_type in ['bulk_deal', 'insider_buy']:
                        confluence_score = 2
                elif ev.event_type == 'block_deal' and (ev.total_value_cr is None or ev.total_value_cr < 1) and confluence_score < 1:
                    confluence_score = 1
                    
            # Fetch win rates
            bt_stmt = select(BacktestResult).where(
                BacktestResult.symbol == pattern.symbol,
                BacktestResult.pattern_name == pattern.pattern_name
            )
            bt_result = await session.execute(bt_stmt)
            bt = bt_result.scalars().first()
            
            w5 = float(bt.win_rate_5d) if bt and bt.win_rate_5d else 0.0
            w15 = float(bt.win_rate_15d) if bt and bt.win_rate_15d else 0.0
            lc = bt.low_confidence if bt else True
            
            # Composite rank (FR-CS-03)
            signal_rank = w15 * (1 + 0.3 * confluence_score)
            
            sig = dict(
                symbol=pattern.symbol,
                signal_type="pattern",
                pattern_id=pattern.id,
                event_ids=event_ids if event_ids else None,
                win_rate_5d=w5,
                win_rate_15d=w15,
                confluence_score=confluence_score,
                high_confluence=(confluence_score >= 2),
                signal_rank=signal_rank,
                low_confidence=lc,
                is_active=True,
                created_at=pd.Timestamp.utcnow()
            )
            
            insert_stmt = insert(Signal).values(**sig)
            await session.execute(insert_stmt)
            
        await session.commit()
        print("Confluence scoring complete.")

async def run_confluence_scorer():
    """ Called shortly after pattern detector finishes """
    await process_new_patterns()
