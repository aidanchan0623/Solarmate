from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import energy
import models
import schemas
import simulation
import wallet_utils
from auth import require_role
from database import get_db

router = APIRouter()

PACKAGE_NAMES = {
    300: "Lite Business",
    1000: "Business",
    2000: "Business Plus",
}

SUPPLY_ERROR = (
    "Not enough verified SolarMate supply available for this package. "
    "Please choose a smaller package or try again later."
)


def profile_response(user: models.User) -> schemas.ConsumerProfileResponse:
    profile = user.consumer_profile
    return schemas.ConsumerProfileResponse(
        username=user.username,
        email=user.email,
        business_name=profile.business_name,
        business_type=profile.business_type,
        selected_package=profile.selected_package,
        package_allocation_kwh=profile.package_allocation_kwh,
        has_completed_onboarding=user.has_completed_onboarding,
    )


def daily_response(record: models.ConsumerDailyUsage) -> schemas.ConsumerDailyUsageResponse:
    return schemas.ConsumerDailyUsageResponse(
        date=record.date,
        total_usage_kwh=energy.kwh(record.total_usage_kwh),
        green_credit_kwh=energy.kwh(record.green_credit_kwh),
        tnb_import_kwh=energy.kwh(record.tnb_import_kwh),
    )


def monthly_rows(user: models.User, db: Session) -> list[schemas.ConsumerMonthlyUsageResponse]:
    simulation.ensure_consumer_records(user, db)
    records = (
        db.query(models.ConsumerDailyUsage)
        .filter(models.ConsumerDailyUsage.user_id == user.id)
        .order_by(models.ConsumerDailyUsage.date.asc())
        .all()
    )
    grouped = energy.group_records_by_month(records)
    rows = []
    for key in sorted(grouped):
        month_records = grouped[key]
        total_usage = sum(record.total_usage_kwh for record in month_records)
        green_credit = sum(record.green_credit_kwh for record in month_records)
        bill = energy.calculate_consumer_bill(total_usage, green_credit)
        status = payment_status_for_month(user, db, energy.month_label(key))
        rows.append(
            schemas.ConsumerMonthlyUsageResponse(
                month=energy.month_label(key),
                month_key=key,
                payment_status=status if key == max(grouped) else "Paid",
                **bill,
            )
        )
    return rows


def payment_status_for_month(user: models.User, db: Session, month: str) -> str:
    paid = (
        db.query(models.WalletTransaction)
        .filter(
            models.WalletTransaction.user_id == user.id,
            models.WalletTransaction.transaction_type == "bill_payment",
            models.WalletTransaction.status == "successful",
            models.WalletTransaction.description.like(f"%{month}%"),
        )
        .first()
        is not None
    )
    return "Paid" if paid else "Pending"


def selected_month_row(
    user: models.User,
    db: Session,
    month: str | None = None,
) -> schemas.ConsumerMonthlyUsageResponse | None:
    rows = monthly_rows(user, db)
    if not rows:
        return None
    if not month:
        return rows[-1]
    normalized = month.strip().lower()
    for row in rows:
        if row.month_key.lower() == normalized or row.month.lower() == normalized:
            return row
    return rows[-1]


def usage_status(utilisation_percentage: float) -> str:
    if utilisation_percentage >= 100:
        return "Package fully used - TNB fallback active"
    if utilisation_percentage >= 90:
        return "Almost fully used"
    if utilisation_percentage >= 50:
        return "Good utilisation"
    return "Green credit available"


def wallet_response(
    user: models.User,
    row: schemas.ConsumerMonthlyUsageResponse,
) -> schemas.ConsumerWalletResponse:
    profile = user.consumer_profile
    allocation = profile.package_allocation_kwh or 0
    remaining = max(allocation - row.green_credit_kwh, 0)
    utilisation = round((row.green_credit_kwh / allocation) * 100, 2) if allocation > 0 else 0
    return schemas.ConsumerWalletResponse(
        username=user.username,
        business_name=profile.business_name,
        business_type=profile.business_type,
        selected_package=profile.selected_package,
        package_allocation_kwh=allocation,
        month=row.month,
        total_usage_kwh=row.total_usage_kwh,
        green_credit_kwh=row.green_credit_kwh,
        green_credit_remaining_kwh=energy.kwh(remaining),
        tnb_import_kwh=row.tnb_import_kwh,
        utilisation_percentage=utilisation,
        total_bill=row.total_bill,
        savings=row.savings,
        actual_saving_percentage=row.actual_saving_percentage,
        rate_discount_percentage=energy.consumer_rate_discount_percentage(),
        payment_status=row.payment_status,
        usage_status=usage_status(utilisation),
    )


