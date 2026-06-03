import hashlib
import random

import energy
import models
import weather_energy

PROSUMER_PLAN_BY_COMMITMENT = {
    100: "Starter Export",
    300: "Standard Export",
    500: "Premium Export",
}

CONSUMER_PACKAGE_BY_ALLOCATION = {
    300: "Lite Business",
    1000: "Business",
    2000: "Business Plus",
}

DEMO_EXPORT_TARGETS = [520, 480, 610, 530, 620]
DEMO_USAGE_TARGETS = [1080, 1125, 1160, 1190, 1200]
DEMO_GREEN_CREDIT_TARGETS = [900, 950, 1000, 1000, 1000]
PROSUMER_EXPORT_FACTORS = [0.96, 0.98, 1.0, 1.02, 1.04]
CONSUMER_DEMAND_FACTORS = [0.96, 0.97, 0.985, 0.995, 1.0]


def simulation_months() -> list[tuple[int, int]]:
    return energy.recent_months(5)


def required_dates() -> set[str]:
    dates: set[str] = set()
    for year, month in simulation_months():
        dates.update(energy.month_dates_to_today(year, month))
    return dates


def user_text(user: models.User) -> str:
    profile_name = ""
    if user.prosumer_profile:
        profile_name = user.prosumer_profile.display_name or ""
    if user.consumer_profile:
        profile_name = user.consumer_profile.business_name or ""
    return f"{user.username} {user.email} {profile_name}".lower()


def is_demo_like_user(user: models.User) -> bool:
    text = user_text(user)
    return user.username in {"prosumer_demo", "consumer_demo"} or "aidan" in text


def seeded_rng(user: models.User, namespace: str) -> random.Random:
    seed = hashlib.sha256(f"{namespace}:{user.id}:{user.username}".encode("utf-8")).hexdigest()
    return random.Random(int(seed[:16], 16))


def generate_daily_values_for_month(year: int, month: int, target_total: float, rng: random.Random) -> list[float]:
    dates = energy.month_dates(year, month)
    target_cents = int(round(float(target_total or 0) * 100))
    if not dates or target_cents <= 0:
        return [0 for _ in dates]

    weights = [rng.uniform(0.78, 1.22) for _ in dates]
    weight_total = sum(weights)
    cents = [max(int(round(target_cents * weight / weight_total)), 0) for weight in weights]
    diff = target_cents - sum(cents)
    index = len(cents) - 1
    while diff != 0:
        if diff > 0:
            cents[index] += 1
            diff -= 1
        elif cents[index] > 0:
            cents[index] -= 1
            diff += 1
        index = (index - 1) % len(cents)

    return [round(value / 100, 2) for value in cents]


def generate_weather_weighted_values_for_month(
    year: int,
    month: int,
    target_total: float,
    namespace: str,
) -> list[float]:
    dates = energy.month_dates(year, month)
    target_cents = int(round(float(target_total or 0) * 100))
    if not dates or target_cents <= 0:
        return [0 for _ in dates]

    weights = [weather_energy.daily_weather_weight(date_string, namespace) for date_string in dates]
    weight_total = sum(weights) or 1
    cents = [max(int(round(target_cents * weight / weight_total)), 0) for weight in weights]
    diff = target_cents - sum(cents)
    index = len(cents) - 1
    while diff != 0:
        if diff > 0:
            cents[index] += 1
            diff -= 1
        elif cents[index] > 0:
            cents[index] -= 1
            diff += 1
        index = (index - 1) % len(cents)

    return [round(value / 100, 2) for value in cents]


def allocate_daily_green_credit(usage_values: list[float], monthly_green_credit_kwh: float) -> list[float]:
    if not usage_values:
        return []

    usage_cents = [int(round(value * 100)) for value in usage_values]
    total_usage_cents = sum(usage_cents)
    target_cents = int(round(min(monthly_green_credit_kwh, total_usage_cents / 100) * 100))
    if total_usage_cents <= 0 or target_cents <= 0:
        return [0 for _ in usage_values]

    ratio = target_cents / total_usage_cents
    credit_cents = [min(int(round(value * ratio)), value) for value in usage_cents]
    diff = target_cents - sum(credit_cents)
    index = len(credit_cents) - 1
    while diff != 0:
        if diff > 0:
            available = max(usage_cents[index] - credit_cents[index], 0)
            step = min(available, diff)
            credit_cents[index] += step
            diff -= step
        else:
            removable = credit_cents[index]
            step = min(removable, abs(diff))
            credit_cents[index] -= step
            diff += step
        index = (index - 1) % len(credit_cents)

    return [round(value / 100, 2) for value in credit_cents]


