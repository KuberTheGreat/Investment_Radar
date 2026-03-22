import anthropic
import os
import redis
import json

class LLMExplainer:
    def __init__(self, api_key=None, redis_host='localhost', redis_port=6379):
        # We will use Claude 3.5/3.7 Sonnet for strong instruction following
        self.client = anthropic.Anthropic(api_key=api_key or os.environ.get("ANTHROPIC_API_KEY"))
        try:
            self.cache = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
            self.cache.ping()
        except Exception:
            self.cache = None
            
    def generate_explanation(self, signal_data: dict) -> dict:
        signal_id = signal_data.get('signal_id', 'temp_id')
        
        # 1. Check L1 Redis Cache
        if self.cache:
            cached = self.cache.get(f"explain:{signal_id}")
            if cached:
                return json.loads(cached)
                
        # 2. Build 2-part Prompt Architecture
        prompt = f"""
        You are an expert financial analyst assessing an Indian market signal.
        Analyze this signal data:
        {json.dumps(signal_data, indent=2)}
        
        Output a valid JSON object with EXACTLY three keys:
        - "one_liner": A max 20 words summary
        - "paragraph": An 80-120 words explanation
        - "deep_dive": A 300-400 words comprehensive analysis
        
        CRITICAL RULES:
        1. You MUST include explicit source citations formatted as [Source: <Name>, <Date>].
        2. Do NOT hallucinate any statistics. Ground everything in the input data.
        3. End the deep_dive with: 'This is not financial advice. Past patterns do not guarantee future results. Please consult a registered financial advisor before making investment decisions.'
        """
        
        # 3. Call Anthropic Inference
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                system="You are an AI tailored for the Indian Investor.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            result = {"raw_output": response.content[0].text}
            
            # 4. Save to Cache
            if self.cache:
                self.cache.setex(f"explain:{signal_id}", 86400, json.dumps(result))
                
            return result
        except Exception as e:
            return {"error": str(e)}