def total_active_prosumer_supply(db: Session) -> int:
    profiles = (
        db.query(models.ProsumerProfile)
        .join(models.User)
        .filter(
            models.User.role == "prosumer",
            models.User.status == "active",
            models.User.has_completed_onboarding.is_(True),
        )
        .all()
    )
    return sum(profile.export_commitment_kwh or 0 for profile in profiles)


def total_active_consumer_demand_excluding(db: Session, user_id: int) -> int:
    profiles = (
        db.query(models.ConsumerProfile)
        .join(models.User)
        .filter(
            models.User.role == "consumer",
            models.User.status == "active",
            models.User.has_completed_onboarding.is_(True),
            models.User.id != user_id,
        )
        .all()
    )
    return sum(profile.package_allocation_kwh or 0 for profile in profiles)


@router.get("/profile", response_model=schemas.ConsumerProfileResponse)
def get_profile(current_user: models.User = Depends(require_role("consumer"))):
    return profile_response(current_user)


@router.get("/live-meter", response_model=schemas.ConsumerLiveMeterResponse)
def get_live_meter(
    limit: int | None = 7,
    current_user: models.User = Depends(require_role("consumer")),
    db: Session = Depends(get_db),
):
    simulation.ensure_consumer_records(current_user, db)
    records = (
        db.query(models.ConsumerDailyUsage)
        .filter(models.ConsumerDailyUsage.user_id == current_user.id)
        .order_by(models.ConsumerDailyUsage.date.desc())
        .limit(limit or 7)
        .all()
    )
    records = list(reversed(records))
    latest = records[-1] if records else None
    return schemas.ConsumerLiveMeterResponse(
        current_load_power=round((latest.total_usage_kwh / 10), 2) if latest else 0,
        energy_used_today=energy.kwh(latest.total_usage_kwh if latest else 0),
        green_credit_used_today=energy.kwh(latest.green_credit_kwh if latest else 0),
        tnb_import_today=energy.kwh(latest.tnb_import_kwh if latest else 0),
        smart_meter_status="Online",
        last_updated="Latest seeded meter record",
        records=[daily_response(record) for record in records],
    )


@router.get("/monthly-usage-history", response_model=list[schemas.ConsumerMonthlyUsageResponse])
def get_monthly_usage_history(
    current_user: models.User = Depends(require_role("consumer")),
    db: Session = Depends(get_db),
):
    return monthly_rows(current_user, db)


@router.get("/overview", response_model=schemas.ConsumerOverviewResponse)
def get_overview(
    current_user: models.User = Depends(require_role("consumer")),
    db: Session = Depends(get_db),
):
    rows = monthly_rows(current_user, db)
    latest = rows[-1] if rows else None
    profile = current_user.consumer_profile
    if not latest:
        bill = energy.calculate_consumer_bill(0, 0)
        return schemas.ConsumerOverviewResponse(
            username=current_user.username,
            business_name=profile.business_name,
            business_type=profile.business_type,
            selected_package=profile.selected_package,
            package_allocation_kwh=profile.package_allocation_kwh,
            month="No records",
            **bill,
        )
    return schemas.ConsumerOverviewResponse(
        username=current_user.username,
        business_name=profile.business_name,
        business_type=profile.business_type,
        selected_package=profile.selected_package,
        package_allocation_kwh=profile.package_allocation_kwh,
        month=latest.month,
        total_usage_kwh=latest.total_usage_kwh,
        green_credit_kwh=latest.green_credit_kwh,
        tnb_import_kwh=latest.tnb_import_kwh,
        total_bill=latest.total_bill,
        savings=latest.savings,
        actual_saving_percentage=latest.actual_saving_percentage,
    )


@router.get("/billing", response_model=schemas.ConsumerBillingResponse)
def get_billing(
    current_user: models.User = Depends(require_role("consumer")),
    db: Session = Depends(get_db),
):
    rows = monthly_rows(current_user, db)
    latest = rows[-1] if rows else None
    if not latest:
        return schemas.ConsumerBillingResponse(
            month="No records",
            payment_status="Pending",
            **energy.calculate_consumer_bill(0, 0),
        )
    return schemas.ConsumerBillingResponse(
        month=latest.month,
        total_usage_kwh=latest.total_usage_kwh,
        green_credit_kwh=latest.green_credit_kwh,
        tnb_import_kwh=latest.tnb_import_kwh,
        solar_mate_amount=latest.solar_mate_amount,
        tnb_import_amount=latest.tnb_import_amount,
        retail_charge=latest.retail_charge,
        total_bill=latest.total_bill,
        tnb_only_bill=latest.tnb_only_bill,
        savings=latest.savings,
        actual_saving_percentage=latest.actual_saving_percentage,
        payment_status=latest.payment_status,
    )


