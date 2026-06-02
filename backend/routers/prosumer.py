from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import energy
import meter_utils
import models
import schemas
import simulation
from auth import get_current_user, require_role
from database import get_db

router = APIRouter()

PLAN_NAMES = {
    100: "Starter Export",
    300: "Standard Export",
    500: "Premium Export",
}


def profile_response(user: models.User) -> schemas.ProsumerProfileResponse:
    profile = user.prosumer_profile
    return schemas.ProsumerProfileResponse(
        username=user.username,
        email=user.email,
        display_name=profile.display_name,
        selected_export_plan=profile.selected_export_plan,
        export_commitment_kwh=profile.export_commitment_kwh,
        buyback_rate=profile.buyback_rate,
        cashout_balance=profile.cashout_balance,
        device_id=profile.device_id,
        has_completed_onboarding=user.has_completed_onboarding,
    )


def daily_response(record: models.ProsumerDailyExport) -> schemas.ProsumerDailyExportResponse:
    return schemas.ProsumerDailyExportResponse(
        date=record.date,
        generated_kwh=energy.kwh(record.generated_kwh),
        local_consumption_kwh=energy.kwh(record.local_consumption_kwh),
        exported_kwh=energy.kwh(record.exported_kwh),
    )


def monthly_rows(user: models.User, db: Session) -> list[schemas.ProsumerMonthlyExportResponse]:
    simulation.ensure_prosumer_records(user, db)
    records = (
        db.query(models.ProsumerDailyExport)
        .filter(
            models.ProsumerDailyExport.user_id == user.id,
            models.ProsumerDailyExport.date <= energy.today_key(),
        )
        .order_by(models.ProsumerDailyExport.date.asc())
        .all()
    )
    quota = user.prosumer_profile.export_commitment_kwh or 0
    grouped = energy.group_records_by_month(records)
    rows = []
    for key in sorted(grouped):
        month_records = grouped[key]
        generated = sum(record.generated_kwh for record in month_records)
        local = sum(record.local_consumption_kwh for record in month_records)
        exported = sum(record.exported_kwh for record in month_records)
        split = energy.split_prosumer_export(exported, quota)
        rows.append(
            schemas.ProsumerMonthlyExportResponse(
                month=energy.month_label(key),
                month_key=key,
                generated_kwh=energy.kwh(generated),
                local_consumption_kwh=energy.kwh(local),
                actual_exported_kwh=energy.kwh(exported),
                status="Pending" if key == max(grouped) else "Settled",
                **split,
            )
        )
    return rows


def selected_month_row(
    user: models.User,
    db: Session,
    month: str | None = None,
) -> schemas.ProsumerMonthlyExportResponse | None:
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


def wallet_response(
    user: models.User,
    row: schemas.ProsumerMonthlyExportResponse,
) -> schemas.ProsumerWalletResponse:
    profile = user.prosumer_profile
    return schemas.ProsumerWalletResponse(
        username=user.username,
        display_name=profile.display_name,
        selected_export_plan=profile.selected_export_plan,
        export_commitment_kwh=profile.export_commitment_kwh,
        month=row.month,
        actual_exported_kwh=row.actual_exported_kwh,
        solar_mate_kwh=row.solar_mate_kwh,
        solar_atap_kwh=row.solar_atap_kwh,
        solar_mate_earnings=row.solar_mate_earnings,
        solar_atap_earnings=row.solar_atap_earnings,
        total_earnings_this_month=row.total_earnings,
        available_balance=row.total_earnings,
        pending_settlement=row.solar_atap_earnings,
        last_cashout_date=energy.malaysia_datetime_for_day(days_ago=1, hour=13, minute=20).strftime("%d %B %Y"),
        cashout_status="Available",
        settlement_status=row.status,
        uplift_percentage=energy.prosumer_uplift_percentage(),
    )


@router.get("/profile", response_model=schemas.ProsumerProfileResponse)
def get_profile(current_user: models.User = Depends(require_role("prosumer"))):
    return profile_response(current_user)


@router.get("/daily-export", response_model=list[schemas.ProsumerDailyExportResponse])
def get_daily_export(
    month: str | None = None,
    limit: int | None = 7,
    current_user: models.User = Depends(require_role("prosumer")),
    db: Session = Depends(get_db),
):
    simulation.ensure_prosumer_records(current_user, db)
    query = db.query(models.ProsumerDailyExport).filter(
        models.ProsumerDailyExport.user_id == current_user.id,
        models.ProsumerDailyExport.date <= energy.today_key(),
    )
    if month:
        query = query.filter(models.ProsumerDailyExport.date.like(f"{month}-%"))
        records = query.order_by(models.ProsumerDailyExport.date.asc()).all()
    else:
        records = query.order_by(models.ProsumerDailyExport.date.desc()).limit(limit or 7).all()
        records = list(reversed(records))
    return [daily_response(record) for record in records]


