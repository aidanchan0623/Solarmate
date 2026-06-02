import json
import math
from datetime import datetime, timedelta
from urllib.error import URLError
from urllib.request import urlopen

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

import energy
import models
import schemas
from auth import require_role
from database import get_db

router = APIRouter()

OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast?"
    "latitude=3.1213&longitude=101.6579&"
    "hourly=precipitation_probability,rain,weather_code,cloud_cover,shortwave_radiation&"
    "timezone=Asia%2FSingapore"
)
LOCATION = "University Malaya"
TIMEZONE = "Asia/Kuala_Lumpur"
CACHE_TTL_SECONDS = 600

_weather_cache: dict[str, object] = {}


def kwh(value: float) -> float:
    return round(float(value or 0), 1)


def percentage(value: float) -> float:
    return round(float(value or 0), 1)


def active_prosumer_supply(db: Session) -> float:
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


def active_consumer_demand(db: Session) -> float:
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


def parse_open_meteo_time(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=energy.MALAYSIA_TZ)
    return parsed.astimezone(energy.MALAYSIA_TZ)


def weather_condition(weather_code: int | None, cloud_cover: float, rain_probability: float, rain_mm: float) -> str:
    rainy_codes = {51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99}
    if rain_mm > 2 or rain_probability >= 70 or weather_code in rainy_codes:
        return "Rain impact likely"
    if cloud_cover >= 75:
        return "Cloudy"
    if cloud_cover >= 45:
        return "Partly cloudy"
    return "Clear solar window"


def solar_factor(shortwave_radiation: float, cloud_cover: float, rain_probability: float, rain_mm: float) -> float:
    radiation_factor = min(max(shortwave_radiation, 0) / 800, 1.0)
    cloud_factor = 1 - (min(max(cloud_cover, 0), 100) / 100)
    if rain_probability >= 80 or rain_mm > 5:
        rain_factor = 0.35
    elif rain_probability >= 60 or rain_mm > 2:
        rain_factor = 0.55
    elif rain_probability >= 30:
        rain_factor = 0.75
    else:
        rain_factor = 1.0
    raw_factor = radiation_factor * (0.4 + 0.6 * cloud_factor) * rain_factor
    return round(min(max(raw_factor, 0.10), 1.00), 3)


def time_of_day_factor(forecast_time: datetime) -> float:
    hour = forecast_time.hour + (forecast_time.minute / 60)
    if hour >= 20 or hour < 6:
        return 0.0
    daylight = math.sin(((hour - 6) / 14) * math.pi)
    return round(min(max(daylight, 0), 1), 3)


def adjusted_solar_factor(raw: dict) -> float:
    weather_factor = solar_factor(
        raw["shortwave_radiation"],
        raw["cloud_cover"],
        raw["rain_probability"],
        raw["rain_mm"],
    )
    daylight_factor = time_of_day_factor(raw["time"])
    if daylight_factor <= 0:
        return 0.0
    return round(min(max(weather_factor * daylight_factor, 0), 1), 3)


def grid_risk(expected_shortfall: float, expected_surplus: float, demand: float) -> tuple[str, str]:
    if demand <= 0:
        return "Low", "No active consumer green demand is available. Continue monitoring platform onboarding."
    if expected_surplus > demand * 0.10:
        return (
            "Surplus Risk",
            "Forecasted solar supply exceeds consumer demand. Route excess to Solar ATAP, storage, or additional demand matching.",
        )
    shortfall_ratio = expected_shortfall / demand
    if shortfall_ratio < 0.10:
        return "Low", "Solar generation is expected to support most consumer demand. Continue normal SolarMate matching."
    if shortfall_ratio < 0.30:
        return "Medium", "Moderate solar shortfall expected. Monitor output and prepare partial TNB fallback supply."
    return "High", "Significant solar shortfall expected due to weather impact. Prepare additional TNB fallback supply."


def advisory_hour(raw: dict, base_supply: float, consumer_demand: float) -> schemas.GridIntelligenceWeatherHour:
    factor = adjusted_solar_factor(raw)
    forecasted_supply = base_supply * factor
    matched = min(forecasted_supply, consumer_demand)
    shortfall = max(consumer_demand - forecasted_supply, 0)
    surplus = max(forecasted_supply - consumer_demand, 0)
    risk, _ = grid_risk(shortfall, surplus, consumer_demand)
    return schemas.GridIntelligenceWeatherHour(
        time=raw["time"].isoformat(),
        weather_condition=weather_condition(
            raw.get("weather_code"),
            raw["cloud_cover"],
            raw["rain_probability"],
            raw["rain_mm"],
        ),
        cloud_cover=percentage(raw["cloud_cover"]),
        rain_probability=percentage(raw["rain_probability"]),
        rain_mm=round(float(raw["rain_mm"] or 0), 2),
        shortwave_radiation=round(float(raw["shortwave_radiation"] or 0), 1),
        solar_factor=factor,
        forecasted_solar_supply_kwh=kwh(forecasted_supply),
        forecasted_consumer_demand_kwh=kwh(consumer_demand),
        matched_energy_kwh=kwh(matched),
        expected_shortfall_kwh=kwh(shortfall),
        expected_surplus_kwh=kwh(surplus),
        recommended_tnb_fallback_kwh=kwh(shortfall),
        risk_level=risk,
    )


