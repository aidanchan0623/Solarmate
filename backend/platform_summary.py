from sqlalchemy import func
from sqlalchemy.orm import Session

import energy
import models

PROSUMER_BUYBACK_RATE = 0.33
SOLAR_ATAP_REFERENCE_RATE = 0.2703
GRID_TOLL_RATE = 0.09
PLATFORM_SPREAD_RATE = 0.01
SOLARMATE_RATE = 0.43
TNB_PEAK_TOTAL_RATE = 0.5217


def platform_user_counts(db: Session) -> dict:
    return {
        "total_users": db.query(func.count(models.User.id)).scalar() or 0,
        "total_prosumers": db.query(func.count(models.User.id)).filter(models.User.role == "prosumer").scalar() or 0,
        "total_consumers": db.query(func.count(models.User.id)).filter(models.User.role == "consumer").scalar() or 0,
    }


def active_prosumer_quota(db: Session) -> float:
    return float(
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


def active_consumer_allocation(db: Session) -> float:
    return float(
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


def upsert_monthly_summary(db: Session, month_key: str) -> models.PlatformMonthlySummary:
    counts = platform_user_counts(db)
    date_filters = [models.ProsumerDailyExport.date.like(f"{month_key}-%")]
    usage_date_filters = [models.ConsumerDailyUsage.date.like(f"{month_key}-%")]
    is_current_month = energy.is_current_month(month_key)
    if is_current_month:
        date_filters.append(models.ProsumerDailyExport.date <= energy.today_key())
        usage_date_filters.append(models.ConsumerDailyUsage.date <= energy.today_key())
    supply = (
        db.query(func.sum(models.ProsumerDailyExport.exported_kwh))
        .join(models.User, models.User.id == models.ProsumerDailyExport.user_id)
        .filter(
            models.User.role == "prosumer",
            models.User.status == "active",
            models.User.has_completed_onboarding.is_(True),
            *date_filters,
        )
        .scalar()
        or 0
    )
    demand = (
        db.query(func.sum(models.ConsumerDailyUsage.green_credit_kwh))
        .join(models.User, models.User.id == models.ConsumerDailyUsage.user_id)
        .filter(
            models.User.role == "consumer",
            models.User.status == "active",
            models.User.has_completed_onboarding.is_(True),
            *usage_date_filters,
        )
        .scalar()
        or 0
    )
    supply = float(supply)
    recorded_demand = float(demand)
    quota_capacity = active_prosumer_quota(db)
    demand_capacity = active_consumer_allocation(db)

    # Current-month records are month-to-date for actual export, but SolarMate can
    # still match that export against the active monthly green-credit demand pool.
    demand = recorded_demand
    if is_current_month and demand_capacity > 0:
        available_monthly_demand = min(demand_capacity, quota_capacity or demand_capacity)
        demand = max(recorded_demand, min(supply, available_monthly_demand))

    matched = min(supply, demand, quota_capacity) if quota_capacity > 0 else min(supply, demand)
    unmatched_supply = max(supply - matched, 0)
    unmatched_demand = max(demand - matched, 0)
    matching_rate = (matched / supply) * 100 if supply > 0 else 0

    summary = (
        db.query(models.PlatformMonthlySummary)
        .filter(models.PlatformMonthlySummary.month_key == month_key)
        .first()
    )
    if not summary:
        summary = models.PlatformMonthlySummary(month_key=month_key, month=energy.month_label(month_key))
        db.add(summary)

    summary.month = energy.month_label(month_key)
    summary.total_users = counts["total_users"]
    summary.total_prosumers = counts["total_prosumers"]
    summary.total_consumers = counts["total_consumers"]
    summary.total_prosumer_supply_kwh = energy.kwh(supply)
    summary.total_consumer_demand_kwh = energy.kwh(demand)
    summary.matched_energy_kwh = energy.kwh(matched)
    summary.unmatched_supply_kwh = energy.kwh(unmatched_supply)
    summary.unmatched_demand_kwh = energy.kwh(unmatched_demand)
    summary.matching_rate = round(matching_rate, 2)
    summary.solarmate_revenue = energy.money(matched * PLATFORM_SPREAD_RATE)
    summary.consumer_savings = energy.money(matched * (TNB_PEAK_TOTAL_RATE - SOLARMATE_RATE))
    summary.prosumer_payout = energy.money(
        matched * PROSUMER_BUYBACK_RATE + unmatched_supply * SOLAR_ATAP_REFERENCE_RATE
    )
    summary.grid_toll = energy.money(matched * GRID_TOLL_RATE)
    return summary


def refresh_platform_monthly_summaries(db: Session) -> None:
    month_keys = {
        f"{year}-{month:02d}"
        for year, month in energy.recent_months(5)
    }
    if not month_keys:
        return

    latest = max(month_keys)
    db.query(models.PlatformMonthlySummary).delete(synchronize_session=False)
    for month_key in sorted(month_keys):
        summary = upsert_monthly_summary(db, month_key)
        summary.status = "Pending" if month_key == latest else "Settled"


def refresh_current_month_summary(db: Session) -> None:
    month_key = energy.current_month_key()
    summary = upsert_monthly_summary(db, month_key)
    summary.status = "Pending"
