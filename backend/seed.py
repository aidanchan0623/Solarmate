from collections import Counter
import random

from auth import hash_password
from database import Base, SessionLocal, engine
import energy
import models
import platform_summary
from schema_migrations import ensure_sqlite_schema
import simulation
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

SIMULATION_MONTHS = energy.recent_months(5)
MONTHS = [energy.month_label(f"{year}-{month:02d}") for year, month in SIMULATION_MONTHS]
DEMO_EXPORTS = [520, 480, 610, 530, 620]
DEMO_USAGE = [1080, 1125, 1160, 1190, 1200]
DEMO_GREEN_CREDIT = [900, 950, 1000, 1000, 1000]
PROSUMER_EXPORT_FACTORS = [0.96, 0.98, 1.0, 1.02, 1.04]
CONSUMER_DEMAND_FACTORS = [0.96, 0.97, 0.985, 0.995, 1.0]
PROSUMER_BUYBACK_RATE = 0.33
SOLAR_ATAP_REFERENCE_RATE = 0.2703

TARGET_PROSUMER_PLAN_COUNTS = {
    100: 300,
    300: 600,
    500: 300,
}

TARGET_CONSUMER_PACKAGE_COUNTS = {
    300: 650,
    1000: 135,
    2000: 15,
}

SEEDED_PREFIXES = (
    "seed_prosumer_",
    "seed_consumer_",
    "ui_prosumer_",
    "ui_consumer_",
    "api_prosumer_",
    "api_consumer_",
)

SEEDED_DEMO_USERS = {
    "house_a",
    "greenbean",
    "prosumer_demo",
    "consumer_demo",
}

ESP_PROSUMER_USERNAME = "prosumeresp"
ESP_PROSUMER_PASSWORD = "password123"
ESP_PROSUMER_DEVICE_ID = "ESP32_SOLARMATE_001"


def is_seed_managed_user(user: models.User) -> bool:
    return user.username in SEEDED_DEMO_USERS or user.username.startswith(SEEDED_PREFIXES)


def clear_seeded_users(db):
    seeded_users = db.query(models.User).filter(models.User.role != "admin").all()
    for user in seeded_users:
        if is_seed_managed_user(user):
            db.delete(user)
    db.flush()


def upsert_admin(db):
    password_hash = hash_password("admin123")
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        admin = models.User(
            username="admin",
            email="admin@solarmate.local",
            password_hash=password_hash,
            role="admin",
            status="active",
            has_completed_onboarding=True,
        )
        db.add(admin)
        return admin

    admin.email = "admin@solarmate.local"
    admin.password_hash = password_hash
    admin.role = "admin"
    admin.status = "active"
    admin.has_completed_onboarding = True
    return admin


def create_user(db, username, email, password_hash, role):
    user = models.User(
        username=username,
        email=email,
        password_hash=password_hash,
        role=role,
        status="active",
        has_completed_onboarding=True,
    )
    db.add(user)
    db.flush()
    return user


def generate_daily_values_for_month(year: int, month: int, target_total: float) -> list[float]:
    dates = energy.month_dates(year, month)
    target_cents = int(round(target_total * 100))
    if not dates or target_cents <= 0:
        return [0 for _ in dates]

    weights = [random.uniform(0.78, 1.22) for _ in dates]
    weight_total = sum(weights)
    cents = [max(int(round(target_cents * weight / weight_total)), 0) for weight in weights]
    diff = target_cents - sum(cents)
    index = len(cents) - 1
    while diff != 0:
        if diff > 0:
            cents[index] += 1
            diff -= 1
        else:
            if cents[index] > 0:
                cents[index] -= 1
                diff += 1
        index = (index - 1) % len(cents)

    return [round(value / 100, 2) for value in cents]


def generate_weather_weighted_values_for_month(year: int, month: int, target_total: float, namespace: str) -> list[float]:
    dates = energy.month_dates(year, month)
    target_cents = int(round(target_total * 100))
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
        else:
            if cents[index] > 0:
                cents[index] -= 1
                diff += 1
        index = (index - 1) % len(cents)

    return [round(value / 100, 2) for value in cents]