def open_meteo_rows(payload: dict) -> list[dict]:
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    rows = []
    for index, time_value in enumerate(times):
        rows.append(
            {
                "time": parse_open_meteo_time(time_value),
                "cloud_cover": float((hourly.get("cloud_cover") or [0])[index] or 0),
                "rain_probability": float((hourly.get("precipitation_probability") or [0])[index] or 0),
                "rain_mm": float((hourly.get("rain") or [0])[index] or 0),
                "weather_code": int((hourly.get("weather_code") or [0])[index] or 0),
                "shortwave_radiation": float((hourly.get("shortwave_radiation") or [0])[index] or 0),
            }
        )
    return rows


def fallback_rows() -> list[dict]:
    now = energy.malaysia_now().replace(minute=0, second=0, microsecond=0)
    rows = []
    for offset in range(24):
        current = now + timedelta(hours=offset)
        daylight_strength = max(math.sin(((current.hour - 6) / 12) * math.pi), 0)
        cloud_cover = 48 + 24 * math.sin(offset / 3)
        rain_probability = 28 + 26 * max(math.sin((offset - 2) / 4), 0)
        rain_mm = 1.2 if rain_probability > 48 else 0
        rows.append(
            {
                "time": current,
                "cloud_cover": min(max(cloud_cover, 18), 88),
                "rain_probability": min(max(rain_probability, 12), 72),
                "rain_mm": rain_mm,
                "weather_code": 61 if rain_mm else 3,
                "shortwave_radiation": max(780 * daylight_strength * (1 - cloud_cover / 140), 0),
            }
        )
    return rows


def fetch_weather_rows() -> tuple[list[dict], str]:
    cached_at = _weather_cache.get("cached_at")
    if cached_at and energy.malaysia_now() - cached_at < timedelta(seconds=CACHE_TTL_SECONDS):
        return _weather_cache["rows"], _weather_cache["source"]

    try:
        with urlopen(OPEN_METEO_URL, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
        rows = open_meteo_rows(payload)
        source = "open-meteo"
        if not rows:
            raise URLError("Open-Meteo returned no hourly rows")
    except Exception:
        rows = fallback_rows()
        source = "fallback"

    _weather_cache.update({
        "cached_at": energy.malaysia_now(),
        "rows": rows,
        "source": source,
    })
    return rows, source


def relevant_forecast(rows: list[dict]) -> list[dict]:
    current_hour = energy.malaysia_now().replace(minute=0, second=0, microsecond=0)
    upcoming = [row for row in rows if row["time"] >= current_hour]
    return (upcoming or rows)[:24]


@router.get("/grid-intelligence", response_model=schemas.GridIntelligenceResponse)
def get_grid_intelligence(
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    base_supply = active_prosumer_supply(db)
    consumer_demand = active_consumer_demand(db)
    rows, source = fetch_weather_rows()
    forecast_rows = relevant_forecast(rows)
    hourly = [advisory_hour(row, base_supply, consumer_demand) for row in forecast_rows]
    current = hourly[0]
    risk, recommendation = grid_risk(
        current.expected_shortfall_kwh,
        current.expected_surplus_kwh,
        current.forecasted_consumer_demand_kwh,
    )
    return schemas.GridIntelligenceResponse(
        location=LOCATION,
        timezone=TIMEZONE,
        source=source,
        generated_at=energy.malaysia_now().isoformat(),
        current_hour=current,
        summary=schemas.GridIntelligenceSummary(
            base_prosumer_supply_kwh=kwh(base_supply),
            forecasted_solar_supply_kwh=current.forecasted_solar_supply_kwh,
            forecasted_consumer_demand_kwh=current.forecasted_consumer_demand_kwh,
            matched_energy_kwh=current.matched_energy_kwh,
            expected_shortfall_kwh=current.expected_shortfall_kwh,
            expected_surplus_kwh=current.expected_surplus_kwh,
            recommended_tnb_fallback_kwh=current.recommended_tnb_fallback_kwh,
            risk_level=risk,
            recommendation=recommendation,
        ),
        hourly_forecast=hourly,
    )
