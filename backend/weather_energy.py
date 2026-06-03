import hashlib
import json
from datetime import datetime, timedelta
from urllib.request import urlopen

import energy

OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast?"
    "latitude=3.1213&longitude=101.6579&"
    "hourly=precipitation_probability,rain,weather_code,cloud_cover,shortwave_radiation&"
    "timezone=Asia%2FSingapore"
)
CACHE_TTL_SECONDS = 600

_weather_cache: dict[str, object] = {}
_daily_factor_cache: dict[str, float] = {}


def stable_unit(seed_text: str) -> float:
    digest = hashlib.sha256(seed_text.encode("utf-8")).hexdigest()
    return int(digest[:12], 16) / float(0xFFFFFFFFFFFF)


def clamp(value: float, minimum: float, maximum: float) -> float:
    return min(max(float(value or 0), minimum), maximum)


def parse_open_meteo_time(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=energy.MALAYSIA_TZ)
    return parsed.astimezone(energy.MALAYSIA_TZ)


def daily_weather_factor_from_values(
    average_shortwave_radiation: float,
    average_cloud_cover: float,
    total_rain_mm: float,
    average_rain_probability: float,
) -> float:
    radiation_factor = clamp(average_shortwave_radiation / 800, 0.15, 1.0)
    cloud_penalty = 1 - 0.15 * (clamp(average_cloud_cover, 0, 100) / 100)

    if total_rain_mm >= 10:
        rain_penalty = 0.60
    elif total_rain_mm >= 5:
        rain_penalty = 0.75
    elif average_rain_probability >= 80:
        rain_penalty = 0.85
    elif average_rain_probability >= 60:
        rain_penalty = 0.92
    else:
        rain_penalty = 1.00

    return round(clamp(radiation_factor * cloud_penalty * rain_penalty, 0.15, 1.0), 3)


def deterministic_weather_factor(date_string: str) -> float:
    # Stable demo weather: sunny, mixed, cloudy, and rainy days repeat by date.
    condition = stable_unit(f"weather-condition:{date_string}")
    variation = stable_unit(f"weather-variation:{date_string}")
    if condition < 0.16:
        return round(0.22 + variation * 0.18, 3)
    if condition < 0.42:
        return round(0.43 + variation * 0.18, 3)
    if condition < 0.72:
        return round(0.64 + variation * 0.17, 3)
    return round(0.82 + variation * 0.18, 3)


def fetch_open_meteo_rows() -> list[dict]:
    cached_at = _weather_cache.get("cached_at")
    if cached_at and energy.malaysia_now() - cached_at < timedelta(seconds=CACHE_TTL_SECONDS):
        return _weather_cache.get("rows", [])

    try:
        with urlopen(OPEN_METEO_URL, timeout=3) as response:
            payload = json.loads(response.read().decode("utf-8"))
        hourly = payload.get("hourly") or {}
        times = hourly.get("time") or []
        rows = []
        for index, time_value in enumerate(times):
            rows.append({
                "time": parse_open_meteo_time(time_value),
                "cloud_cover": float((hourly.get("cloud_cover") or [0])[index] or 0),
                "rain_probability": float((hourly.get("precipitation_probability") or [0])[index] or 0),
                "rain_mm": float((hourly.get("rain") or [0])[index] or 0),
                "shortwave_radiation": float((hourly.get("shortwave_radiation") or [0])[index] or 0),
            })
    except Exception:
        rows = []

    _weather_cache.update({
        "cached_at": energy.malaysia_now(),
        "rows": rows,
    })
    return rows


def api_daily_factors() -> dict[str, float]:
    if _daily_factor_cache:
        return _daily_factor_cache

    grouped: dict[str, list[dict]] = {}
    for row in fetch_open_meteo_rows():
        hour = row["time"].hour
        if 6 <= hour < 20:
            grouped.setdefault(row["time"].date().isoformat(), []).append(row)

    for date_string, rows in grouped.items():
        if not rows:
            continue
        average_radiation = sum(row["shortwave_radiation"] for row in rows) / len(rows)
        average_cloud = sum(row["cloud_cover"] for row in rows) / len(rows)
        average_rain_probability = sum(row["rain_probability"] for row in rows) / len(rows)
        total_rain = sum(row["rain_mm"] for row in rows)
        _daily_factor_cache[date_string] = daily_weather_factor_from_values(
            average_radiation,
            average_cloud,
            total_rain,
            average_rain_probability,
        )
    return _daily_factor_cache


def daily_weather_factor(date_string: str) -> float:
    return api_daily_factors().get(date_string) or deterministic_weather_factor(date_string)


def daily_weather_weight(date_string: str, namespace: str = "") -> float:
    variation = 0.90 + stable_unit(f"weather-weight:{namespace}:{date_string}") * 0.20
    return round(max(daily_weather_factor(date_string) * variation, 0.05), 4)