def month_year(index: int) -> tuple[int, int]:
    return SIMULATION_MONTHS[index]


def add_prosumer_daily_exports(db, user_id, commitment, target_exports=None):
    targets = target_exports or [
        round(commitment * factor * random.uniform(0.97, 1.03), 2)
        for factor in PROSUMER_EXPORT_FACTORS
    ]
    for index, target_exported in enumerate(targets):
        year, month = month_year(index)
        daily_exports = generate_weather_weighted_values_for_month(
            year,
            month,
            target_exported,
            f"seed-prosumer:{user_id}",
        )
        for date_string, exported in zip(energy.month_dates(year, month), daily_exports):
            local_ratio = random.uniform(0.35, 0.55)
            generated = round(exported / max(1 - local_ratio, 0.45), 2)
            local_consumption = round(max(generated - exported, 0), 2)
            db.add(
                models.ProsumerDailyExport(
                    user_id=user_id,
                    date=date_string,
                    generated_kwh=generated,
                    local_consumption_kwh=local_consumption,
                    exported_kwh=round(max(generated - local_consumption, 0), 2),
                )
            )


def allocate_daily_green_credit(usage_values: list[float], monthly_credit_target: float) -> list[float]:
    if not usage_values:
        return []
    usage_total = sum(usage_values)
    if usage_total <= 0:
        return [0 for _ in usage_values]

    target = int(round(min(monthly_credit_target, usage_total) * 100))
    usage_cents = [int(round(value * 100)) for value in usage_values]
    usage_total_cents = sum(usage_cents)
    ratio = target / usage_total_cents
    credits = [round(min(value * ratio, value), 2) for value in usage_values]
    credit_cents = [int(round(value * 100)) for value in credits]
    diff_cents = target - sum(credit_cents)
    index = len(credits) - 1
    while diff_cents != 0:
        if diff_cents > 0:
            available = max(usage_cents[index] - credit_cents[index], 0)
            step = min(available, diff_cents)
            credit_cents[index] += step
            diff_cents -= step
        else:
            removable = credit_cents[index]
            step = min(removable, abs(diff_cents))
            credit_cents[index] -= step
            diff_cents += step
        index = (index - 1) % len(credit_cents)
    return [round(value / 100, 2) for value in credit_cents]


def allocate_weather_green_credit(
    dates: list[str],
    usage_values: list[float],
    monthly_credit_target: float,
    namespace: str,
) -> list[float]:
    if not usage_values:
        return []
    usage_cents = [int(round(value * 100)) for value in usage_values]
    usage_total_cents = sum(usage_cents)
    target = int(round(min(monthly_credit_target, usage_total_cents / 100) * 100))
    if usage_total_cents <= 0 or target <= 0:
        return [0 for _ in usage_values]

    preferred = []
    for date_string, usage in zip(dates, usage_cents):
        factor = weather_energy.daily_weather_factor(date_string)
        jitter = weather_energy.stable_unit(f"seed-green-credit:{namespace}:{date_string}") * 0.04
        ratio = min(max(0.76 + factor * 0.20 + jitter, 0.72), 0.98)
        preferred.append(min(int(round(usage * ratio)), usage))

    preferred_total = sum(preferred)
    if preferred_total <= 0:
        return allocate_daily_green_credit(usage_values, monthly_credit_target)
    if preferred_total >= target:
        credit_cents = [int(round(target * value / preferred_total)) for value in preferred]
        credit_cents = [min(credit, usage) for credit, usage in zip(credit_cents, usage_cents)]
    else:
        credit_cents = preferred[:]

    diff_cents = target - sum(credit_cents)
    index = len(credit_cents) - 1
    while diff_cents != 0:
        if diff_cents > 0:
            available = max(usage_cents[index] - credit_cents[index], 0)
            step = min(available, diff_cents)
            credit_cents[index] += step
            diff_cents -= step
        else:
            removable = credit_cents[index]
            step = min(removable, abs(diff_cents))
            credit_cents[index] -= step
            diff_cents += step
        index = (index - 1) % len(credit_cents)
    return [round(value / 100, 2) for value in credit_cents]


