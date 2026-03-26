import asyncio
import logging
from typing import AsyncGenerator
import json
from anthropic import AsyncAnthropic
from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.signals import Signal
import redis.asyncio as redis
from app.services.web_search import WebSearcher
from app.services.rag import RAGManager

logger = logging.getLogger(__name__)

# ── Global Semaphore — only 1 Anthropic call at a time ─────────────────────────────
_anthropic_semaphore = asyncio.Semaphore(1)
# Track signals currently being generated to prevent duplicate parallel calls
_in_progress: set = set()


class LLMExplainerService:
    def __init__(self):
        self.api_key = settings.ANTHROPIC_API_KEY
        if self.api_key:
            self.client = AsyncAnthropic(api_key=self.api_key)
            logger.info("LLMExplainerService: Anthropic client initialized.")
        else:
            self.client = None
            logger.warning("LLMExplainerService: ANTHROPIC_API_KEY not set — LLM disabled.")

        self.model = "claude-sonnet-4-6"
        # The SRS explicitly mandates claude-sonnet-4-6 for ALL proxy layers
        self.summary_model = "claude-sonnet-4-6"
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.web_searcher = WebSearcher()
        self.rag_manager = RAGManager()

    def _build_prompt(self, signal_context: dict) -> str:
        return f"""
You are an expert Indian stock market financial analyst. Analyze the following trading signal context.

Signal Context:
{json.dumps(signal_context, indent=2)}

Return ONLY valid JSON with exactly three keys:
- "one_liner": A single sentence (≤20 words) summarizing the opportunity.
- "paragraph": A concise 2-3 sentence explanation of the pattern and its significance for an Indian retail investor.
- "deep_dive": A detailed analysis covering: (a) technical pattern interpretation, (b) historical win rate context, (c) confluence with corporate events if any, (d) key risks. End with: 'This is not financial advice.'

Rules: 
1. No hallucinated statistics. Ground everything in the provided data. 
2. If "recent_news" indicates no news was found, DO NOT refuse to answer. Generate the entire analysis based purely on the technical pattern, historical win rate, and corporate events provided.
3. No markdown, just JSON.
"""

    def _build_summary_prompt(self, signal_context: dict) -> str:
        """Lightweight prompt for cheaper pre-generation."""
        return f"""
You are a concise Indian stock market analyst. Given this signal:
Symbol: {signal_context.get('symbol')}
Pattern Type: {signal_context.get('signal_type')}
Win Rate (15d): {signal_context.get('win_rate_15d')}%
Confluence Score: {signal_context.get('confluence_score')}/3

Return ONLY valid JSON with exactly two keys:
- "one_liner": One sentence (≤15 words) summarizing this signal.
- "paragraph": Two sentences max explaining the opportunity in simple terms for a beginner investor.
"""

    def _extract_prose(self, raw: str) -> str:
        """Convert a deep_dive field (may be raw JSON string) to human-readable prose."""
        if not raw:
            return ""
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                parts = []
                if parsed.get("pattern_interpretation"):
                    parts.append(parsed["pattern_interpretation"])
                if parsed.get("historical_context"):
                    parts.append(parsed["historical_context"])
                if parsed.get("corporate_events"):
                    parts.append("Corporate Events: " + parsed["corporate_events"])
                if parsed.get("key_risks"):
                    parts.append("Key Risks: " + parsed["key_risks"])
                if parsed.get("disclaimer"):
                    parts.append(parsed["disclaimer"])
                return "\n\n".join(parts) if parts else raw
            elif isinstance(parsed, str):
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass
        return raw

    async def _call_anthropic(self, prompt: str, model: str) -> dict | None:
        """Calls Anthropic API with global semaphore. Returns parsed JSON or None."""
        if not self.client:
            logger.error("_call_anthropic: No Anthropic client available.")
            return None

        logger.info(f"_call_anthropic: Waiting for semaphore (model={model})...")
        async with _anthropic_semaphore:
            logger.info(f"_call_anthropic: Acquired semaphore. Calling Anthropic API (model={model})...")
            try:
                response = await self.client.messages.create(
                    model=model,
                    system="You are a financial analyst. Respond ONLY in valid JSON.",
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1500,
                )
                text = response.content[0].text
                # Strip markdown fences if present
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    text = text.split("```")[1].strip()
                parsed = json.loads(text)
                logger.info(f"_call_anthropic: Success. Keys returned: {list(parsed.keys())}")
                return parsed
            except Exception as e:
                logger.error(f"_call_anthropic: Anthropic API error — {type(e).__name__}: {e}")
                return None

    async def generate_summary(self, db: AsyncSession, signal_id: str) -> bool:
        """
        Cheaply generates one_liner + paragraph for a signal using the fast 8B model.
        Called at signal creation time — no web search, no deep dive.
        Returns True if successful.
        """
        signal_id_str = str(signal_id)
        if signal_id_str in _in_progress:
            logger.warning(f"generate_summary: Signal {signal_id_str} already in progress. Skipping.")
            return False

        _in_progress.add(signal_id_str)
        try:
            stmt = select(Signal).where(Signal.id == signal_id)
            result = await db.execute(stmt)
            signal = result.scalars().first()
            if not signal:
                logger.error(f"generate_summary: Signal {signal_id_str} not found in DB.")
                return False

            if signal.one_liner:
                logger.info(f"generate_summary: Signal {signal_id_str} already has one_liner. Skipping.")
                return True

            context = {
                "symbol": signal.symbol,
                "signal_type": signal.signal_type,
                "win_rate_5d": float(signal.win_rate_5d) if signal.win_rate_5d else None,
                "win_rate_15d": float(signal.win_rate_15d) if signal.win_rate_15d else None,
                "confluence_score": signal.confluence_score,
                "high_confluence": signal.high_confluence,
            }

            logger.info(f"generate_summary: Generating for signal {signal_id_str} ({signal.symbol})")
            parsed = await self._call_anthropic(self._build_summary_prompt(context), self.summary_model)
            if not parsed:
                return False

            signal.one_liner = str(parsed.get("one_liner", "")).strip()
            signal.paragraph_explanation = str(parsed.get("paragraph", "")).strip()
            await db.commit()

            # Cache it
            cache_key = f"signal_explain:{signal_id_str}"
            await self.redis_client.set(cache_key, json.dumps({
                "one_liner": signal.one_liner,
                "paragraph": signal.paragraph_explanation,
                "deep_dive": signal.deep_dive or "",
            }), ex=86400 * 7)
            logger.info(f"generate_summary: Committed and cached for {signal_id_str}.")
            return True
        except Exception as e:
            logger.error(f"generate_summary: Unexpected error for {signal_id_str} — {e}")
            return False
        finally:
            _in_progress.discard(signal_id_str)

    async def generate_deep_dive(self, db: AsyncSession, signal_id: str) -> str | None:
        """
        Generates only the deep_dive field using the full model + web search.
        Called on-demand when user clicks Deep Dive button.
        """
        signal_id_str = str(signal_id)
        if signal_id_str in _in_progress:
            logger.warning(f"generate_deep_dive: Signal {signal_id_str} already in progress.")
            return None

        _in_progress.add(signal_id_str)
        try:
            # Eager-load the pattern relationship
            from sqlalchemy.orm import selectinload
            stmt = select(Signal).where(Signal.id == signal_id).options(selectinload(Signal.pattern))
            result = await db.execute(stmt)
            signal = result.scalars().first()
            if not signal:
                logger.error(f"generate_deep_dive: Signal {signal_id_str} not found.")
                return None

            if signal.deep_dive:
                logger.info(f"generate_deep_dive: Already exists for {signal_id_str}. Returning cached.")
                return signal.deep_dive

            logger.info(f"generate_deep_dive: Fetching news for {signal.symbol}...")
            news = await asyncio.to_thread(self.web_searcher.get_latest_news, signal.symbol)

            # ── Load corporate events ────────────────────────────────────────
            events_summary = []
            if signal.event_ids:
                from app.models.events import CorporateEvent
                evt_stmt = select(CorporateEvent).where(
                    CorporateEvent.id.in_([str(e) for e in signal.event_ids])
                )
                evt_result = await db.execute(evt_stmt)
                events = evt_result.scalars().all()
                for ev in events:
                    events_summary.append({
                        "event_type": ev.event_type,
                        "party_name": ev.party_name,
                        "event_date": str(ev.event_date),
                        "total_value_cr": float(ev.total_value_cr) if ev.total_value_cr else None,
                        "is_anomaly": ev.is_anomaly,
                    })

            # ── Build enriched context ───────────────────────────────────────
            context = {
                "symbol": signal.symbol,
                "signal_type": signal.signal_type,
                "win_rate_5d": float(signal.win_rate_5d) if signal.win_rate_5d else None,
                "win_rate_15d": float(signal.win_rate_15d) if signal.win_rate_15d else None,
                "confluence_score": signal.confluence_score,
                "high_confluence": signal.high_confluence,
                "low_confidence": signal.low_confidence,
            }

            # Add pattern details if available
            if signal.pattern:
                context["detected_pattern"] = {
                    "name": signal.pattern.pattern_name,
                    "direction": signal.pattern.signal_direction,
                    "timeframe": signal.pattern.timeframe,
                    "detected_at": str(signal.pattern.detected_at),
                }
            else:
                context["detected_pattern"] = None

            # Add corporate events
            if events_summary:
                context["corporate_events"] = events_summary
            else:
                context["corporate_events"] = []

            # Add recent news
            context["recent_news"] = news

            logger.info(
                f"generate_deep_dive: Context built for {signal_id_str} — "
                f"pattern={context.get('detected_pattern', {}).get('name') if context.get('detected_pattern') else 'None'}, "
                f"events={len(events_summary)}, news_items={len(news) if news else 0}"
            )

            logger.info(f"generate_deep_dive: Calling Anthropic for deep dive on {signal_id_str}...")
            parsed = await self._call_anthropic(self._build_prompt(context), self.model)
            if not parsed:
                return None

            # Persist
            if not signal.one_liner:
                signal.one_liner = str(parsed.get("one_liner", "")).strip()
            if not signal.paragraph_explanation:
                signal.paragraph_explanation = str(parsed.get("paragraph", "")).strip()
            dd = parsed.get("deep_dive", "")
            signal.deep_dive = json.dumps(dd) if isinstance(dd, dict) else str(dd)
            await db.commit()

            # Update cache
            cache_key = f"signal_explain:{signal_id_str}"
            await self.redis_client.set(cache_key, json.dumps({
                "one_liner": signal.one_liner,
                "paragraph": signal.paragraph_explanation,
                "deep_dive": signal.deep_dive,
            }), ex=86400 * 7)
            logger.info(f"generate_deep_dive: Committed deep dive for {signal_id_str}.")
            return signal.deep_dive
        except Exception as e:
            logger.error(f"generate_deep_dive: Error for {signal_id_str} — {e}", exc_info=True)
            return None
        finally:
            _in_progress.discard(signal_id_str)

    async def stream_deep_dive(self, signal_id: str, db: AsyncSession) -> AsyncGenerator[str, None]:
        """
        Stream the deep_dive explanation as SSE events.
        Cache → DB → Generate (in that priority order).
        """
        signal_id_str = str(signal_id)
        logger.info(f"stream_deep_dive: Request for signal {signal_id_str}")

        # 1. Redis cache
        cache_key = f"signal_explain:{signal_id_str}"
        cached_data = await self.redis_client.get(cache_key)
        deep_dive_text = ""

        if cached_data:
            deep_dive_text = json.loads(cached_data).get("deep_dive", "")
            if deep_dive_text:
                logger.info(f"stream_deep_dive: Serving from Redis cache for {signal_id_str}")

        # 2. DB fallback
        if not deep_dive_text:
            stmt = select(Signal).where(Signal.id == signal_id)
            result = await db.execute(stmt)
            signal = result.scalars().first()
            if signal and signal.deep_dive:
                deep_dive_text = signal.deep_dive
                logger.info(f"stream_deep_dive: Serving from DB for {signal_id_str}")

        # 3. Generate on demand
        if not deep_dive_text:
            logger.info(f"stream_deep_dive: Cache miss — generating deep dive for {signal_id_str}")
            deep_dive_text = await self.generate_deep_dive(db, signal_id_str) or ""

        if not deep_dive_text:
            logger.warning(f"stream_deep_dive: No content available for {signal_id_str}")
            yield "data: Deep dive analysis unavailable. This may be due to a Groq API rate limit. Please try again in a few seconds.\n\n"
            yield "data: [DONE]\n\n"
            return

        # Convert JSON-stored deep_dive to readable prose before streaming
        deep_dive_text = self._extract_prose(deep_dive_text)

        # Stream in sentence-sized chunks for SSE
        # Split by sentence boundary for more natural reading experience
        import re
        sentences = re.split(r'(?<=[.!?])\s+', deep_dive_text.strip())
        logger.info(f"stream_deep_dive: Streaming {len(sentences)} sentences for {signal_id_str}")
        for sentence in sentences:
            if sentence.strip():
                yield f"data: {sentence.strip()}\n\n"
                await asyncio.sleep(0.08)

        yield "data: [DONE]\n\n"
        logger.info(f"stream_deep_dive: Completed for {signal_id_str}")


llm_service = LLMExplainerService()
