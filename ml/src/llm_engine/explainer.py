import os
import json
import redis
from groq import Groq

class LLMExplainer:
    def __init__(self, api_key=None, redis_host='localhost', redis_port=6379, use_web_search=False):
        # Migrated from Anthropic to Groq API (llama-3.1-70b-versatile)
        self.client = Groq(api_key=api_key or os.environ.get("GROQ_API_KEY"))
        self.use_web_search = use_web_search
        try:
            self.cache = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
            self.cache.ping()
        except Exception:
            self.cache = None
            
    def _fetch_realtime_catalysts(self, symbol: str) -> str:
        """Placeholder for Web Search API (e.g. Tavily/SerpApi) to fetch breaking news"""
        if self.use_web_search:
            # TODO: Integrate Web Search API
            return f"[Real-time catalyst data for {symbol} would be injected here]"
        return ""

    def _retrieve_fundamental_context(self, symbol: str) -> str:
        """Placeholder for RAG Vector DB retrieval of Annual Reports"""
        # TODO: Integrate VectorDB retrieval
        return f"[RAG fundamental context for {symbol} would be injected here]"

    def generate_explanation(self, signal_data: dict) -> dict:
        signal_id = signal_data.get('signal_id', 'temp_id')
        symbol = signal_data.get('symbol', 'UNKNOWN')
        
        # 1. Check L1 Redis Cache
        if self.cache:
            cached = self.cache.get(f"explain:{signal_id}")
            if cached:
                return json.loads(cached)

        # Retrieve RAG & Web Search enhancements
        news_context = self._fetch_realtime_catalysts(symbol)
        fundamental_context = self._retrieve_fundamental_context(symbol)
                
        # 2. Build 2-part Prompt Architecture
        prompt = f"""
        You are an expert financial analyst assessing an Indian market signal.
        Analyze this signal data:
        {json.dumps(signal_data, indent=2)}
        
        Real-time News Catalysts:
        {news_context}
        
        Fundamental Context (RAG):
        {fundamental_context}
        
        Output a valid JSON object with EXACTLY three keys:
        - "one_liner": A max 20 words summary
        - "paragraph": An 80-120 words explanation
        - "deep_dive": A 300-400 words comprehensive analysis
        
        CRITICAL RULES:
        1. You MUST include explicit source citations formatted as [Source: <Name>, <Date>].
        2. Do NOT hallucinate any statistics. Ground everything in the input data.
        3. End the deep_dive with: 'This is not financial advice. Past patterns do not guarantee future results. Please consult a registered financial advisor before making investment decisions.'
        """
        
        # 3. Call Groq Inference
        try:
            response = self.client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                max_tokens=1000,
                messages=[
                    {"role": "system", "content": "You are an AI tailored for the Indian Investor. Respond only with parsable JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            result_text = response.choices[0].message.content
            result = json.loads(result_text)
            
            # 4. Save to Cache
            if self.cache:
                self.cache.setex(f"explain:{signal_id}", 86400, json.dumps(result))
                
            return result
        except Exception as e:
            return {"error": str(e)}
