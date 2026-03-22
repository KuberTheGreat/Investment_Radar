import json
import logging
import asyncio
from typing import AsyncGenerator
from groq import AsyncGroq
from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.signals import Signal
import redis.asyncio as redis
from app.services.web_search import WebSearcher
from app.services.rag import RAGManager

logger = logging.getLogger(__name__)

class LLMExplainerService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        if self.api_key:
            self.client = AsyncGroq(api_key=self.api_key)
        else:
            self.client = None
            logger.warning("Groq API key is not set. LLM explanation will not work.")
        
        self.model = settings.GROQ_MODEL
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.web_searcher = WebSearcher()
        self.rag_manager = RAGManager()

    def _build_prompt(self, signal_context: dict) -> str:
        return f"""
You are an expert financial analyst. Analyze the following trading signal context and provide an explanation in three lengths:
1. 'one_liner': A single sentence summary of the opportunity.
2. 'paragraph': A concise paragraph explaining the rationale behind the signal.
3. 'deep_dive': A detailed analysis covering technical patterns, corporate events, and potential backtest confluence.

Signal Context:
{json.dumps(signal_context, indent=2)}

CRITICAL RULES:
1. You MUST include explicit source citations formatted as [Source: <Name>, <Date>] if invoking Web or RAG news.
2. Do NOT hallucinate any statistics. Ground everything in the input data.
3. End the deep_dive with: 'This is not financial advice. Past patterns do not guarantee future results.'

Return ONLY valid JSON with exactly the three keys: "one_liner", "paragraph", and "deep_dive". 
Do not include any other text or markdown formatting.
"""

    async def generate_explanations(self, db: AsyncSession, signal_id: str) -> dict:
        """
        Background task to generate explanations for a signal, save to DB, and cache them.
        """
        if not self.client:
            return None

        # Fetch signal details (synchronous logic assuming sync Session is passed)
        stmt = select(Signal).where(Signal.id == signal_id)
        result = await db.execute(stmt)
        signal = result.scalars().first()
        if not signal:
            return None

        # Build context
        context = {
            "symbol": signal.symbol,
            "signal_type": signal.signal_type,
            "win_rate_5d": float(signal.win_rate_5d) if signal.win_rate_5d else None,
            "win_rate_15d": float(signal.win_rate_15d) if signal.win_rate_15d else None,
            "confluence_score": signal.confluence_score,
            "high_confluence": signal.high_confluence,
            "news_context": await asyncio.to_thread(self.web_searcher.get_latest_news, signal.symbol),
            "rag_context": await asyncio.to_thread(self.rag_manager.query, f"Latest updates, earnings, and fundamentals for {signal.symbol}")
        }

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert financial analyst. Respond only in JSON format."},
                    {"role": "user", "content": self._build_prompt(context)}
                ],
                response_format={"type": "json_object"}
            )

            # Extract JSON from response
            text_response = response.choices[0].message.content
            try:
                # Sometimes LLMs include ```json ... ``` despite instructions
                if "```json" in text_response:
                    text_response = text_response.split("```json")[1].split("```")[0].strip()
                elif "```" in text_response:
                    text_response = text_response.split("```")[1].strip()
                    
                parsed = json.loads(text_response)
                
                # Update DB record
                signal.one_liner = str(parsed.get("one_liner", ""))
                signal.paragraph_explanation = str(parsed.get("paragraph", ""))
                dd = parsed.get("deep_dive", "")
                signal.deep_dive = json.dumps(dd) if isinstance(dd, dict) else str(dd)
                await db.commit()

                # Cache to Redis for quick access
                cache_key = f"signal_explain:{signal_id}"
                await self.redis_client.set(cache_key, json.dumps({
                    "one_liner": signal.one_liner,
                    "paragraph": signal.paragraph_explanation,
                    "deep_dive": signal.deep_dive
                }), ex=86400 * 7) # Cache for 7 days

                return parsed

            except json.JSONDecodeError:
                logger.error(f"Failed to parse Groq JSON response for signal {signal_id}: {text_response}")
                return None

        except Exception as e:
            logger.error(f"Error generating explanations for {signal_id}: {str(e)}")
            return None

    async def stream_deep_dive(self, signal_id: str, db: AsyncSession) -> AsyncGenerator[str, None]:
        """
        Stream the deep dive explanation using Server-Sent Events (SSE).
        """
        # First check cache
        cache_key = f"signal_explain:{signal_id}"
        cached_data = await self.redis_client.get(cache_key)
        
        deep_dive_text = ""
        if cached_data:
            deep_dive_text = json.loads(cached_data).get("deep_dive", "")
        else:
            # Check DB
            stmt = select(Signal).where(Signal.id == signal_id)
            result = await db.execute(stmt)
            signal = result.scalars().first()
            if signal and signal.deep_dive:
                deep_dive_text = signal.deep_dive
                # populate cache
                await self.redis_client.set(cache_key, json.dumps({
                    "one_liner": signal.one_liner,
                    "paragraph": signal.paragraph_explanation,
                    "deep_dive": signal.deep_dive
                }), ex=86400 * 7)
            else:
                # Need to generate it now
                res = await self.generate_explanations(db, signal_id)
                if res:
                    deep_dive_text = res.get("deep_dive", "")

        if not deep_dive_text:
            yield "No explanation available."
            return
            
        # Stream the text in chunks for SSE
        chunk_size = 20
        words = deep_dive_text.split()
        for i in range(0, len(words), chunk_size):
            chunk_text = " ".join(words[i:i+chunk_size])
            yield chunk_text
        
        # End of stream marker
        yield "[DONE]"

llm_service = LLMExplainerService()