def add_consumer_daily_usage(db, user_id, allocation, target_usage_values=None, target_credit_values=None):
    targets = target_usage_values or [
        round(allocation * random.uniform(1.04, 1.18), 2)
        for _ in MONTHS
    ]
    for index, target_usage in enumerate(targets):
        year, month = month_year(index)
        usage_values = generate_daily_values_for_month(year, month, target_usage)
        target_credit = (
            target_credit_values[index]
            if target_credit_values
            else round(min(allocation, target_usage * random.uniform(0.84, 0.94)), 2)
        )
        dates = energy.month_dates(year, month)
        green_values = allocate_weather_green_credit(
            dates,
            usage_values,
            target_credit,
            f"seed-consumer:{user_id}",
        )
        for date_string, usage, green_credit in zip(dates, usage_values, green_values):
            tnb_import = round(max(usage - green_credit, 0), 2)
            db.add(
                models.ConsumerDailyUsage(
                    user_id=user_id,
                    date=date_string,
                    total_usage_kwh=usage,
                    green_credit_kwh=green_credit,
                    tnb_import_kwh=tnb_import,
                )
            )


def create_prosumer(db, username, email, display_name, commitment, password_hash, actual_exports=None):
    user = create_user(db, username, email, password_hash, "prosumer")
    db.add(
        models.ProsumerProfile(
            user_id=user.id,
            display_name=display_name,
            selected_export_plan=PROSUMER_PLAN_BY_COMMITMENT[commitment],
            export_commitment_kwh=commitment,
            buyback_rate=0.33,
            cashout_balance=round(commitment * 0.33, 2),
        )
    )
    add_prosumer_daily_exports(db, user.id, commitment, actual_exports)


def upsert_esp_prosumer(db):
    password_hash = hash_password(ESP_PROSUMER_PASSWORD)
    user = db.query(models.User).filter(models.User.username == ESP_PROSUMER_USERNAME).first()
    if not user:
        user = models.User(
            username=ESP_PROSUMER_USERNAME,
            email="prosumeresp@solarmate.local",
            password_hash=password_hash,
            role="prosumer",
            status="active",
            has_completed_onboarding=True,
        )
        db.add(user)
        db.flush()
    else:
        user.email = "prosumeresp@solarmate.local"
        user.password_hash = password_hash
        user.role = "prosumer"
        user.status = "active"
        user.has_completed_onboarding = True
        db.flush()

    if not user.prosumer_profile:
        db.add(
            models.ProsumerProfile(
                user_id=user.id,
                display_name="ESP32 Solar Prototype",
                selected_export_plan="Premium Export",
                export_commitment_kwh=500,
                buyback_rate=0.33,
                cashout_balance=33.0,
                device_id=ESP_PROSUMER_DEVICE_ID,
            )
        )
    else:
        user.prosumer_profile.display_name = "ESP32 Solar Prototype"
        user.prosumer_profile.selected_export_plan = "Premium Export"
        user.prosumer_profile.export_commitment_kwh = 500
        user.prosumer_profile.buyback_rate = 0.33
        user.prosumer_profile.cashout_balance = 33.0
        user.prosumer_profile.device_id = ESP_PROSUMER_DEVICE_ID

    db.query(models.ProsumerDailyExport).filter(
        models.ProsumerDailyExport.user_id == user.id
    ).delete(synchronize_session=False)
    db.query(models.MeterReading).filter(
        models.MeterReading.device_id == ESP_PROSUMER_DEVICE_ID
    ).delete(synchronize_session=False)
    add_prosumer_daily_exports(db, user.id, 500)
    return user


