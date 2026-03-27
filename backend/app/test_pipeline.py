import asyncio
from app.services.corporate_events import fetch_and_store_yahoo_news
from app.services.pattern_detector import detect_patterns_for_symbol
import traceback

async def main():
    try:
        print("Testing News...")
        await fetch_and_store_yahoo_news("ETERNAL.NS")
        print("News Done.")
    except Exception as e:
        traceback.print_exc()

    try:
        print("Testing Patterns 15m...")
        await detect_patterns_for_symbol("ETERNAL", "15m")
        print("Patterns 15m Done.")
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
