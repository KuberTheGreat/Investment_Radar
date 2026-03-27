"""
Broker API Router — Angel One SmartAPI endpoints.

Provides HTTP interface for:
  POST /api/broker/connect      : Authenticate and vault session tokens
  GET  /api/broker/status       : Current session state
  POST /api/broker/refresh      : Force session token refresh
  GET  /api/broker/portfolio    : Holdings + RMS margin summary
  GET  /api/broker/positions    : Intraday open positions
  GET  /api/broker/orders       : Today's order book
  GET  /api/broker/ltp/{symbol} : Live LTP for a symbol
  POST /api/broker/order        : Place an equity order
"""
import logging
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional

from app.services.broker_service import broker_service

logger = logging.getLogger("investorradar.broker.api")
router = APIRouter()


# ── Request / Response schemas ────────────────────────────────────────────────

class OrderRequest(BaseModel):
    """Schema for placing an equity order via the execution engine."""
    symbol: str = Field(..., description="NSE trading symbol, e.g. RELIANCE-EQ")
    exchange: str = Field("NSE", description="NSE | BSE")
    transaction_type: str = Field(..., description="BUY | SELL")
    quantity: int = Field(..., gt=0, description="Number of shares")
    product_type: str = Field("DELIVERY", description="DELIVERY (CNC) | INTRADAY (MIS)")
    order_type: str = Field("MARKET", description="MARKET | LIMIT | STOPLOSS_LIMIT")
    price: float = Field(0.0, description="Limit price (0 for MARKET orders)")
    stop_loss_price: float = Field(0.0, description="Trigger price for stoploss orders")
    tag: str = Field("InvestmentRadar_AI", description="Audit tag attached to the order")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/connect", summary="Authenticate Angel One SmartAPI session")
async def broker_connect():
    """
    Initiates a new SmartAPI session using the credentials
    configured in ANGELONE_CLIENT_ID, ANGELONE_PASSWORD, and ANGELONE_TOTP_KEY.
    Tokens are persisted to the broker_sessions Postgres table.
    """
    success = await broker_service.authenticate()
    if not success:
        raise HTTPException(
            status_code=503,
            detail=(
                "Angel One authentication failed. "
                "Ensure ANGELONE_CLIENT_ID, ANGELONE_PASSWORD, and ANGELONE_TOTP_KEY "
                "are correctly set in your .env file."
            ),
        )
    return {"status": "connected", "message": "Angel One session established and vaulted."}


@router.get("/status", summary="Angel One session status")
async def broker_status():
    """Returns whether the broker session is currently active and authenticated."""
    return broker_service.get_session_status()


@router.post("/refresh", summary="Force session token refresh")
async def broker_refresh():
    """
    Force a session token refresh using the stored refresh token.
    Normally called automatically by the daily APScheduler job.
    """
    success = await broker_service.refresh_session()
    if not success:
        raise HTTPException(status_code=503, detail="Session refresh failed.")
    return {"status": "refreshed", "message": "Access token refreshed successfully."}


@router.get("/portfolio", summary="Holdings + margin summary")
async def broker_portfolio():
    """
    Returns equity holdings and RMS margin available from the Angel One account.
    Useful for powering the Profile page P&L dashboard.
    """
    try:
        holdings = broker_service.get_holdings()
        rms = broker_service.get_rms_limits()
        return {
            "holdings": holdings,
            "total_holdings": len(holdings),
            "estimated_value": sum(h["ltp"] * h["quantity"] for h in holdings),
            "total_pnl": sum(h["pnl"] for h in holdings),
            "rms": rms,
        }
    except RuntimeError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as exc:
        logger.error(f"broker: /portfolio error — {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch portfolio data.")


@router.get("/positions", summary="Intraday open positions")
async def broker_positions():
    """Returns all active intraday positions from the Angel One account."""
    try:
        positions = broker_service.get_positions()
        return {
            "positions": positions,
            "total_open": len(positions),
            "total_pnl": sum(p["pnl"] for p in positions),
        }
    except RuntimeError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as exc:
        logger.error(f"broker: /positions error — {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch positions.")


@router.get("/orders", summary="Today's order book")
async def broker_orders():
    """Returns all placed, executed, and rejected orders for the current trading day."""
    try:
        orders = broker_service.get_order_book()
        return {"orders": orders, "total_orders": len(orders)}
    except RuntimeError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as exc:
        logger.error(f"broker: /orders error — {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch order book.")


@router.get("/ltp/{symbol}", summary="Live Last Traded Price")
async def broker_ltp(
    symbol: str,
    symbol_token: str = Query(..., description="Angel One instrument token"),
    exchange: str = Query("NSE", description="NSE | BSE"),
):
    """
    Fetch the real-time Last Traded Price for a given symbol via the Angel One API.
    Requires the instrument symboltoken (obtainable from /searchScrip).
    """
    try:
        ltp = broker_service.get_ltp(symbol, symbol_token, exchange)
        if ltp is None:
            raise HTTPException(status_code=404, detail=f"LTP not available for {symbol}.")
        return {"symbol": symbol, "ltp": ltp, "exchange": exchange}
    except RuntimeError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/order", summary="Place an equity order")
async def broker_place_order(request: OrderRequest):
    """
    Executes an equity order on your Angel One brokerage account.
    Called automatically by the AI confluence engine on High Confluence signals,
    or manually from the frontend trading panel.

    ⚠️  USE WITH CAUTION — places REAL orders on live markets.
    """
    try:
        result = broker_service.place_order(
            symbol=request.symbol,
            exchange=request.exchange,
            transaction_type=request.transaction_type,
            quantity=request.quantity,
            product_type=request.product_type,
            order_type=request.order_type,
            price=request.price,
            stop_loss_price=request.stop_loss_price,
            tag=request.tag,
        )
        if not result.get("success"):
            raise HTTPException(status_code=422, detail=result.get("error", "Order failed."))
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"broker: /order error — {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Order placement failed unexpectedly.")