def create_consumer(
    db,
    username,
    email,
    business_name,
    business_type,
    allocation,
    password_hash,
    target_usage_values=None,
    target_credit_values=None,
):
    user = create_user(db, username, email, password_hash, "consumer")
    db.add(
        models.ConsumerProfile(
            user_id=user.id,
            business_name=business_name,
            business_type=business_type,
            selected_package=CONSUMER_PACKAGE_BY_ALLOCATION[allocation],
            package_allocation_kwh=allocation,
        )
    )
    add_consumer_daily_usage(db, user.id, allocation, target_usage_values, target_credit_values)


def count_existing_prosumer_commitments(db):
    counts = Counter()
    existing = (
        db.query(models.ProsumerProfile)
        .join(models.User)
        .filter(models.User.role == "prosumer")
        .all()
    )
    for profile in existing:
        if profile.export_commitment_kwh in TARGET_PROSUMER_PLAN_COUNTS:
            counts[profile.export_commitment_kwh] += 1
    return counts


def count_existing_consumer_allocations(db):
    counts = Counter()
    existing = (
        db.query(models.ConsumerProfile)
        .join(models.User)
        .filter(models.User.role == "consumer")
        .all()
    )
    for profile in existing:
        if profile.package_allocation_kwh in TARGET_CONSUMER_PACKAGE_COUNTS:
            counts[profile.package_allocation_kwh] += 1
    return counts


def remaining_counts(target_counts, existing_counts):
    return {
        amount: max(target - existing_counts.get(amount, 0), 0)
        for amount, target in target_counts.items()
    }


def wallet_balance_for_user(user: models.User) -> float:
    if user.username == "consumer_demo":
        return 1500.0
    if user.username == "prosumer_demo":
        return 250.0
    if user.username == ESP_PROSUMER_USERNAME:
        return 33.0
    if user.role == "consumer":
        return 500.0
    if user.role == "prosumer" and user.prosumer_profile:
        return round((user.prosumer_profile.export_commitment_kwh or 100) * 0.33, 2)
    return 0.0


def add_seed_transaction(db, user, transaction_type, amount, status, description, days_ago, hour, minute=0):
    db.add(models.WalletTransaction(
        user_id=user.id,
        transaction_type=transaction_type,
        amount=energy.money(amount),
        status=status,
        description=description,
        created_at=energy.malaysia_datetime_for_day(days_ago=days_ago, hour=hour, minute=minute),
    ))


def seed_wallets(db):
    db.query(models.WalletTransaction).delete(synchronize_session=False)
    users = db.query(models.User).all()
    latest_month = MONTHS[-1]
    for user in users:
        if not user.wallet:
            db.add(models.Wallet(user_id=user.id, balance=wallet_balance_for_user(user)))
        else:
            user.wallet.balance = wallet_balance_for_user(user)

        if user.username == "consumer_demo":
            add_seed_transaction(db, user, "topup", 1000.0, "successful", "Energy Wallet top-up via prototype banking", 6, 9, 10)
            add_seed_transaction(db, user, "green_credit_usage", 0.0, "posted", f"SolarMate green credit applied for {latest_month}", 5, 10, 20)
            add_seed_transaction(db, user, "bill_payment", 478.0, "successful", f"Blended energy bill payment for {MONTHS[-2]}", 4, 14, 5)
            add_seed_transaction(db, user, "topup", 500.0, "successful", "Energy Wallet top-up before current bill", 3, 11, 30)
            add_seed_transaction(db, user, "pending_bill", 0.0, "pending", f"Current blended bill generated for {latest_month}", 1, 16, 0)
            add_seed_transaction(db, user, "bill_payment", 0.0, "pending", f"Awaiting payment for {latest_month}", 0, 9, 45)
        elif user.username == "prosumer_demo":
            add_seed_transaction(db, user, "earning", 165.0, "successful", f"SolarMate quota export earning for {latest_month}", 7, 10, 0)
            add_seed_transaction(db, user, "solar_atap_settlement", 32.44, "pending", f"Solar ATAP excess settlement for {latest_month}", 5, 15, 15)
            add_seed_transaction(db, user, "settlement", 197.44, "pending", f"Monthly export settlement for {latest_month}", 3, 12, 10)
            add_seed_transaction(db, user, "cashout", 120.0, "processing", "Cashout request submitted to bank transfer", 2, 17, 35)
            add_seed_transaction(db, user, "cashout", 95.0, "successful", "Previous wallet cashout completed", 1, 13, 20)
        elif user.username == ESP_PROSUMER_USERNAME:
            add_seed_transaction(db, user, "earning", 33.0, "successful", "ESP32 prototype daily export earning", 2, 10, 40)
            add_seed_transaction(db, user, "settlement", 18.5, "pending", "ESP32 prototype pending settlement", 0, 15, 25)


