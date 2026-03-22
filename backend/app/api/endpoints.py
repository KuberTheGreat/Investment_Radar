from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sse_starlette.sse import EventSourceResponse
import asyncio

from app.db.database import get_db
from sqlalchemy.orm import Session
from app.services.llm_service import llm_service

router = APIRouter(prefix="/api")

@router.get("/signals")
def get_signals(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """ Returns ranked signals feed """
    # FIXME: Connect to actual backend logic 
    return {"data": [{"id": 1, "symbol": "RELIANCE", "pattern": "Morning Star", "direction": "bullish"}]}

@router.get("/stock/{symbol}")
def get_stock(symbol: str, db: Session = Depends(get_db)):
    """ Returns data for specific stock """
    return {"symbol": symbol, "status": "active"}

@router.get("/explain/{signal_id}")
async def explain_signal(signal_id: str):
    """
    SSE stream of the LLM explanation for a signal.
    """
    async def event_generator():
        # TODO: Lookup signal metrics from DB to stringify for Groq
        mock_data = f"Signal {signal_id} on HDFCBANK, win rate 73.2% over 15 days."
        
        # Simulated streaming response since regular groq client in non-stream mode is fast
        explanation = await llm_service.generate_signal_explanation({"data": mock_data}, "deep dive")
        
        for chunk in explanation.split(" "):
            yield {"data": chunk + " "}
            await asyncio.sleep(0.05) 
            
    return EventSourceResponse(event_generator())
