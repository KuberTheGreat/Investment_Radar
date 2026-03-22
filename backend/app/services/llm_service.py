from groq import Groq
from typing import Dict, Any
import os

class LLMService:
    def __init__(self):
        # Setup the Groq Client from environment variable GROQ_API_KEY
        # Fallback provided for safety during instantiation if not exported yet
        api_key = os.environ.get("GROQ_API_KEY", "gsk_REDACTED")
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.1-70b-versatile" # Robust multi-purpose reasoning

    async def generate_signal_explanation(self, signal_data: Dict[str, Any], length: str = "paragraph") -> str:
        """
        Generates the one-liner, paragraph, or deep-dive variant of the explanation.
        """
        # Formulate Prompt 
        system_prompt = (
            "You are a data-driven Indian market analyst. Respond using solely the data provided. "
            "Write in plain English for a Class 12 reading level. Ensure no hallucinated statistics. "
            "At the end of your response, you MUST include this exact disclaimer: "
            "'This is not financial advice. Past patterns do not guarantee future results. "
            "Please consult a registered financial advisor before making investment decisions.'"
        )

        user_prompt = f"Explain this stock signal at a {length} length based strictly on this data:\n{signal_data}"

        completion = self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=self.model,
            temperature=0.3,
            max_tokens=800 if length == "deep dive" else 200,
        )

        return completion.choices[0].message.content

llm_service = LLMService()
