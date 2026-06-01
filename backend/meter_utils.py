from datetime import datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

import energy
import models

ESP_DEVICE_ID = "ESP32_SOLARMATE_001"
ESP_DEVICE_SECRET = "solarmate-demo-key"
ESP_DEMO_SCALE_FACTOR = 2.0
ONLINE_WINDOW_SECONDS = 30


def scale_energy(energy_wh: float) -> float:
    return energy.kwh(float(energy_wh or 0) * ESP_DEMO_SCALE_FACTOR)


def device_user(db: Session, device_id: str) -> models.User | None:
    profile = (
        db.query(models.ProsumerProfile)
        .join(models.User)
        .filter(
            models.ProsumerProfile.device_id == device_id,
            models.User.role == "prosumer",
            models.User.status == "active",
        )
        .first()
    )
    return profile.user if profile else None


def latest_reading(db: Session, device_id: str) -> models.MeterReading | None:
    return (
        db.query(models.MeterReading)
        .filter(models.MeterReading.device_id == device_id)
        .order_by(models.MeterReading.created_at.desc(), models.MeterReading.id.desc())
        .first()
    )


def reading_status(reading: models.MeterReading | None) -> str:
    if not reading:
        return "No Data"
    created_at = reading.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age = datetime.now(timezone.utc) - created_at
    return "Online" if age <= timedelta(seconds=ONLINE_WINDOW_SECONDS) else "Offline"


def reading_day_bounds(day: datetime | None = None) -> tuple[datetime, datetime]:
    current = day or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    start = datetime.combine(current.date(), time.min, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    return start, end


def today_readings(db: Session, device_id: str) -> list[models.MeterReading]:
    start, end = reading_day_bounds()
    return (
        db.query(models.MeterReading)
        .filter(
            models.MeterReading.device_id == device_id,
            models.MeterReading.created_at >= start,
            models.MeterReading.created_at < end,
        )
        .order_by(models.MeterReading.created_at.asc(), models.MeterReading.id.asc())
        .all()
    )


def today_latest_reading(db: Session, device_id: str) -> models.MeterReading | None:
    readings = today_readings(db, device_id)
    return readings[-1] if readings else latest_reading(db, device_id)


def esp_live_data(db: Session, device_id: str = ESP_DEVICE_ID) -> dict:
    user = device_user(db, device_id)
    latest = today_latest_reading(db, device_id)
    status = reading_status(latest)
    scaled_export = latest.scaled_energy_kwh if latest else 0
    energy_wh = latest.energy_wh if latest else 0
    return {
        "device_id": device_id,
        "display_name": user.prosumer_profile.display_name if user and user.prosumer_profile else None,
        "voltage_v": round(latest.voltage_v, 3) if latest else 0,
        "current_a": round(latest.current_a, 3) if latest else 0,
        "power_w": round(latest.power_w, 3) if latest else 0,
        "energy_wh": round(energy_wh, 3),
        "scaled_energy_kwh": energy.kwh(scaled_export),
        "device_status": status,
        "last_update": latest.created_at.isoformat() if latest else None,
        "estimated_earnings_today": energy.money(scaled_export * energy.PROSUMER_BUYBACK_RATE),
        "scale_factor": ESP_DEMO_SCALE_FACTOR,
    }


def meter_monthly_scaled_totals(db: Session) -> dict[str, float]:
    readings = db.query(models.MeterReading).order_by(models.MeterReading.created_at.asc()).all()
    latest_by_day: dict[tuple[str, str], models.MeterReading] = {}
    for reading in readings:
        created_at = reading.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        day_key = (reading.device_id, created_at.date().isoformat())
        latest_by_day[day_key] = reading

    totals: dict[str, float] = {}
    for reading in latest_by_day.values():
        created_at = reading.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        month_key = created_at.strftime("%Y-%m")
        totals[month_key] = totals.get(month_key, 0) + float(reading.scaled_energy_kwh or 0)
    return totals
