from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.database import get_db
from app.models.auth import User, Watchlist
from app.api.auth import get_current_user

router = APIRouter()


@router.get("", response_model=List[str])
async def get_watchlist(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Watchlist.symbol).where(Watchlist.user_id == current_user.id)
    )
    symbols = result.scalars().all()
    return symbols


@router.post("/{symbol}")
async def add_to_watchlist(
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    clean_sym = symbol.upper().replace(".NS", "").replace(".BO", "")
    # Check if already exists securely avoiding duplications
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.user_id == current_user.id, Watchlist.symbol == clean_sym
        )
    )
    if result.scalars().first():
        return {"status": "success", "message": f"{clean_sym} is already in watchlist."}

    new_item = Watchlist(user_id=current_user.id, symbol=clean_sym)
    db.add(new_item)
    await db.commit()
    return {"status": "success", "message": f"Added {clean_sym} to watchlist."}


@router.delete("/{symbol}")
async def remove_from_watchlist(
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    clean_sym = symbol.upper().replace(".NS", "").replace(".BO", "")
    stmt = delete(Watchlist).where(
        Watchlist.user_id == current_user.id, Watchlist.symbol == clean_sym
    )
    result = await db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Symbol not found in watchlist.")
    await db.commit()
    return {"status": "success", "message": f"Removed {clean_sym} from watchlist."}
