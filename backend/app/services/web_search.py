from duckduckgo_search import DDGS

class WebSearcher:
    def __init__(self):
        self.ddgs = DDGS()

    def get_latest_news(self, symbol: str, max_results: int = 3) -> str:
        """
        Searches DDG for recent news related to the given stock symbol.
        Returns a formatted string containing the top headlines and snippets.
        """
        query = f"{symbol} stock India"
        try:
            results = list(self.ddgs.news(query, max_results=max_results))
            if not results:
                # Fallback to general text search if news is empty
                results = list(self.ddgs.text(query + " latest news", max_results=max_results))
                
            if not results:
                return f"No recent news found for {symbol}."
            
            formatted_news = "--- LATEST NEWS ---\n"
            for i, r in enumerate(results):
                title = r.get('title', 'No Title')
                body = r.get('body', r.get('snippet', 'No Snippet'))
                link = r.get('href', r.get('url', ''))
                formatted_news += f"{i+1}. {title}\n   Snippet: {body}\n   Link: {link}\n\n"
            
            return formatted_news
        except Exception as e:
            return f"Error fetching news for {symbol}: {str(e)}"
