import asyncio
import logging
import pandas as pd
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.database import AsyncSessionLocal
from app.models.patterns import DetectedPattern, BacktestResult
from app.models.events import CorporateEvent
from app.models.signals import Signal
from datetime import timedelta

logger = logging.getLogger(__name__)


async def process_new_patterns():
    """
    Scans for detected patterns that haven't been turned into Signals yet
    and calculates their confluence score based on corporate events.
    Uses pattern_id uniqueness to prevent duplicate signal generation.
    """
    async with AsyncSessionLocal() as session:
        # Fetch patterns that haven't been turned into a signal yet
        existing_pattern_ids_stmt = select(Signal.pattern_id).where(Signal.pattern_id.isnot(None))
        existing_result = await session.execute(existing_pattern_ids_stmt)
        existing_pattern_ids = set(existing_result.scalars().all())
        logger.info(f"confluence_scorer: {len(existing_pattern_ids)} patterns already have signals.")

        stmt = select(DetectedPattern)
        result = await session.execute(stmt)
        all_patterns = result.scalars().all()

        filtered_patterns = [p for p in all_patterns if p.id not in existing_pattern_ids]
        
        # Deduplicate multiple timeframe occurrences to max 1 per calendar day
        unique_patterns_map = {}
        for p in filtered_patterns:
            key = (p.symbol, p.pattern_name, p.timeframe, p.detected_at.date())
            if key not in unique_patterns_map or p.detected_at > unique_patterns_map[key].detected_at:
                unique_patterns_map[key] = p
                
        new_patterns = list(unique_patterns_map.values())
        logger.info(f"confluence_scorer: {len(new_patterns)} deduplicated new patterns to score (out of {len(all_patterns)} total).")
        
        if not new_patterns:
            logger.info("confluence_scorer: No new patterns to score. Skipping.")
            return

        new_signal_ids = []

        for pattern in new_patterns:
            logger.debug(f"confluence_scorer: Scoring pattern {pattern.id} ({pattern.symbol} / {pattern.pattern_name})")

            p_date = pattern.detected_at.date()
            start_date = p_date - timedelta(days=5)
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
                if ev.is_anomaly and confluence_score < 3:
                    confluence_score = 3
                elif ev.total_value_cr and ev.total_value_cr >= 1 and confluence_score < 2:
                    if ev.event_type in ['bulk_deal', 'insider_buy']:
                        confluence_score = 2
                elif ev.event_type == 'block_deal' and confluence_score < 1:
                    confluence_score = 1

            bt_stmt = select(BacktestResult).where(
                BacktestResult.symbol == pattern.symbol,
                BacktestResult.pattern_name == pattern.pattern_name
            )
            bt_result = await session.execute(bt_stmt)
            bt = bt_result.scalars().first()

            w5 = float(bt.win_rate_5d) if bt and bt.win_rate_5d else 0.0
            w15 = float(bt.win_rate_15d) if bt and bt.win_rate_15d else 0.0
            lc = bt.low_confidence if bt else True
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
                created_at=pd.Timestamp.now('UTC')
            )

            # Use ON CONFLICT DO NOTHING on pattern_id to prevent duplicates
            insert_stmt = insert(Signal).values(**sig).on_conflict_do_nothing(
                index_elements=["pattern_id"]
            )
            result = await session.execute(insert_stmt)
            if result.rowcount:
                logger.info(f"confluence_scorer: Inserted signal for pattern {pattern.id} ({pattern.symbol})")
                # Fetch the inserted signal id for pre-generation
                new_sig_stmt = select(Signal).where(Signal.pattern_id == pattern.id)
                new_sig_res = await session.execute(new_sig_stmt)
                new_sig = new_sig_res.scalars().first()
                if new_sig:
                    new_signal_ids.append(str(new_sig.id))
            else:
                logger.debug(f"confluence_scorer: Skipped duplicate for pattern {pattern.id}")

        await session.commit()
        logger.info(f"confluence_scorer: Committed {len(new_signal_ids)} new signals.")

    # Pre-generate one_liner + paragraph in background after commit (outside session)
    if new_signal_ids:
        logger.info(f"confluence_scorer: Pre-generating summaries for {len(new_signal_ids)} signals in background daemon...")
        
        async def _generate_summaries_bg(sids):
            from app.services.llm_explainer import llm_service
            async with AsyncSessionLocal() as gen_session:
                for sid in sids:
                    try:
                        await llm_service.generate_summary(gen_session, sid)
                        await asyncio.sleep(2)  # Polite delay between Groq calls
                    except Exception as e:
                        logger.error(f"confluence_scorer: Summary generation failed for {sid} — {e}")
        
        # Fire and forget onto the asyncio event loop unconditionally decoupling the HTTP return
        asyncio.create_task(_generate_summaries_bg(new_signal_ids), name=f"llm_gen_{len(new_signal_ids)}")


async def run_confluence_scorer():
    """Called shortly after pattern detector finishes."""
    logger.info("Running Confluence Scorer...")
    await process_new_patterns()
    logger.info("Confluence Scorer complete.")