def allocate_weather_green_credit(
    dates: list[str],
    usage_values: list[float],
    monthly_green_credit_kwh: float,
    namespace: str,
) -> list[float]:
    if not usage_values:
        return []

    usage_cents = [int(round(value * 100)) for value in usage_values]
    total_usage_cents = sum(usage_cents)
    target_cents = int(round(min(monthly_green_credit_kwh, total_usage_cents / 100) * 100))
    if total_usage_cents <= 0 or target_cents <= 0:
        return [0 for _ in usage_values]

    preferred = []
    for date_string, usage in zip(dates, usage_cents):
        factor = weather_energy.daily_weather_factor(date_string)
        jitter = weather_energy.stable_unit(f"green-credit:{namespace}:{date_string}") * 0.04
        daily_ratio = min(max(0.76 + factor * 0.20 + jitter, 0.72), 0.98)
        preferred.append(min(int(round(usage * daily_ratio)), usage))

    preferred_total = sum(preferred)
    if preferred_total <= 0:
        return allocate_daily_green_credit(usage_values, monthly_green_credit_kwh)

    if preferred_total >= target_cents:
        credit_cents = [int(round(target_cents * value / preferred_total)) for value in preferred]
        credit_cents = [min(credit, usage) for credit, usage in zip(credit_cents, usage_cents)]
    else:
        credit_cents = preferred[:]

    diff = target_cents - sum(credit_cents)
    index = len(credit_cents) - 1
    while diff != 0:
        if diff > 0:
            available = max(usage_cents[index] - credit_cents[index], 0)
            step = min(available, diff)
            credit_cents[index] += step
            diff -= step
        else:
            removable = credit_cents[index]
            step = min(removable, abs(diff))
            credit_cents[index] -= step
            diff += step
        index = (index - 1) % len(credit_cents)

    return [round(value / 100, 2) for value in credit_cents]


def normalize_demo_prosumer_profile(user: models.User) -> None:
    if not is_demo_like_user(user) or not user.prosumer_profile:
        return
    profile = user.prosumer_profile
    profile.selected_export_plan = "Premium Export"
    profile.export_commitment_kwh = 500
    profile.buyback_rate = energy.PROSUMER_BUYBACK_RATE
    profile.cashout_balance = 197.44
    user.has_completed_onboarding = True


def normalize_demo_consumer_profile(user: models.User) -> None:
    if not is_demo_like_user(user) or not user.consumer_profile:
        return
    profile = user.consumer_profile
    profile.selected_package = "Business"
    profile.package_allocation_kwh = 1000
    user.has_completed_onboarding = True


def prosumer_export_targets(user: models.User) -> list[float]:
    normalize_demo_prosumer_profile(user)
    quota = user.prosumer_profile.export_commitment_kwh or 500
    if is_demo_like_user(user):
        return DEMO_EXPORT_TARGETS

    rng = seeded_rng(user, "prosumer-targets")
    return [
        round(quota * factor * rng.uniform(0.97, 1.03), 2)
        for factor in PROSUMER_EXPORT_FACTORS
    ]


def consumer_usage_targets(user: models.User) -> tuple[list[float], list[float]]:
    normalize_demo_consumer_profile(user)
    allocation = user.consumer_profile.package_allocation_kwh or 1000
    if is_demo_like_user(user):
        return DEMO_USAGE_TARGETS, [min(allocation, value) for value in DEMO_GREEN_CREDIT_TARGETS]

    rng = seeded_rng(user, "consumer-targets")
    usage_targets = [round(allocation * rng.uniform(1.04, 1.18), 2) for _ in simulation_months()]
    credit_targets = [
        round(min(allocation, usage * rng.uniform(0.84, 0.94)), 2)
        for usage in usage_targets
    ]
    return usage_targets, credit_targets


def clear_user_energy_records(db, user: models.User) -> None:
    if user.role == "prosumer":
        db.query(models.ProsumerDailyExport).filter(
            models.ProsumerDailyExport.user_id == user.id
        ).delete(synchronize_session=False)
    if user.role == "consumer":
        db.query(models.ConsumerDailyUsage).filter(
            models.ConsumerDailyUsage.user_id == user.id
        ).delete(synchronize_session=False)


