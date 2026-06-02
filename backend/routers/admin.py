from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

import energy as energy_utils
import meter_utils
import models
import platform_summary
import schemas
from auth import require_role
from database import get_db

router = APIRouter()

PROSUMER_BUYBACK_RATE = 0.33
GRID_TOLL_RATE = 0.09
PLATFORM_SPREAD_RATE = 0.01
SOLARMATE_RATE = 0.43
TNB_PEAK_TOTAL_RATE = 0.5217


def selected_plan_package(user: models.User) -> str | None:
    if user.role == "prosumer" and user.prosumer_profile:
        plan = user.prosumer_profile.selected_export_plan
        commitment = user.prosumer_profile.export_commitment_kwh
        if plan and commitment:
            return f"{plan} ({commitment} kWh/month)"
        return plan
    if user.role == "consumer" and user.consumer_profile:
        package = user.consumer_profile.selected_package
        allocation = user.consumer_profile.package_allocation_kwh
        if package and allocation:
            return f"{package} ({allocation} kWh/month)"
        return package
    return None


def admin_user_response(user: models.User, db: Session | None = None) -> schemas.AdminUserResponse:
    device_id = user.prosumer_profile.device_id if user.role == "prosumer" and user.prosumer_profile else None
    device_status = None
    if device_id and db:
        device_status = meter_utils.reading_status(meter_utils.latest_reading(db, device_id))
    return schemas.AdminUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        status=user.status,
        has_completed_onboarding=user.has_completed_onboarding,
        selected_plan_package=selected_plan_package(user),
        device_id=device_id,
        device_status=device_status,
        created_at=user.created_at,
    )


def currency(value: float) -> float:
    return round(float(value or 0), 2)


def energy(value: float) -> float:
    return round(float(value or 0), 1)


def count_users(db: Session) -> dict:
    return {
        "total_users": db.query(func.count(models.User.id)).scalar() or 0,
        "total_prosumers": db.query(func.count(models.User.id)).filter(models.User.role == "prosumer").scalar() or 0,
        "total_consumers": db.query(func.count(models.User.id)).filter(models.User.role == "consumer").scalar() or 0,
        "active_users": db.query(func.count(models.User.id)).filter(models.User.status == "active").scalar() or 0,
        "disabled_users": db.query(func.count(models.User.id)).filter(models.User.status == "disabled").scalar() or 0,
        "completed_onboarding_users": db.query(func.count(models.User.id)).filter(
            models.User.has_completed_onboarding.is_(True)
        ).scalar() or 0,
        "pending_onboarding_users": db.query(func.count(models.User.id)).filter(
            models.User.has_completed_onboarding.is_(False)
        ).scalar() or 0,
    }


def latest_platform_summary(db: Session) -> models.PlatformMonthlySummary | None:
    return (
        db.query(models.PlatformMonthlySummary)
        .order_by(models.PlatformMonthlySummary.month_key.desc())
        .first()
    )


def summary_response(summary: models.PlatformMonthlySummary) -> schemas.AdminMonthlyExportRecordResponse:
    return schemas.AdminMonthlyExportRecordResponse(
        month=summary.month,
        month_key=summary.month_key,
        prosumer_supply_kwh=summary.total_prosumer_supply_kwh,
        consumer_demand_kwh=summary.total_consumer_demand_kwh,
        matched_energy_kwh=summary.matched_energy_kwh,
        unmatched_supply_kwh=summary.unmatched_supply_kwh,
        unmatched_demand_kwh=summary.unmatched_demand_kwh,
        sold_to_solarmate_kwh=summary.matched_energy_kwh,
        solar_atap_excess_kwh=summary.unmatched_supply_kwh,
        total_prosumer_payout=summary.prosumer_payout,
        solar_mate_revenue=summary.solarmate_revenue,
        consumer_savings=summary.consumer_savings,
        status=summary.status,
    )


def fast_allocation_fallback(db: Session) -> dict:
    supply = (
        db.query(func.sum(models.ProsumerProfile.export_commitment_kwh))
        .join(models.User, models.User.id == models.ProsumerProfile.user_id)
        .filter(
            models.User.role == "prosumer",
            models.User.status == "active",
            models.User.has_completed_onboarding.is_(True),
        )
        .scalar()
        or 0
    )
    demand = (
        db.query(func.sum(models.ConsumerProfile.package_allocation_kwh))
        .join(models.User, models.User.id == models.ConsumerProfile.user_id)
        .filter(
            models.User.role == "consumer",
            models.User.status == "active",
            models.User.has_completed_onboarding.is_(True),
        )
        .scalar()
        or 0
    )
    matched = min(float(supply), float(demand))
    unmatched_supply = max(float(supply) - float(demand), 0)
    unmatched_demand = max(float(demand) - float(supply), 0)
    return {
        "total_prosumer_supply_kwh": energy(float(supply)),
        "total_consumer_demand_kwh": energy(float(demand)),
        "matched_energy_kwh": energy(matched),
        "unmatched_supply_kwh": energy(unmatched_supply),
        "unmatched_demand_kwh": energy(unmatched_demand),
        "matching_rate": (matched / float(supply)) * 100 if float(supply) > 0 else 0,
        "solarmate_revenue": currency(matched * PLATFORM_SPREAD_RATE),
        "consumer_savings": currency(matched * (TNB_PEAK_TOTAL_RATE - SOLARMATE_RATE)),
        "prosumer_payout": currency(
            matched * PROSUMER_BUYBACK_RATE + unmatched_supply * energy_utils.SOLAR_ATAP_REFERENCE_RATE
        ),
        "grid_toll": currency(matched * GRID_TOLL_RATE),
    }