@router.get("/monthly-export-history", response_model=list[schemas.ProsumerMonthlyExportResponse])
def get_monthly_export_history(
    current_user: models.User = Depends(require_role("prosumer")),
    db: Session = Depends(get_db),
):
    return monthly_rows(current_user, db)


@router.get("/wallet", response_model=schemas.ProsumerWalletResponse)
def get_wallet(
    current_user: models.User = Depends(require_role("prosumer")),
    db: Session = Depends(get_db),
):
    row = selected_month_row(current_user, db)
    if not row:
        raise HTTPException(status_code=404, detail="No prosumer export records available")
    return wallet_response(current_user, row)


@router.get("/statement", response_model=schemas.ProsumerStatementResponse)
def get_statement(
    month: str | None = None,
    current_user: models.User = Depends(require_role("prosumer")),
    db: Session = Depends(get_db),
):
    row = selected_month_row(current_user, db, month)
    if not row:
        raise HTTPException(status_code=404, detail="No prosumer export records available")
    wallet = wallet_response(current_user, row).model_dump()
    return schemas.ProsumerStatementResponse(
        **wallet,
        solar_mate_rate=energy.PROSUMER_BUYBACK_RATE,
        solar_atap_rate=energy.SOLAR_ATAP_REFERENCE_RATE,
        note="This is a prototype monthly export statement. No real settlement has been processed.",
    )


@router.get("/esp-live", response_model=schemas.ProsumerEspLiveResponse)
def get_esp_live(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "prosumer":
        profile = current_user.prosumer_profile
        if not profile or profile.device_id != meter_utils.ESP_DEVICE_ID:
            raise HTTPException(status_code=403, detail="ESP live data is only available for the ESP32 prosumer account")
        return meter_utils.esp_live_data(db, profile.device_id)

    if current_user.role == "admin":
        return meter_utils.esp_live_data(db, meter_utils.ESP_DEVICE_ID)

    raise HTTPException(status_code=403, detail="Insufficient permissions")


@router.get("/overview", response_model=schemas.ProsumerOverviewResponse)
def get_overview(
    current_user: models.User = Depends(require_role("prosumer")),
    db: Session = Depends(get_db),
):
    rows = monthly_rows(current_user, db)
    latest = rows[-1] if rows else None
    profile = current_user.prosumer_profile
    if not latest:
        split = energy.split_prosumer_export(0, profile.export_commitment_kwh or 0)
        return schemas.ProsumerOverviewResponse(
            username=current_user.username,
            display_name=profile.display_name,
            selected_export_plan=profile.selected_export_plan,
            export_commitment_kwh=profile.export_commitment_kwh,
            month="No records",
            generated_kwh=0,
            local_consumption_kwh=0,
            exported_kwh=0,
            current_day_of_month=energy.current_day_of_month(),
            days_in_month=energy.days_in_month(),
            month_progress_percentage=energy.current_month_progress_percentage(),
            quota_progress_percentage=0,
            **split,
        )
    quota = profile.export_commitment_kwh or 0
    quota_progress = min((latest.actual_exported_kwh / quota) * 100, 100) if quota > 0 else 0
    return schemas.ProsumerOverviewResponse(
        username=current_user.username,
        display_name=profile.display_name,
        selected_export_plan=profile.selected_export_plan,
        export_commitment_kwh=profile.export_commitment_kwh,
        month=latest.month,
        generated_kwh=latest.generated_kwh,
        local_consumption_kwh=latest.local_consumption_kwh,
        exported_kwh=latest.actual_exported_kwh,
        solar_mate_kwh=latest.solar_mate_kwh,
        solar_atap_kwh=latest.solar_atap_kwh,
        solar_mate_earnings=latest.solar_mate_earnings,
        solar_atap_earnings=latest.solar_atap_earnings,
        total_earnings=latest.total_earnings,
        current_day_of_month=energy.current_day_of_month(),
        days_in_month=energy.days_in_month(),
        month_progress_percentage=energy.current_month_progress_percentage(),
        quota_progress_percentage=round(quota_progress, 2),
    )


@router.post("/select-plan", response_model=schemas.ProsumerProfileResponse)
def select_plan(
    payload: schemas.SelectProsumerPlanRequest,
    current_user: models.User = Depends(require_role("prosumer")),
    db: Session = Depends(get_db),
):
    expected_name = PLAN_NAMES[payload.export_commitment_kwh]
    if payload.selected_export_plan != expected_name:
        raise HTTPException(status_code=400, detail=f"Plan name must be {expected_name}")

    profile = current_user.prosumer_profile
    profile.selected_export_plan = payload.selected_export_plan
    profile.export_commitment_kwh = payload.export_commitment_kwh
    current_user.has_completed_onboarding = True
    db.commit()
    db.refresh(current_user)
    simulation.ensure_prosumer_records(current_user, db)
    return profile_response(current_user)
