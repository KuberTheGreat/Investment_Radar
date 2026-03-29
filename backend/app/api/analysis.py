import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq

# Initialize the Groq client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

router = APIRouter()

class SignalAnalysisOutput(BaseModel):
    directional_bias: str
    confidence_score: int
    retail_sentiment: str
    institutional_sentiment: str
    rationale: str
    invalidation_point: str

@router.get("/api/v1/analysis/{ticker}")
async def analyze_ticker(ticker: str):
    # Mock the Context Data (Reality Seed)
    mock_context = f"""
    Ticker: {ticker}
    Recent Technicals: RSI 28 (Oversold), Bullish Engulfing pattern on daily chart.
    Corporate Event: SEBI insider buying disclosures show heavy accumulation by promoters.
    """
    
    system_prompt = f"""
    You are a quantitative market analyst.
    Assess the provided market context and return an analysis STRICTLY conforming to the provided JSON schema.
    Output nothing else but the JSON object.
    
    JSON Schema:
    {{
      "directional_bias": "string (e.g. Bullish, Bearish, Neutral)",
      "confidence_score": "integer (0-100)",
      "retail_sentiment": "string",
      "institutional_sentiment": "string",
      "rationale": "string",
      "invalidation_point": "string"
    }}
    """
    
    try:
        model = os.environ.get("LLM_MODEL", "llama3-70b-8192")
        
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": mock_context
                }
            ],
            model=model,
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        response_content = chat_completion.choices[0].message.content
        return json.loads(response_content)
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail="Failed to decode JSON from Groq API.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
