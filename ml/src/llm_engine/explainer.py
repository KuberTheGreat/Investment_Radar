import groq
import os
import redis
import json
from dotenv import load_dotenv

load_dotenv()

from src.llm_engine.web_search import WebSearcher
from src.llm_engine.rag import RAGManager

class LLMExplainer:
    def __init__(self, api_key=None, redis_host='localhost', redis_port=6379):
        # We will use Llama 3 70B for strong instruction following
        self.client = groq.Groq(api_key=api_key or os.environ.get("GROQ_API_KEY"))
        try:
            self.cache = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
            self.cache.ping()
        except Exception:
            self.cache = None
            
        self.web_searcher = WebSearcher()
        self.rag_manager = RAGManager()
            
    def generate_explanation(self, signal_data: dict) -> dict:
        signal_id = signal_data.get('signal_id', 'temp_id')
        
        # 1. Check L1 Redis Cache
        if self.cache:
            cached = self.cache.get(f"explain:{signal_id}")
            if cached:
                return json.loads(cached)
                
        # 2. Fetch External Context
        symbol = signal_data.get('symbol', 'UNKNOWN')
        print(f"Fetching Web Search news for {symbol}...")
        news_context = self.web_searcher.get_latest_news(symbol)
        
        print(f"Fetching RAG internal documents for {symbol}...")
        rag_context = self.rag_manager.query(f"Latest updates, earnings, and fundamentals for {symbol}")

        # 3. Build 2-part Prompt Architecture
        prompt = f"""
        You are an expert financial analyst assessing an Indian market signal.
        Analyze this signal data:
        {json.dumps(signal_data, indent=2)}
        
        Here is the latest web news for context:
        {news_context}
        
        Here is the internal company fundamental data (RAG):
        {rag_context}
        
        Output a valid JSON object with EXACTLY three keys:
        - "one_liner": A max 20 words summary
        - "paragraph": An 80-120 words explanation
        - "deep_dive": A 300-400 words comprehensive analysis
        
        CRITICAL RULES:
        1. You MUST include explicit source citations formatted as [Source: <Name>, <Date>].
        2. Do NOT hallucinate any statistics. Ground everything in the input data.
        3. End the deep_dive with: 'This is not financial advice. Past patterns do not guarantee future results. Please consult a registered financial advisor before making investment decisions.'
        """
        
        # 4. Call Groq Inference
        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                max_tokens=1000,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "You are an AI tailored for the Indian Investor. Always reply with valid JSON."},
                    {"role": "user", "content": prompt}
                ]
            )
            
            result = {"raw_output": response.choices[0].message.content}
            
            # 5. Save to Cache
            if self.cache:
                self.cache.setex(f"explain:{signal_id}", 86400, json.dumps(result))
                
            return result
        except Exception as e:
            return {"error": str(e)}
