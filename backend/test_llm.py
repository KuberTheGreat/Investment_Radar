import asyncio
import os
import json
import traceback

# Setup environment before importing service
from dotenv import load_dotenv
load_dotenv()

from app.services.llm_explainer import llm_service

async def main():
    print("Testing Groq LLM integration...")
    if not llm_service.client:
        print("ERROR: Groq client not initialized. Is GROQ_API_KEY set?")
        return

    # Mock signal context to pass directly to Groq instead of DB
    context = {
        "symbol": "RELIANCE",
        "signal_type": "BULLISH_ENGULFING",
        "win_rate_5d": 65.5,
        "win_rate_15d": 72.1,
        "confluence_score": 3,
        "high_confluence": True
    }
    
    print("\n--- Sending request to Groq ---")
    try:
        response = await llm_service.client.chat.completions.create(
            model=llm_service.model,
            messages=[
                {"role": "system", "content": "You are an expert financial analyst. Respond only in JSON format."},
                {"role": "user", "content": llm_service._build_prompt(context)}
            ],
            response_format={"type": "json_object"}
        )
        
        text_response = response.choices[0].message.content
        print("\n--- Raw Response ---")
        print(text_response)
        
        print("\n--- Parsed JSON ---")
        try:
            parsed = json.loads(text_response)
            for k, v in parsed.items():
                print(f"{k.upper()}:\n{v}\n")
            print("✅ TEST PASSED!")
        except Exception as e:
            print("❌ Failed to parse JSON:")
            print(e)
            
    except Exception as e:
        print("❌ Error calling Groq API:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
