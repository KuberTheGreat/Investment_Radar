import sys
import os
import json

# Add the parent directory to the path so 'src' can be imported
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from src.llm_engine.explainer import LLMExplainer
from src.llm_engine.rag import RAGManager

def test_rag_and_search():
    # 1. Ingest dummy document
    print("--- 1. Ingesting Dummy Fundamental Document into RAG ---")
    rag = RAGManager()
    dummy_text = """
    INFY Q3 Earnings Call Highlights:
    The company announced a monumental shift towards Cloud AI infrastructures.
    Revenue grew by 15% YoY, driven primarily by the new $1.5B European telecommunications deal.
    Management expects strong headwinds in H2 but remains highly optimistic about their autonomous agent product launch in Q4.
    Operating margins expanded to 21.1%.
    """
    rag.ingest_document("INFY_Q3_Earnings", dummy_text, {"source": "Earnings Call", "symbol": "INFY.NS"})
    print("Document ingested successfully.")
    
    # 2. Test LLM Explainer Pipeline (which triggers Search + RAG internally)
    print("\n--- 2. Triggering LLM Explainer for INFY.NS ---")
    
    # Will automatically pull from .env thanks to python-dotenv
    explainer = LLMExplainer()
    
    # Dummy signal
    signal = {
        "signal_id": "test_signal_123",
        "symbol": "INFY.NS",
        "pattern": "Bullish Engulfing",
        "trend_5d": "Up"
    }
    
    # Bypass redis cache for the test by setting cache to None
    explainer.cache = None
    
    print("Calling generate_explanation() ...")
    result = explainer.generate_explanation(signal)
    
    print("\n--- Completed ---")
    print("Result (Expect auth error locally):", result)

if __name__ == "__main__":
    test_rag_and_search()
