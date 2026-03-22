from ddgs import DDGS

class WebSearcher:
    def __init__(self):
        self.ddgs = DDGS()

    def get_latest_news(self, symbol: str, max_results: int = 3) -> str:
        """
        Searches DDG for recent news related to the given stock symbol.
        Returns a formatted string containing the top headlines and snippets.
        """
        query = f"{symbol} stock latest news today India"
        try:
            results = list(self.ddgs.text(query, max_results=max_results))
            if not results:
                return f"No recent news found for {symbol}."
            
            formatted_news = "--- LATEST NEWS ---\n"
            for i, r in enumerate(results):
                formatted_news += f"{i+1}. {r.get('title', 'No Title')}\n   Snippet: {r.get('body', 'No Snippet')}\n   Link: {r.get('href', '')}\n\n"
            
            return formatted_news
        except Exception as e:
            return f"Error fetching news for {symbol}: {str(e)}"
