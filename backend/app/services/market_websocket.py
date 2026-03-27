"""
MarketWebSocketService — Angel One Phase 2: Live Tick Streaming.

Architecture:
  1. SmartWebSocketV2 runs in a dedicated background thread.
  2. On each incoming tick, prices are pushed to Redis pub/sub
     channel `price:<SYMBOL>` as JSON.
  3. FastAPI SSE endpoint `/api/broker/stream/<symbol>` subscribes
     to the Redis channel and streams updates to the browser.
  4. On watchlist changes, the service dynamically subscribes or
     unsubscribes individual tokens without reconnecting.

Exchange type codes:
  - 1 = NSE Cash (equities)
  - 3 = BSE Cash
  - 5 = MCX F&O

Subscription modes:
  - 1 = LTP         (Last Traded Price only — lowest overhead)
  - 2 = Quote       (LTP + Volume + OHLC)
  - 3 = Snap Quote  (Full market depth — highest overhead)
"""
import json
import logging
import threading
import time
import asyncio
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("investorradar.websocket")

# Symbol → numeric token mapping cache
# Populated on-demand via broker_service.resolve_symbol_token()
_SYMBOL_TOKEN_CACHE: dict[str, str] = {
    # Pre-seeded common NSE tokens (avoids a round-trip on startup)
    "RELIANCE":   "2885",
    "TCS":        "11536",
    "HDFCBANK":   "1333",
    "ICICIBANK":  "4963",
    "INFY":       "1594",
    "SBIN":       "3045",
    "LT":         "11483",
    "ITC":        "1660",
    "TATAMOTORS": "3456",
    "ZOMATO":     "5097",
    "ETERNAL":    "5097",   # Zomato rebranded to Eternal Ltd
    "TATASTEEL":  "3506",
    "ADANIENT":   "25",
    "WIPRO":      "3787",
    "HCLTECH":    "7229",
    "BAJFINANCE": "317",
    "SUNPHARMA":  "3351",
    "MARUTI":     "10999",
    "AXISBANK":   "5900",
    "KOTAKBANK":  "1922",
    "NTPC":       "11630",
    "IREDA":      "24232",  # Indian Renewable Energy Development Agency
    "ONGC":       "2475",
    "POWERGRID":  "14977",
    "BHARTIARTL": "10604",
    "NESTLEIND":  "17963",
    "HINDUNILVR": "1394",
    "ASIANPAINT": "236",
    "ULTRACEMCO": "11532",
    "BAJAJFINSV": "16675",
    "TITAN":      "3506",
    "HINDALCO":   "1363",
    "JSWSTEEL":   "11723",
    "DRREDDY":    "881",
    "DIVISLAB":   "10940",
    "CIPLA":      "694",
}