@router.post("/pay-bill", response_model=schemas.ConsumerPayBillResponse)
def pay_bill(
    current_user: models.User = Depends(require_role("consumer")),
    db: Session = Depends(get_db),
):
    row = selected_month_row(current_user, db)
    if not row:
        raise HTTPException(status_code=404, detail="No bill available for payment")
    if row.payment_status == "Paid":
        wallet = wallet_utils.get_or_create_wallet(db, current_user)
        transaction = wallet_utils.add_transaction(
            db,
            current_user,
            "bill_payment",
            0,
            "duplicate",
            f"Bill for {row.month} was already paid",
        )
        db.commit()
        db.refresh(wallet)
        db.refresh(transaction)
        return schemas.ConsumerPayBillResponse(
            message="Bill already paid",
            payment_status="Paid",
            balance=wallet.balance,
            total_bill=row.total_bill,
            transaction=wallet_utils.transaction_response(transaction),
        )

    wallet = wallet_utils.get_or_create_wallet(db, current_user)
    if wallet.balance < row.total_bill:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance. Please top up before paying your bill.")

    wallet.balance = energy.money(wallet.balance - row.total_bill)
    wallet_utils.touch_wallet(wallet)
    transaction = wallet_utils.add_transaction(
        db,
        current_user,
        "bill_payment",
        row.total_bill,
        "successful",
        f"Blended energy bill payment for {row.month}",
    )
    db.commit()
    db.refresh(wallet)
    db.refresh(transaction)
    return schemas.ConsumerPayBillResponse(
        message="Bill paid successfully",
        payment_status="Paid",
        balance=wallet.balance,
        total_bill=row.total_bill,
        transaction=wallet_utils.transaction_response(transaction),
    )


@router.get("/wallet", response_model=schemas.ConsumerWalletResponse)
def get_wallet(
    current_user: models.User = Depends(require_role("consumer")),
    db: Session = Depends(get_db),
):
    row = selected_month_row(current_user, db)
    if not row:
        raise HTTPException(status_code=404, detail="No consumer usage records available")
    return wallet_response(current_user, row)


@router.get("/statement", response_model=schemas.ConsumerStatementResponse)
def get_statement(
    month: str | None = None,
    current_user: models.User = Depends(require_role("consumer")),
    db: Session = Depends(get_db),
):
    row = selected_month_row(current_user, db, month)
    if not row:
        raise HTTPException(status_code=404, detail="No consumer usage records available")
    wallet = wallet_response(current_user, row).model_dump()
    return schemas.ConsumerStatementResponse(
        **wallet,
        solar_mate_rate=energy.SOLARMATE_RATE,
        tnb_peak_rate=energy.TNB_PEAK_TOTAL_RATE,
        retail_charge=energy.TNB_RETAIL_CHARGE,
        note="This is a prototype bill statement. It is not an official TNB bill.",
    )


@router.post("/select-package", response_model=schemas.ConsumerProfileResponse)
def select_package(
    payload: schemas.SelectConsumerPackageRequest,
    current_user: models.User = Depends(require_role("consumer")),
    db: Session = Depends(get_db),
):
    expected_name = PACKAGE_NAMES[payload.package_allocation_kwh]
    if payload.selected_package != expected_name:
        raise HTTPException(status_code=400, detail=f"Package name must be {expected_name}")

    total_supply = total_active_prosumer_supply(db)
    projected_demand = (
        total_active_consumer_demand_excluding(db, current_user.id)
        + payload.package_allocation_kwh
    )
    if projected_demand > total_supply:
        raise HTTPException(status_code=400, detail=SUPPLY_ERROR)

    profile = current_user.consumer_profile
    profile.selected_package = payload.selected_package
    profile.package_allocation_kwh = payload.package_allocation_kwh
    current_user.has_completed_onboarding = True
    db.commit()
    db.refresh(current_user)
    simulation.ensure_consumer_records(current_user, db)
    return profile_response(current_user)
