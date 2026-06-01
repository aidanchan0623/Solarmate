from datetime import datetime, timezone

from sqlalchemy.orm import Session

import energy
import models


def get_or_create_wallet(db: Session, user: models.User) -> models.Wallet:
    if user.wallet:
        return user.wallet
    wallet = models.Wallet(user_id=user.id, balance=0)
    db.add(wallet)
    db.flush()
    return wallet


def add_transaction(
    db: Session,
    user: models.User,
    transaction_type: str,
    amount: float,
    status: str,
    description: str,
) -> models.WalletTransaction:
    transaction = models.WalletTransaction(
        user_id=user.id,
        transaction_type=transaction_type,
        amount=energy.money(amount),
        status=status,
        description=description,
    )
    db.add(transaction)
    return transaction


def touch_wallet(wallet: models.Wallet) -> None:
    wallet.updated_at = datetime.now(timezone.utc)


def transaction_response(transaction: models.WalletTransaction) -> dict:
    user = transaction.user
    return {
        "id": transaction.id,
        "username": user.username if user else None,
        "role": user.role if user else None,
        "transaction_type": transaction.transaction_type,
        "amount": energy.money(transaction.amount),
        "status": transaction.status,
        "description": transaction.description,
        "created_at": transaction.created_at,
    }
