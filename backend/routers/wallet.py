from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

import energy
import models
import schemas
import wallet_utils
from auth import get_current_user, require_role
from database import get_db

router = APIRouter()


def wallet_response(user: models.User, wallet: models.Wallet) -> schemas.WalletResponse:
    return schemas.WalletResponse(
        username=user.username,
        role=user.role,
        balance=energy.money(wallet.balance),
        updated_at=wallet.updated_at,
    )


@router.get("", response_model=schemas.WalletResponse)
def get_wallet(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet = wallet_utils.get_or_create_wallet(db, current_user)
    db.commit()
    db.refresh(wallet)
    return wallet_response(current_user, wallet)


@router.get("/transactions", response_model=list[schemas.WalletTransactionResponse])
def get_transactions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transactions = (
        db.query(models.WalletTransaction)
        .filter(models.WalletTransaction.user_id == current_user.id)
        .order_by(models.WalletTransaction.created_at.desc(), models.WalletTransaction.id.desc())
        .limit(50)
        .all()
    )
    return [wallet_utils.transaction_response(transaction) for transaction in transactions]


@router.post("/topup", response_model=schemas.WalletActionResponse)
def topup_wallet(
    payload: schemas.WalletTopupRequest,
    current_user: models.User = Depends(require_role("consumer")),
    db: Session = Depends(get_db),
):
    wallet = wallet_utils.get_or_create_wallet(db, current_user)
    wallet.balance = energy.money(wallet.balance + payload.amount)
    wallet_utils.touch_wallet(wallet)
    transaction = wallet_utils.add_transaction(
        db,
        current_user,
        "topup",
        payload.amount,
        "successful",
        "Consumer wallet top-up",
    )
    db.commit()
    db.refresh(wallet)
    db.refresh(transaction)
    return schemas.WalletActionResponse(
        message="Top-up successful",
        balance=wallet.balance,
        transaction=wallet_utils.transaction_response(transaction),
    )


@router.post("/cashout", response_model=schemas.WalletActionResponse)
def cashout_wallet(
    payload: schemas.WalletCashoutRequest | None = None,
    current_user: models.User = Depends(require_role("prosumer")),
    db: Session = Depends(get_db),
):
    wallet = wallet_utils.get_or_create_wallet(db, current_user)
    amount = payload.amount if payload and payload.amount else wallet.balance
    if amount <= 0 or wallet.balance <= 0:
        raise HTTPException(status_code=400, detail="No balance available for cashout")
    if amount > wallet.balance:
        raise HTTPException(status_code=400, detail="Cashout amount exceeds available wallet balance")

    wallet.balance = energy.money(wallet.balance - amount)
    wallet_utils.touch_wallet(wallet)
    transaction = wallet_utils.add_transaction(
        db,
        current_user,
        "cashout",
        amount,
        "processing",
        "Prosumer cashout request",
    )
    db.commit()
    db.refresh(wallet)
    db.refresh(transaction)
    return schemas.WalletActionResponse(
        message="Cashout request submitted",
        balance=wallet.balance,
        transaction=wallet_utils.transaction_response(transaction),
    )


@router.get("/admin/transactions", response_model=list[schemas.WalletTransactionResponse])
def get_admin_transactions(
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    transactions = (
        db.query(models.WalletTransaction)
        .options(joinedload(models.WalletTransaction.user))
        .order_by(models.WalletTransaction.created_at.desc(), models.WalletTransaction.id.desc())
        .limit(12)
        .all()
    )
    return [wallet_utils.transaction_response(transaction) for transaction in transactions]