def create_prosumer_daily_exports(db, user: models.User) -> None:
    rng = seeded_rng(user, "prosumer-daily")
    for (year, month), target_exported in zip(simulation_months(), prosumer_export_targets(user)):
        daily_exports = generate_weather_weighted_values_for_month(
            year,
            month,
            target_exported,
            f"prosumer:{user.id}:{user.username}",
        )
        for date_string, exported in zip(energy.month_dates(year, month), daily_exports):
            local_ratio = 0.35 + rng.uniform(0, 0.20)
            generated = round(exported / max(1 - local_ratio, 0.45), 2)
            local_consumption = round(max(generated - exported, 0), 2)
            db.add(
                models.ProsumerDailyExport(
                    user_id=user.id,
                    date=date_string,
                    generated_kwh=generated,
                    local_consumption_kwh=local_consumption,
                    exported_kwh=energy.kwh(max(generated - local_consumption, 0)),
                )
            )


def create_consumer_daily_usage(db, user: models.User) -> None:
    rng = seeded_rng(user, "consumer-daily")
    usage_targets, credit_targets = consumer_usage_targets(user)
    for (year, month), target_usage, target_credit in zip(simulation_months(), usage_targets, credit_targets):
        usage_values = generate_daily_values_for_month(year, month, target_usage, rng)
        dates = energy.month_dates(year, month)
        green_values = allocate_weather_green_credit(
            dates,
            usage_values,
            target_credit,
            f"consumer:{user.id}:{user.username}",
        )
        for date_string, usage, green_credit in zip(dates, usage_values, green_values):
            db.add(
                models.ConsumerDailyUsage(
                    user_id=user.id,
                    date=date_string,
                    total_usage_kwh=usage,
                    green_credit_kwh=green_credit,
                    tnb_import_kwh=energy.kwh(max(usage - green_credit, 0)),
                )
            )


def ensure_prosumer_records(user: models.User, db, force: bool = False) -> bool:
    if not user.prosumer_profile:
        return False
    normalize_demo_prosumer_profile(user)
    needed_dates = required_dates()
    existing_dates = {
        row[0]
        for row in db.query(models.ProsumerDailyExport.date)
        .filter(
            models.ProsumerDailyExport.user_id == user.id,
            models.ProsumerDailyExport.date.in_(needed_dates),
        )
        .all()
    }
    if is_demo_like_user(user):
        force = True
    if needed_dates.issubset(existing_dates) and not force:
        db.commit()
        db.refresh(user)
        return False

    clear_user_energy_records(db, user)
    create_prosumer_daily_exports(db, user)
    db.commit()
    db.refresh(user)
    return True


def ensure_consumer_records(user: models.User, db, force: bool = False) -> bool:
    if not user.consumer_profile:
        return False
    normalize_demo_consumer_profile(user)
    needed_dates = required_dates()
    existing_dates = {
        row[0]
        for row in db.query(models.ConsumerDailyUsage.date)
        .filter(
            models.ConsumerDailyUsage.user_id == user.id,
            models.ConsumerDailyUsage.date.in_(needed_dates),
        )
        .all()
    }
    if is_demo_like_user(user):
        force = True
    if needed_dates.issubset(existing_dates) and not force:
        db.commit()
        db.refresh(user)
        return False

    clear_user_energy_records(db, user)
    create_consumer_daily_usage(db, user)
    db.commit()
    db.refresh(user)
    return True


def ensure_missing_energy_records(db) -> bool:
    changed = False
    users = (
        db.query(models.User)
        .filter(
            models.User.status == "active",
            models.User.has_completed_onboarding.is_(True),
            models.User.role.in_(["prosumer", "consumer"]),
        )
        .all()
    )
    for user in users:
        if user.role == "prosumer":
            changed = ensure_prosumer_records(user, db) or changed
        elif user.role == "consumer":
            changed = ensure_consumer_records(user, db) or changed
    return changed


def regenerate_demo_like_records(db) -> None:
    users = (
        db.query(models.User)
        .filter(models.User.role.in_(["prosumer", "consumer"]))
        .all()
    )
    for user in users:
        if not is_demo_like_user(user):
            continue
        if user.role == "prosumer":
            ensure_prosumer_records(user, db, force=True)
        elif user.role == "consumer":
            ensure_consumer_records(user, db, force=True)