@router.get("/overview", response_model=schemas.AdminOverviewResponse)
def get_overview(
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    platform_summary.refresh_current_month_summary(db)
    db.commit()
    counts = count_users(db)
    summary = latest_platform_summary(db)
    metrics = {
        "total_prosumer_supply_kwh": summary.total_prosumer_supply_kwh if summary else None,
        "total_consumer_demand_kwh": summary.total_consumer_demand_kwh if summary else None,
        "matched_energy_kwh": summary.matched_energy_kwh if summary else None,
        "unmatched_supply_kwh": summary.unmatched_supply_kwh if summary else None,
        "unmatched_demand_kwh": summary.unmatched_demand_kwh if summary else None,
        "matching_rate": summary.matching_rate if summary else None,
        "solarmate_revenue": summary.solarmate_revenue if summary else None,
        "consumer_savings": summary.consumer_savings if summary else None,
        "prosumer_payout": summary.prosumer_payout if summary else None,
        "grid_toll": summary.grid_toll if summary else None,
    }
    if not summary:
        metrics = fast_allocation_fallback(db)

    return schemas.AdminOverviewResponse(
        total_users=counts["total_users"],
        total_prosumers=counts["total_prosumers"],
        total_consumers=counts["total_consumers"],
        active_users=counts["active_users"],
        disabled_users=counts["disabled_users"],
        completed_onboarding_users=counts["completed_onboarding_users"],
        pending_onboarding_users=counts["pending_onboarding_users"],
        total_export_commitment=energy(metrics["total_prosumer_supply_kwh"]),
        matched_green_energy=energy(metrics["matched_energy_kwh"]),
        matching_rate=metrics["matching_rate"],
        total_consumer_demand=energy(metrics["total_consumer_demand_kwh"]),
        unmatched_supply=energy(metrics["unmatched_supply_kwh"]),
        unmatched_demand=energy(metrics["unmatched_demand_kwh"]),
        tnb_imported_energy=energy(metrics["unmatched_demand_kwh"]),
        solar_mate_revenue=currency(metrics["solarmate_revenue"]),
        prosumer_payout=currency(metrics["prosumer_payout"]),
        grid_toll=currency(metrics["grid_toll"]),
        consumer_rate_based_savings=currency(metrics["consumer_savings"]),
        current_day_of_month=energy_utils.current_day_of_month(),
        days_in_month=energy_utils.days_in_month(),
        month_progress_percentage=energy_utils.current_month_progress_percentage(),
    )


@router.get("/users", response_model=list[schemas.AdminUserResponse])
def get_users(
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    users = (
        db.query(models.User)
        .options(joinedload(models.User.prosumer_profile), joinedload(models.User.consumer_profile))
        .order_by(models.User.created_at.desc())
        .all()
    )
    return [admin_user_response(user, db) for user in users]


@router.get("/monthly-export-records", response_model=list[schemas.AdminMonthlyExportRecordResponse])
def get_monthly_export_records(
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    platform_summary.refresh_platform_monthly_summaries(db)
    db.commit()
    summaries = (
        db.query(models.PlatformMonthlySummary)
        .order_by(models.PlatformMonthlySummary.month_key.asc())
        .all()
    )
    if summaries:
        return [summary_response(summary) for summary in summaries]

    fallback = fast_allocation_fallback(db)
    return [
        schemas.AdminMonthlyExportRecordResponse(
            month="Current Month",
            month_key="current",
            prosumer_supply_kwh=fallback["total_prosumer_supply_kwh"],
            consumer_demand_kwh=fallback["total_consumer_demand_kwh"],
            matched_energy_kwh=fallback["matched_energy_kwh"],
            unmatched_supply_kwh=fallback["unmatched_supply_kwh"],
            unmatched_demand_kwh=fallback["unmatched_demand_kwh"],
            sold_to_solarmate_kwh=fallback["matched_energy_kwh"],
            solar_atap_excess_kwh=fallback["unmatched_supply_kwh"],
            total_prosumer_payout=fallback["prosumer_payout"],
            solar_mate_revenue=fallback["solarmate_revenue"],
            consumer_savings=fallback["consumer_savings"],
            status="Pending",
        )
    ]


@router.delete("/users/{user_id}", response_model=schemas.MessageResponse)
def delete_user(
    user_id: int,
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Admin cannot delete itself")
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


@router.patch("/users/{user_id}/disable", response_model=schemas.AdminUserResponse)
def disable_user(
    user_id: int,
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Admin cannot disable itself")
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.status = "disabled"
    db.commit()
    db.refresh(user)
    return admin_user_response(user, db)


@router.patch("/users/{user_id}/enable", response_model=schemas.AdminUserResponse)
def enable_user(
    user_id: int,
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.status = "active"
    db.commit()
    db.refresh(user)
    return admin_user_response(user, db)
