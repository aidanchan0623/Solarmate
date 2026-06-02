from calendar import monthrange
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

PROSUMER_BUYBACK_RATE = 0.33
SOLAR_ATAP_REFERENCE_RATE = 0.2703
SOLARMATE_RATE = 0.43
TNB_PEAK_TOTAL_RATE = 0.5217
TNB_RETAIL_CHARGE = 20.0
GRID_TOLL_RATE = 0.09
PLATFORM_SPREAD_RATE = 0.01
MALAYSIA_TZ = ZoneInfo("Asia/Kuala_Lumpur")


def money(value: float) -> float:
    return round(float(value or 0), 2)


def kwh(value: float) -> float:
    return round(float(value or 0), 2)


def malaysia_now() -> datetime:
    return datetime.now(MALAYSIA_TZ)


def malaysia_today() -> date:
    return malaysia_now().date()


def malaysia_datetime_for_day(days_ago: int = 0, hour: int = 10, minute: int = 0) -> datetime:
    day = malaysia_today() - timedelta(days=days_ago)
    return datetime.combine(day, time(hour=hour, minute=minute), tzinfo=MALAYSIA_TZ)


def add_months(year: int, month: int, delta: int) -> tuple[int, int]:
    month_index = (year * 12 + (month - 1)) + delta
    return month_index // 12, (month_index % 12) + 1


def recent_months(count: int = 5) -> list[tuple[int, int]]:
    today = malaysia_today()
    start_year, start_month = add_months(today.year, today.month, -(count - 1))
    return [add_months(start_year, start_month, index) for index in range(count)]


def current_month_key() -> str:
    today = malaysia_today()
    return f"{today.year}-{today.month:02d}"


def current_day_of_month() -> int:
    return malaysia_today().day


def days_in_month(year: int | None = None, month: int | None = None) -> int:
    today = malaysia_today()
    target_year = year or today.year
    target_month = month or today.month
    return monthrange(target_year, target_month)[1]


def current_month_progress_percentage() -> float:
    return round((current_day_of_month() / days_in_month()) * 100, 2)


def is_current_month(key: str) -> bool:
    return key == current_month_key()


def today_key() -> str:
    return malaysia_today().isoformat()


def recent_dates(count: int = 7) -> list[str]:
    today = malaysia_today()
    return [(today - timedelta(days=offset)).isoformat() for offset in reversed(range(count))]


def month_key(date_string: str) -> str:
    return date_string[:7]


def month_label(key: str) -> str:
    return datetime.strptime(key, "%Y-%m").strftime("%B %Y")


def month_dates(year: int, month: int) -> list[str]:
    days = monthrange(year, month)[1]
    return [date(year, month, day).isoformat() for day in range(1, days + 1)]


def month_dates_to_today(year: int, month: int) -> list[str]:
    all_dates = month_dates(year, month)
    current_today = today_key()
    if f"{year}-{month:02d}" != current_month_key():
        return all_dates
    return [day for day in all_dates if day <= current_today]


def latest_month_from_records(records, date_attr: str = "date") -> str | None:
    if not records:
        return None
    return max(month_key(getattr(record, date_attr)) for record in records)


def group_records_by_month(records):
    grouped = defaultdict(list)
    today = today_key()
    for record in records:
        if record.date > today:
            continue
        grouped[month_key(record.date)].append(record)
    return grouped


def split_prosumer_export(actual_exported_kwh: float, quota_kwh: float) -> dict:
    actual = max(float(actual_exported_kwh or 0), 0)
    quota = max(float(quota_kwh or 0), 0)
    solar_mate_kwh = min(actual, quota)
    solar_atap_kwh = max(actual - quota, 0)
    solar_mate_earnings = solar_mate_kwh * PROSUMER_BUYBACK_RATE
    solar_atap_earnings = solar_atap_kwh * SOLAR_ATAP_REFERENCE_RATE

    return {
        "solar_mate_kwh": kwh(solar_mate_kwh),
        "solar_atap_kwh": kwh(solar_atap_kwh),
        "solar_mate_earnings": money(solar_mate_earnings),
        "solar_atap_earnings": money(solar_atap_earnings),
        "total_earnings": money(solar_mate_earnings + solar_atap_earnings),
    }


def calculate_consumer_bill(total_usage_kwh: float, green_credit_kwh: float) -> dict:
    total_usage = kwh(total_usage_kwh)
    green_credit = min(kwh(green_credit_kwh), total_usage)
    tnb_import = kwh(max(total_usage - green_credit, 0))
    solar_mate_amount = money(green_credit * SOLARMATE_RATE)
    tnb_import_amount = money(tnb_import * TNB_PEAK_TOTAL_RATE)
    total_bill = money(solar_mate_amount + tnb_import_amount + TNB_RETAIL_CHARGE)
    tnb_only_bill = money(total_usage * TNB_PEAK_TOTAL_RATE + TNB_RETAIL_CHARGE)
    savings = money(tnb_only_bill - total_bill)
    actual_saving_percentage = 0 if tnb_only_bill <= 0 else round((savings / tnb_only_bill) * 100, 2)

    return {
        "total_usage_kwh": total_usage,
        "green_credit_kwh": green_credit,
        "tnb_import_kwh": tnb_import,
        "solar_mate_amount": solar_mate_amount,
        "tnb_import_amount": tnb_import_amount,
        "retail_charge": TNB_RETAIL_CHARGE,
        "total_bill": total_bill,
        "tnb_only_bill": tnb_only_bill,
        "savings": savings,
        "actual_saving_percentage": actual_saving_percentage,
    }


def prosumer_uplift_percentage() -> float:
    if SOLAR_ATAP_REFERENCE_RATE <= 0:
        return 0.0
    return round(((PROSUMER_BUYBACK_RATE - SOLAR_ATAP_REFERENCE_RATE) / SOLAR_ATAP_REFERENCE_RATE) * 100, 1)


def consumer_rate_discount_percentage() -> float:
    if TNB_PEAK_TOTAL_RATE <= 0:
        return 0.0
    return round(((TNB_PEAK_TOTAL_RATE - SOLARMATE_RATE) / TNB_PEAK_TOTAL_RATE) * 100, 1)
