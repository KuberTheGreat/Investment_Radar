import os
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from groq import Groq

from app.core.database import get_db
from app.models.market_data import OHLCCandle
from app.models.patterns import DetectedPattern
from app.models.events import CorporateEvent

router = APIRouter()

try:
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
except Exception as e:
    groq_client = None
    print(f"Warning: Failed to initialize Groq client: {e}")

# Data Contracts
class SignalAnalysisOutput(BaseModel):
    directional_bias: Literal["BULLISH", "BEARISH", "NEUTRAL"]
    confidence_score: int  # 0 to 100
    retail_sentiment: str
    institutional_sentiment: str
    rationale: str
    invalidation_point: str

@router.get("/api/v1/analysis/{ticker}", response_model=SignalAnalysisOutput)
async def analyze_ticker(ticker: str, db: AsyncSession = Depends(get_db)):
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq client is not initialized properly.")
    
    try:
        # Fetch latest 1 row from ohlcv_candles
        ohlcv_stmt = select(OHLCCandle).where(OHLCCandle.symbol == ticker).order_by(desc(OHLCCandle.timestamp)).limit(1)
        ohlcv_result = await db.execute(ohlcv_stmt)
        ohlcv_data = ohlcv_result.scalar_one_or_none()

        # Fetch latest 1 row from detected_patterns
        patterns_stmt = select(DetectedPattern).where(DetectedPattern.symbol == ticker).order_by(desc(DetectedPattern.detected_at)).limit(1)
        patterns_result = await db.execute(patterns_stmt)
        pattern_data = patterns_result.scalar_one_or_none()

        # Fetch latest 3 rows from corporate_events
        events_stmt = select(CorporateEvent).where(CorporateEvent.symbol == ticker).order_by(desc(CorporateEvent.event_date)).limit(3)
        events_result = await db.execute(events_stmt)
        events_data = events_result.scalars().all()

        # Dynamic Data Formatting for corporate events
        formatted_events = []
        for event in events_data:
            source_ref = str(event.source_reference).lower() if event.source_reference else ""
            
            # If "bse" is in the source reference (e.g. "bse", or "bseindia.com/...")
            if "bse" in source_ref and event.party_name and event.quantity and event.price_per_share:
                formatted_events.append(f"BSE Event: {event.party_name} traded {event.quantity} shares at ₹{event.price_per_share}")
            else:
                if event.event_type and event.event_date:
                    formatted_events.append(f"Event: {event.event_type} on {event.event_date}")

        # Construct Reality Seed String
        reality_seed_parts = [f"Ticker: {ticker}"]
        
        if ohlcv_data:
            reality_seed_parts.append(f"Latest OHLCV - Close: {ohlcv_data.close}, Volume: {ohlcv_data.volume}")
            
        if pattern_data:
            reality_seed_parts.append(f"Detected Pattern: {pattern_data.pattern_name}, Signal Direction: {pattern_data.signal_direction}")
            
        if formatted_events:
            reality_seed_parts.append("Recent Corporate Events:")
            for e in formatted_events:
                reality_seed_parts.append(f" - {e}")
                
        reality_seed = "\n".join(reality_seed_parts)

        # Groq System Prompt
        system_prompt = (
            "You are a sophisticated quant simulator and AI financial analyst. "
            "Analyze the provided reality seed data for the stock ticker and generate an analysis. "
            "You MUST output valid JSON strictly adhering to the following schema:\n"
            "{\n"
            '  "directional_bias": "BULLISH" | "BEARISH" | "NEUTRAL",\n'
            '  "confidence_score": <integer from 0 to 100>,\n'
            '  "retail_sentiment": "<string description>",\n'
            '  "institutional_sentiment": "<string description>",\n'
            '  "rationale": "<string detailed rationale>",\n'
            '  "invalidation_point": "<string invalidation scenario/price logic>"\n'
            "}"
        )

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": f"Reality Seed:\n{reality_seed}",
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2, # Low temperature for more analytical JSON consistency
            response_format={"type": "json_object"},
        )

        output_content = chat_completion.choices[0].message.content
        parsed_json = json.loads(output_content)
        
        return SignalAnalysisOutput(**parsed_json)

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error during analysis generation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error processing analysis.")