class MarketWebSocketService:
    """
    Manages a persistent Angel One SmartWebSocketV2 connection in a background
    thread, routing tick data through Redis pub/sub to FastAPI SSE consumers.
    """

    def __init__(self):
        self._sws = None
        self._thread: Optional[threading.Thread] = None
        self._connected = False
        self._lock = threading.Lock()
        # symbol → token subscriptions currently active on the wire
        self._active_subscriptions: dict[str, str] = {}
        # Redis pub channel prefix
        self.CHANNEL_PREFIX = "price:"

    # ── Connection Lifecycle ──────────────────────────────────────────────────

    def start(self, access_token: str, feed_token: str):
        """
        Launch the WebSocket connection in a daemon background thread.
        Safe to call multiple times — skips if already connected.
        """
        if self._connected:
            logger.info("websocket: Already connected — skipping start.")
            return

        logger.info("websocket: Initiating SmartWebSocketV2 connection...")

        try:
            from SmartApi.smartWebSocketV2 import SmartWebSocketV2
            self._sws = SmartWebSocketV2(
                auth_token=access_token,
                api_key=settings.ANGELONE_API_KEY,
                client_code=settings.ANGELONE_CLIENT_ID,
                feed_token=feed_token,
                max_retry_attempt=5,
            )
            self._sws.on_open = self._on_open
            self._sws.on_data = self._on_data
            self._sws.on_error = self._on_error
            self._sws.on_close = self._on_close

            self._thread = threading.Thread(
                target=self._sws.connect,
                daemon=True,
                name="angel-one-ws",
            )
            self._thread.start()
            logger.info("websocket: Daemon thread launched.")
        except Exception as exc:
            logger.error(f"websocket: Failed to start — {exc}", exc_info=True)

    def stop(self):
        """Gracefully close the WebSocket connection."""
        if self._sws:
            try:
                self._sws.close_connection()
            except Exception:
                pass
        self._connected = False
        logger.info("websocket: Connection closed.")

    # ── Subscription Management ───────────────────────────────────────────────

    def subscribe(self, symbols: list[str]):
        """
        Subscribe to tick data for the given NSE equity symbols.
        Resolves each symbol to its Angel One token and updates the live feed.
        Tolerates duplicate subscriptions silently.

        Args:
            symbols: List of NSE symbol names without .NS suffix, e.g. ["RELIANCE", "TCS"]
        """
        new_tokens = []
        for sym in symbols:
            sym = sym.upper().replace(".NS", "")
            token = _SYMBOL_TOKEN_CACHE.get(sym)
            if not token:
                token = self._resolve_token(sym)
            if token and sym not in self._active_subscriptions:
                self._active_subscriptions[sym] = token
                new_tokens.append(token)
                logger.info(f"websocket: Queuing subscription for {sym} (token={token})")

        if new_tokens and self._connected and self._sws:
            try:
                self._sws.subscribe(
                    correlation_id="radar",
                    mode=2,   # Quote mode — LTP + volume + OHLC
                    token_list=[{"exchangeType": 1, "tokens": new_tokens}]
                )
                logger.info(f"websocket: Subscribed to {len(new_tokens)} new tokens.")
            except Exception as exc:
                logger.error(f"websocket: subscribe() error — {exc}")

    def unsubscribe(self, symbols: list[str]):
        """Unsubscribe from the given symbols' tick streams."""
        tokens = []
        for sym in symbols:
            sym = sym.upper().replace(".NS", "")
            token = self._active_subscriptions.pop(sym, None)
            if token:
                tokens.append(token)

        if tokens and self._connected and self._sws:
            try:
                self._sws.unsubscribe(
                    correlation_id="radar",
                    mode=2,
                    token_list=[{"exchangeType": 1, "tokens": tokens}]
                )
                logger.info(f"websocket: Unsubscribed {len(tokens)} tokens.")
            except Exception as exc:
                logger.error(f"websocket: unsubscribe() error — {exc}")

    def get_status(self) -> dict:
        """Return the current WebSocket connection status."""
        return {
            "connected": self._connected,
            "subscribed_symbols": list(self._active_subscriptions.keys()),
            "total_subscriptions": len(self._active_subscriptions),
        }

    # ── WebSocket Callbacks ───────────────────────────────────────────────────

    def _on_open(self, wsapp):
        """Called when the WebSocket connection is established."""
        self._connected = True
        logger.info("websocket: Connection OPEN. Subscribing to active watchlist...")

        # Re-subscribe to all symbols that were queued before connection
        if self._active_subscriptions and self._sws:
            tokens = list(self._active_subscriptions.values())
            try:
                self._sws.subscribe(
                    correlation_id="radar",
                    mode=2,
                    token_list=[{"exchangeType": 1, "tokens": tokens}]
                )
                logger.info(f"websocket: Re-subscribed {len(tokens)} tokens on reconnect.")
            except Exception as exc:
                logger.error(f"websocket: on_open subscribe error — {exc}")

    def _on_data(self, wsapp, message):
        """
        Called on every incoming tick. Publishes to Redis pub/sub channel
        `price:<SYMBOL>` so SSE clients receive it instantly.
        """
        try:
            if not isinstance(message, dict):
                return

            token = str(message.get("token", ""))
            ltp = message.get("last_traded_price", 0)
            # Angel One sends price as integer * 100 (paisa) → convert to rupees
            ltp_rupees = ltp / 100.0 if ltp else 0.0

            # Reverse-lookup symbol from token
            symbol = None
            for sym, tok in self._active_subscriptions.items():
                if tok == token:
                    symbol = sym
                    break

            if not symbol:
                return

            tick = {
                "symbol": symbol,
                "ltp": ltp_rupees,
                "volume": message.get("volume_trade_for_the_day", 0),
                "open": (message.get("open_price_of_the_day", 0) or 0) / 100.0,
                "high": (message.get("high_price_of_the_day", 0) or 0) / 100.0,
                "low": (message.get("low_price_of_the_day", 0) or 0) / 100.0,
                "close": (message.get("closed_price", 0) or 0) / 100.0,
                "change_pct": message.get("percentage_change", 0.0),
                "timestamp": message.get("exchange_timestamp", ""),
            }

            # Publish to Redis channel (async-bridge via new event loop in thread)
            self._publish_to_redis(symbol, tick)

        except Exception as exc:
            logger.error(f"websocket: _on_data error — {exc}", exc_info=True)

    def _on_error(self, wsapp, error):
        logger.error(f"websocket: Error — {error}")
        self._connected = False

    def _on_close(self, wsapp):
        logger.warning("websocket: Connection CLOSED. Will retry...")
        self._connected = False

    # ── Internal Helpers ──────────────────────────────────────────────────────

    def _resolve_token(self, symbol: str) -> Optional[str]:
        """
        Fetch the Angel One instrument token for a given NSE symbol.
        Caches the result in _SYMBOL_TOKEN_CACHE for subsequent calls.
        """
        try:
            from app.services.broker_service import broker_service
            if not broker_service._smart_api:
                return None
            data = broker_service._smart_api.searchScrip("NSE", symbol)
            if data.get("status") and data.get("data"):
                token = data["data"][0].get("symboltoken", "")
                if token:
                    _SYMBOL_TOKEN_CACHE[symbol] = token
                    logger.info(f"websocket: Resolved token for {symbol} = {token}")
                    return token
        except Exception as exc:
            logger.warning(f"websocket: Token resolution failed for {symbol} — {exc}")
        return None

    def _publish_to_redis(self, symbol: str, tick: dict):
        """
        Publish the tick JSON to Redis pub/sub in a fire-and-forget manner.
        Runs in the WebSocket thread, so uses a synchronous Redis client.
        """
        try:
            import redis as redis_sync
            r = redis_sync.from_url(settings.REDIS_URL, decode_responses=True)
            channel = f"{self.CHANNEL_PREFIX}{symbol}"
            r.publish(channel, json.dumps(tick))
            # Also cache latest price for HTTP GET fallback
            r.setex(f"ltp:{symbol}", 300, json.dumps(tick))  # 5-min TTL
            r.close()
        except Exception as exc:
            logger.debug(f"websocket: Redis publish failed for {symbol} — {exc}")


# ── Global singleton ──────────────────────────────────────────────────────────
market_ws = MarketWebSocketService()