def seed():
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_schema(engine)
    random.seed(42)
    db = SessionLocal()
    try:
        clear_seeded_users(db)
        upsert_admin(db)

        shared_demo_password_hash = hash_password("password123")

        create_prosumer(
            db,
            username="prosumer_demo",
            email="prosumer_demo@solarmate.local",
            display_name="Prosumer Demo Solar",
            commitment=500,
            password_hash=shared_demo_password_hash,
            actual_exports=DEMO_EXPORTS,
        )
        create_consumer(
            db,
            username="consumer_demo",
            email="consumer_demo@solarmate.local",
            business_name="Consumer Demo Cafe",
            business_type="Cafe",
            allocation=1000,
            password_hash=shared_demo_password_hash,
            target_usage_values=DEMO_USAGE,
            target_credit_values=DEMO_GREEN_CREDIT,
        )
        upsert_esp_prosumer(db)
        db.flush()

        prosumer_counts = remaining_counts(TARGET_PROSUMER_PLAN_COUNTS, count_existing_prosumer_commitments(db))
        consumer_counts = remaining_counts(TARGET_CONSUMER_PACKAGE_COUNTS, count_existing_consumer_allocations(db))

        created_prosumers = 1
        for commitment, count in prosumer_counts.items():
            for _ in range(count):
                create_prosumer(
                    db,
                    username=f"seed_prosumer_{created_prosumers:04d}",
                    email=f"seed_prosumer_{created_prosumers:04d}@solarmate.local",
                    display_name=f"Seed Prosumer {created_prosumers:04d}",
                    commitment=commitment,
                    password_hash=shared_demo_password_hash,
                )
                created_prosumers += 1

        business_types = ["Cafe", "Clinic", "Mini Market", "Office", "Restaurant", "Workshop"]
        created_consumers = 1
        for allocation, count in consumer_counts.items():
            for _ in range(count):
                create_consumer(
                    db,
                    username=f"seed_consumer_{created_consumers:04d}",
                    email=f"seed_consumer_{created_consumers:04d}@solarmate.local",
                    business_name=f"Seed Business {created_consumers:04d}",
                    business_type=random.choice(business_types),
                    allocation=allocation,
                    password_hash=shared_demo_password_hash,
                )
                created_consumers += 1

        db.commit()
        simulation.regenerate_demo_like_records(db)
        seed_wallets(db)
        platform_summary.refresh_platform_monthly_summaries(db)
        db.commit()

        total_prosumers = db.query(models.User).filter(models.User.role == "prosumer").count()
        total_consumers = db.query(models.User).filter(models.User.role == "consumer").count()
        total_supply = sum(
            value * count for value, count in count_existing_prosumer_commitments(db).items()
        )
        total_demand = sum(
            value * count for value, count in count_existing_consumer_allocations(db).items()
        )

        print("Seed complete")
        print(f"Total prosumers: {total_prosumers}")
        print(f"Total consumers: {total_consumers}")
        print(f"Total prosumer supply: {total_supply:,} kWh/month")
        print(f"Total consumer demand: {total_demand:,} kWh/month")
        print("Admin: admin / admin123")
        print("Demo prosumer: prosumer_demo / password123")
        print("Demo consumer: consumer_demo / password123")
        print("ESP prosumer: prosumeresp / password123")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
