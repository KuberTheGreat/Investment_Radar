"""
BrokerService — Angel One SmartAPI Integration Service.

Responsibilities:
  Phase 1: Session lifecycle management (generate, refresh, persist tokens).
  Phase 2: Live WebSocket market data subscription via SmartWebSocketV2.
  Phase 3: Automated order execution engine triggered by AI confluence signals.
  Phase 4: Portfolio & ledger synchronization (positions, margins, order book).
"""
import asyncio
import logging
import pyotp
from datetime import datetime, timedelta, timezone
from typing import Optional
from SmartApi import SmartConnect
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.broker import BrokerSession

logger = logging.getLogger("investorradar.broker")


# ── Singleton state ───────────────────────────────────────────────────────────

class BrokerService:
    """
    Thread-safe singleton wrapping the Angel One SmartAPI SDK.
    Manages session lifecycle, market data subscriptions, and order execution.
    """

    def __init__(self):
        self._smart_api: Optional[SmartConnect] = None
        self._access_token: Optional[str] = None
        self._feed_token: Optional[str] = None
        self._session_lock = asyncio.Lock()
        self._is_authenticated = False

    # ── Phase 1: Session Management ──────────────────────────────────────────

    def _build_smart_api(self) -> SmartConnect:
        """Instantiate the SDK with the configured API key."""
        return SmartConnect(api_key=settings.ANGELONE_API_KEY)

    def _generate_totp(self) -> str:
        """
        Generate a live 30-second TOTP code from the base32 secret key
        configured in ANGELONE_TOTP_KEY. Returns empty string if not configured.
        """
        if not settings.ANGELONE_TOTP_KEY:
            logger.warning("broker: ANGELONE_TOTP_KEY not configured — TOTP unavailable.")
            return ""
        return pyotp.TOTP(settings.ANGELONE_TOTP_KEY).now()

    async def authenticate(self) -> bool:
        """
        Generate an authenticated session using client credentials + TOTP.
        Persists tokens to Postgres. Safe to call concurrently (locked).

        Returns True on success, False on failure.
        """
        if not settings.ANGELONE_CLIENT_ID or not settings.ANGELONE_PASSWORD:
            logger.warning(
                "broker: ANGELONE_CLIENT_ID or ANGELONE_PASSWORD not set. "
                "Add them to .env to enable live SmartAPI session."
            )
            return False

        async with self._session_lock:
            try:
                smart = self._build_smart_api()
                totp_code = self._generate_totp()
                logger.info(f"broker: Initiating SmartAPI session for {settings.ANGELONE_CLIENT_ID}...")

                data = smart.generateSession(
                    settings.ANGELONE_CLIENT_ID,
                    settings.ANGELONE_PASSWORD,
                    totp_code
                )

                if data.get("status") is not True:
                    logger.error(f"broker: Authentication failed — {data.get('message', 'unknown error')}")
                    return False

                self._smart_api = smart
                self._access_token = data["data"]["jwtToken"]
                self._feed_token = smart.getfeedToken()
                refresh_token = data["data"].get("refreshToken", "")
                self._is_authenticated = True

                expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

                # Persist to Postgres
                async with AsyncSessionLocal() as db:
                    stmt = pg_insert(BrokerSession).values(
                        client_code=settings.ANGELONE_CLIENT_ID,
                        access_token=self._access_token,
                        refresh_token=refresh_token,
                        feed_token=self._feed_token,
                        is_active=True,
                        authenticated_at=datetime.now(timezone.utc),
                        expires_at=expires_at,
                    ).on_conflict_do_update(
                        index_elements=["client_code"],
                        set_=dict(
                            access_token=self._access_token,
                            refresh_token=refresh_token,
                            feed_token=self._feed_token,
                            is_active=True,
                            authenticated_at=datetime.now(timezone.utc),
                            expires_at=expires_at,
                            updated_at=datetime.now(timezone.utc),
                        )
                    )
                    await db.execute(stmt)
                    await db.commit()

                logger.info("broker: Authentication successful. Tokens vaulted to Postgres.")
                return True

            except Exception as exc:
                logger.error(f"broker: Authentication exception — {exc}", exc_info=True)
                self._is_authenticated = False
                return False

    async def refresh_session(self) -> bool:
        """
        Refresh the Angel One session using the stored refresh token.
        Called daily by APScheduler at 06:00 IST before market open.
        """
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(BrokerSession).where(
                    BrokerSession.client_code == settings.ANGELONE_CLIENT_ID,
                    BrokerSession.is_active == True
                )
            )
            session = result.scalars().first()

        if not session or not session.refresh_token:
            logger.info("broker: No active session found — attempting fresh authentication.")
            return await self.authenticate()

        try:
            async with self._session_lock:
                smart = self._build_smart_api()
                smart.setAccessToken(session.access_token)
                data = smart.generateToken(session.refresh_token)

                if data.get("status") is not True:
                    logger.warning("broker: Token refresh failed — re-authenticating fresh.")
                    return await self.authenticate()

                self._smart_api = smart
                self._access_token = data["data"]["jwtToken"]
                self._feed_token = smart.getfeedToken()
                self._is_authenticated = True
                expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

                async with AsyncSessionLocal() as db:
                    await db.execute(
                        update(BrokerSession)
                        .where(BrokerSession.client_code == settings.ANGELONE_CLIENT_ID)
                        .values(
                            access_token=self._access_token,
                            feed_token=self._feed_token,
                            expires_at=expires_at,
                            updated_at=datetime.now(timezone.utc),
                        )
                    )
                    await db.commit()

                logger.info("broker: Session refreshed and vaulted successfully.")
                return True

        except Exception as exc:
            logger.error(f"broker: Session refresh exception — {exc}", exc_info=True)
            return await self.authenticate()

    def get_session_status(self) -> dict:
        """Return current session state for the broker status API endpoint."""
        return {
            "is_authenticated": self._is_authenticated,
            "client_code": settings.ANGELONE_CLIENT_ID if self._is_authenticated else None,
            "has_feed_token": bool(self._feed_token),
        }

    def _ensure_authenticated(self):
        """Raise RuntimeError if not authenticated — guards all execution calls."""
        if not self._is_authenticated or not self._smart_api:
            raise RuntimeError(
                "BrokerService: Not authenticated. "
                "Call POST /api/broker/connect or wait for session refresh."
            )

    # ── Phase 4a: Portfolio — Margin & Funds ─────────────────────────────────

    def get_rms_limits(self) -> dict:
        """
        Fetch Risk Management System limits — available margin, used margin,
        net cash position from the Angel One RMS endpoint.
        """
        self._ensure_authenticated()
        try:
            data = self._smart_api.rmsLimit()
            if data.get("status"):
                rms = data.get("data", {})
                return {
                    "net": float(rms.get("net", 0)),
                    "available_cash": float(rms.get("availablecash", 0)),
                    "used_margin": float(rms.get("utilisedMargin", 0)),
                    "available_margin": float(rms.get("availableMargin", 0)),
                    "exposure_margin": float(rms.get("exposuremargin", 0)),
                }
            return {}
        except Exception as exc:
            logger.error(f"broker: rmsLimit() failed — {exc}")
            return {}

    # ── Phase 4b: Portfolio — Holdings ───────────────────────────────────────

    def get_holdings(self) -> list[dict]:
        """
        Fetch current equity holdings from the Angel One demat account.
        Returns a list of positions with symbol, quantity, P&L, and LTP.
        """
        self._ensure_authenticated()
        try:
            data = self._smart_api.holding()
            if data.get("status") and data.get("data"):
                return [
                    {
                        "symbol": h.get("tradingsymbol"),
                        "isin": h.get("isin"),
                        "quantity": int(h.get("quantity", 0)),
                        "avg_price": float(h.get("averageprice", 0)),
                        "ltp": float(h.get("ltp", 0)),
                        "pnl": float(h.get("pnl", 0)),
                        "pnl_pct": float(h.get("profitandloss", 0)),
                    }
                    for h in data["data"]
                ]
            return []
        except Exception as exc:
            logger.error(f"broker: holding() failed — {exc}")
            return []

    # ── Phase 4c: Portfolio — Open Positions ─────────────────────────────────

    def get_positions(self) -> list[dict]:
        """
        Fetch intraday open positions (MIS/NRML) from the Angel One account.
        """
        self._ensure_authenticated()
        try:
            data = self._smart_api.position()
            if data.get("status") and data.get("data"):
                return [
                    {
                        "symbol": p.get("tradingsymbol"),
                        "exchange": p.get("exchange"),
                        "product_type": p.get("producttype"),
                        "quantity": int(p.get("netqty", 0)),
                        "avg_price": float(p.get("netprice", 0)),
                        "ltp": float(p.get("ltp", 0)),
                        "pnl": float(p.get("pnl", 0)),
                        "day_change_pct": float(p.get("pricechng", 0)),
                    }
                    for p in data["data"]
                ]
            return []
        except Exception as exc:
            logger.error(f"broker: position() failed — {exc}")
            return []

    # ── Phase 4d: Portfolio — Order Book ─────────────────────────────────────

    def get_order_book(self) -> list[dict]:
        """
        Fetch today's order book — all placed, executed, and rejected orders.
        """
        self._ensure_authenticated()
        try:
            data = self._smart_api.orderBook()
            if data.get("status") and data.get("data"):
                return [
                    {
                        "order_id": o.get("orderid"),
                        "symbol": o.get("tradingsymbol"),
                        "transaction_type": o.get("transactiontype"),
                        "quantity": int(o.get("quantity", 0)),
                        "price": float(o.get("price", 0)),
                        "ltp": float(o.get("ltp", 0)),
                        "status": o.get("orderstatus"),
                        "product_type": o.get("producttype"),
                        "order_type": o.get("ordertype"),
                        "exchange": o.get("exchange"),
                        "timestamp": o.get("updatetime"),
                    }
                    for o in data["data"]
                ]
            return []
        except Exception as exc:
            logger.error(f"broker: orderBook() failed — {exc}")
            return []

    # ── Phase 3: Execution Engine ─────────────────────────────────────────────

    def place_order(
        self,
        symbol: str,
        exchange: str,
        transaction_type: str,   # "BUY" | "SELL"
        quantity: int,
        product_type: str,        # "DELIVERY" | "INTRADAY" | "MARGIN"
        order_type: str,          # "MARKET" | "LIMIT" | "STOPLOSS_LIMIT"
        price: float = 0.0,
        stop_loss_price: float = 0.0,
        tag: str = "InvestmentRadar_AI",
    ) -> dict:
        """
        Place an equity order via the Angel One execution engine.

        Args:
            symbol:            NSE trading symbol (e.g. "RELIANCE-EQ")
            exchange:          "NSE" | "BSE"
            transaction_type:  "BUY" | "SELL"
            quantity:          Number of shares
            product_type:      "DELIVERY" (CNC) | "INTRADAY" (MIS)
            order_type:        "MARKET" | "LIMIT" | "STOPLOSS_LIMIT"
            price:             Limit price (0 for MARKET orders)
            stop_loss_price:   Trigger price for stoploss orders
            tag:               Unique tag for audit trail

        Returns:
            dict with order_id on success, error message on failure.
        """
        self._ensure_authenticated()

        order_params = {
            "variety":        "NORMAL",
            "tradingsymbol":  symbol,
            "symboltoken":    self._resolve_symbol_token(symbol, exchange),
            "transactiontype": transaction_type.upper(),
            "exchange":       exchange.upper(),
            "ordertype":      order_type.upper(),
            "producttype":    product_type.upper(),
            "duration":       "DAY",
            "price":          str(price),
            "squareoff":      "0",
            "stoploss":       str(stop_loss_price),
            "quantity":       str(quantity),
            "ordertag":       tag,
        }

        try:
            logger.info(
                f"broker: Placing {transaction_type} order — "
                f"{quantity}x {symbol} @ {price} ({product_type})"
            )
            response = self._smart_api.placeOrder(order_params)

            if response.get("status"):
                order_id = response["data"]["orderid"]
                logger.info(f"broker: Order placed successfully — ID={order_id}")
                return {"success": True, "order_id": order_id, "symbol": symbol}
            else:
                msg = response.get("message", "Unknown error")
                logger.error(f"broker: Order placement failed — {msg}")
                return {"success": False, "error": msg}

        except Exception as exc:
            logger.error(f"broker: placeOrder() exception — {exc}", exc_info=True)
            return {"success": False, "error": str(exc)}

    def _resolve_symbol_token(self, symbol: str, exchange: str) -> str:
        """
        Fetch the instrument token required for order placement.
        Angel One requires symboltoken for all order API calls.
        """
        try:
            data = self._smart_api.searchScrip(exchange, symbol)
            if data.get("status") and data.get("data"):
                return data["data"][0].get("symboltoken", "")
        except Exception as exc:
            logger.warning(f"broker: Could not resolve token for {symbol}: {exc}")
        return ""

    # ── Phase 2: Live Quote Fetch ─────────────────────────────────────────────

    def get_ltp(self, symbol: str, symbol_token: str, exchange: str = "NSE") -> Optional[float]:
        """
        Fetch the Last Traded Price for a symbol using the Angel One LTP API.
        Used as a real-time price fallback when WebSocket is not active.
        """
        self._ensure_authenticated()
        try:
            data = self._smart_api.ltpData(exchange, symbol, symbol_token)
            if data.get("status"):
                return float(data["data"].get("ltp", 0))
        except Exception as exc:
            logger.error(f"broker: ltpData() failed for {symbol}: {exc}")
        return None

    # ── Phase 2b: Historical Candle Data ─────────────────────────────────────

    # Map our internal timeframe strings → Angel One interval constants
    _INTERVAL_MAP = {
        "1m":  "ONE_MINUTE",
        "5m":  "FIVE_MINUTE",
        "15m": "FIFTEEN_MINUTE",
        "30m": "THIRTY_MINUTE",
        "1h":  "ONE_HOUR",
        "1d":  "ONE_DAY",
    }

    def resolve_token_for_symbol(self, symbol: str, exchange: str = "NSE") -> str:
        """
        Public helper — resolves NSE symbol name to Angel One instrument token.
        Uses the pre-seeded token cache from market_websocket and falls back
        to searchScrip API.
        """
        # Check websocket cache first (avoids an API round-trip)
        from app.services.market_websocket import _SYMBOL_TOKEN_CACHE
        sym = symbol.upper().replace(".NS", "").replace("-EQ", "")
        if sym in _SYMBOL_TOKEN_CACHE:
            return _SYMBOL_TOKEN_CACHE[sym]
        return self._resolve_symbol_token(sym + "-EQ", exchange)

    def get_historical_candles(
        self,
        symbol: str,
        interval: str,
        from_date: datetime,
        to_date: datetime,
        exchange: str = "NSE",
    ) -> list[dict]:
        """
        Fetch historical OHLCV candles from Angel One's getCandleData API.

        Args:
            symbol:    NSE symbol without suffix, e.g. "RELIANCE"
            interval:  "1m" | "5m" | "15m" | "30m" | "1h" | "1d"
            from_date: Start datetime (IST)
            to_date:   End datetime (IST)
            exchange:  "NSE" | "BSE"

        Returns:
            List of dicts with keys: timestamp, open, high, low, close, volume
            Returns [] on failure (caller should fallback to yfinance).
        """
        if not self._is_authenticated or not self._smart_api:
            logger.debug("broker: Not authenticated — skipping getCandleData.")
            return []

        ao_interval = self._INTERVAL_MAP.get(interval)
        if not ao_interval:
            logger.warning(f"broker: Unknown interval '{interval}' — falling back to yfinance.")
            return []

        token = self.resolve_token_for_symbol(symbol, exchange)
        if not token:
            logger.warning(f"broker: Could not resolve token for {symbol} — falling back to yfinance.")
            return []

        fmt = "%Y-%m-%d %H:%M"
        params = {
            "exchange":    exchange,
            "symboltoken": token,
            "interval":    ao_interval,
            "fromdate":    from_date.strftime(fmt),
            "todate":      to_date.strftime(fmt),
        }

        try:
            logger.info(f"broker: getCandleData {symbol} {interval} {params['fromdate']} → {params['todate']}")
            response = self._smart_api.getCandleData(params)

            if not response.get("status") or not response.get("data"):
                logger.warning(f"broker: getCandleData returned no data for {symbol}: {response.get('message')}")
                return []

            candles = []
            for row in response["data"]:
                # Angel One format: [timestamp_str, open, high, low, close, volume]
                if len(row) < 6:
                    continue
                try:
                    ts_str, o, h, l, c, v = row[0], row[1], row[2], row[3], row[4], row[5]
                    # Parse Angel One ISO timestamp
                    ts = datetime.fromisoformat(ts_str)
                    # Validate OHLC integrity
                    if not (h >= o and h >= c and h >= l and l <= o and l <= c):
                        continue
                    candles.append({
                        "timestamp": ts,
                        "open":  float(o),
                        "high":  float(h),
                        "low":   float(l),
                        "close": float(c),
                        "volume": int(v),
                    })
                except Exception:
                    continue

            logger.info(f"broker: getCandleData returned {len(candles)} candles for {symbol} {interval}")
            return candles

        except Exception as exc:
            logger.error(f"broker: getCandleData exception for {symbol}: {exc}")
            return []


# ── Global singleton ──────────────────────────────────────────────────────────
broker_service = BrokerService()

