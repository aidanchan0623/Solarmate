from calendar import monthrange
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import energy
import meter_utils
import models
import platform_summary
import schemas
from database import get_db

router = APIRouter()
LCD_DEMO_SESSIONS: dict[str, list[dict]] = {}


def malaysia_time_string(value) -> str | None:
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=energy.MALAYSIA_TZ)
    return value.astimezone(energy.MALAYSIA_TZ).strftime("%Y-%m-%d %H:%M:%S")


def short_date_label(day) -> str:
    return f"{day.strftime('%b')} {day.day}"


def simulated_day_for_packet(packet_index: int) -> date:
    today = energy.malaysia_today()
    month_days = monthrange(today.year, today.month)[1]
    zero_based = max(packet_index - 1, 0)
    month_offset, day_offset = divmod(zero_based, month_days)
    year, month = energy.add_months(today.year, today.month, month_offset)
    return date(year, month, day_offset + 1)


def local_consumption_ratio(device_id: str, simulated_date: date) -> float:
    ratio_seed = sum(ord(char) for char in f"{device_id}-{simulated_date.isoformat()}")
    return 0.35 + (ratio_seed % 21) / 100


def split_generated_energy(device_id: str, simulated_date: date, generated_kwh: float) -> dict:
    generated = energy.kwh(generated_kwh)
    local_consumption = energy.kwh(generated * local_consumption_ratio(device_id, simulated_date))
    net_export = energy.kwh(max(generated - local_consumption, 0))
    return {
        "generated_kwh": energy.kwh(local_consumption + net_export),
        "local_consumption_kwh": local_consumption,
        "net_export_kwh": net_export,
    }


def record_lcd_demo_packet(device_id: str, reading: models.MeterReading) -> None:
    if device_id != meter_utils.ESP_DEVICE_ID:
        return

    records = LCD_DEMO_SESSIONS.setdefault(device_id, [])
    simulated_date = simulated_day_for_packet(len(records) + 1)
    split = split_generated_energy(device_id, simulated_date, reading.scaled_energy_kwh)
    records.append(
        {
            "simulated_date": simulated_date,
            "generated_kwh": split["generated_kwh"],
            "local_consumption_kwh": split["local_consumption_kwh"],
            "daily_export_kwh": split["net_export_kwh"],
            "last_updated": reading.created_at,
        }
    )


def latest_lcd_record(device_id: str) -> dict | None:
    records = LCD_DEMO_SESSIONS.get(device_id) or []
    return records[-1] if records else None


def lcd_month_to_date_export(device_id: str, simulated_date: date) -> float:
    records = LCD_DEMO_SESSIONS.get(device_id) or []
    month_total = sum(
        float(record["daily_export_kwh"] or 0)
        for record in records
        if record["simulated_date"].year == simulated_date.year
        and record["simulated_date"].month == simulated_date.month
        and record["simulated_date"] <= simulated_date
    )
    return energy.kwh(month_total)


def reading_point(reading: models.MeterReading) -> schemas.MeterReadingPointResponse:
    created_at = reading.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=energy.MALAYSIA_TZ)
    return schemas.MeterReadingPointResponse(
        time=created_at.strftime("%H:%M"),
        voltage_v=round(reading.voltage_v, 3),
        current_a=round(reading.current_a, 3),
        power_w=round(reading.power_w, 3),
        energy_wh=round(reading.energy_wh, 3),
        scaled_energy_kwh=energy.kwh(reading.scaled_energy_kwh),
    )


def save_reading(
    db: Session,
    device_id: str,
    voltage_v: float,
    current_a: float,
    power_w: float,
    energy_wh: float,
) -> models.MeterReading:
    user = meter_utils.device_user(db, device_id)
    if not user:
        raise HTTPException(status_code=404, detail="Unknown SolarMate device_id")

    created_at = energy.malaysia_now()
    if device_id == meter_utils.ESP_DEVICE_ID:
        db.query(models.MeterReading).filter(
            models.MeterReading.device_id == device_id
        ).delete(synchronize_session=False)

    reading = models.MeterReading(
        device_id=device_id,
        user_id=user.id,
        voltage_v=round(voltage_v, 3),
        current_a=round(current_a, 3),
        power_w=round(power_w, 3),
        energy_wh=round(energy_wh, 3),
        scaled_energy_kwh=meter_utils.scale_energy(energy_wh),
        created_at=created_at,
    )
    db.add(reading)
    record_lcd_demo_packet(device_id, reading)

    if device_id != meter_utils.ESP_DEVICE_ID:
        date_string = created_at.date().isoformat()
        generated_today = energy.kwh(reading.scaled_energy_kwh)
        ratio_seed = sum(ord(char) for char in f"{device_id}-{date_string}")
        local_ratio = 0.35 + (ratio_seed % 21) / 100
        local_consumption = energy.kwh(generated_today * local_ratio)
        exported_today = energy.kwh(max(generated_today - local_consumption, 0))
        daily_record = (
            db.query(models.ProsumerDailyExport)
            .filter(
                models.ProsumerDailyExport.user_id == user.id,
                models.ProsumerDailyExport.date == date_string,
            )
            .first()
        )
        if not daily_record:
            daily_record = models.ProsumerDailyExport(user_id=user.id, date=date_string)
            db.add(daily_record)
        daily_record.exported_kwh = exported_today
        daily_record.local_consumption_kwh = local_consumption
        daily_record.generated_kwh = energy.kwh(exported_today + local_consumption)

        summary = platform_summary.upsert_monthly_summary(db, date_string[:7])
        summary.status = "Pending"
    db.commit()
    db.refresh(reading)
    return reading


@router.post("/reading", response_model=schemas.MeterReadingSavedResponse)
def post_reading(payload: schemas.MeterReadingRequest, db: Session = Depends(get_db)):
    if payload.device_secret and payload.device_secret != meter_utils.ESP_DEVICE_SECRET:
        raise HTTPException(status_code=403, detail="Invalid device secret")

    power_w = payload.power_w
    if power_w is None:
        power_w = payload.voltage_v * payload.current_a

    save_reading(
        db=db,
        device_id=payload.device_id,
        voltage_v=payload.voltage_v,
        current_a=payload.current_a,
        power_w=power_w,
        energy_wh=payload.energy_wh,
    )
    return {
        "status": "ok",
        "message": "Reading saved",
        "device_id": payload.device_id,
    }


@router.post("/simulate-reading", response_model=schemas.MeterReadingSavedResponse)
def simulate_reading(payload: schemas.SimulateMeterReadingRequest, db: Session = Depends(get_db)):
    latest = meter_utils.latest_reading(db, meter_utils.ESP_DEVICE_ID)
    power_w = payload.voltage_v * payload.current_a
    previous_energy_wh = latest.energy_wh if latest else 0
    energy_wh = previous_energy_wh + power_w * (5 / 3600)
    save_reading(
        db=db,
        device_id=meter_utils.ESP_DEVICE_ID,
        voltage_v=payload.voltage_v,
        current_a=payload.current_a,
        power_w=power_w,
        energy_wh=energy_wh,
    )
    return {
        "status": "ok",
        "message": "Simulated reading saved",
        "device_id": meter_utils.ESP_DEVICE_ID,
    }


@router.get("/latest/{device_id}", response_model=schemas.LatestMeterReadingResponse)
def get_latest(device_id: str, db: Session = Depends(get_db)):
    if not meter_utils.device_user(db, device_id):
        raise HTTPException(status_code=404, detail="Unknown SolarMate device_id")

    latest = meter_utils.latest_reading(db, device_id)
    status = meter_utils.reading_status(latest)
    return schemas.LatestMeterReadingResponse(
        device_id=device_id,
        voltage_v=round(latest.voltage_v, 3) if latest else 0,
        current_a=round(latest.current_a, 3) if latest else 0,
        power_w=round(latest.power_w, 3) if latest else 0,
        energy_wh=round(latest.energy_wh, 3) if latest else 0,
        scaled_energy_kwh=energy.kwh(latest.scaled_energy_kwh) if latest else 0,
        last_update=latest.created_at.isoformat() if latest else None,
        status=status,
    )


@router.get("/today/{device_id}", response_model=list[schemas.MeterReadingPointResponse])
def get_today(device_id: str, db: Session = Depends(get_db)):
    if not meter_utils.device_user(db, device_id):
        raise HTTPException(status_code=404, detail="Unknown SolarMate device_id")
    return [reading_point(reading) for reading in meter_utils.today_readings(db, device_id)]


@router.get("/lcd-summary/{device_id}")
def get_lcd_summary(device_id: str, db: Session = Depends(get_db)):
    user = meter_utils.device_user(db, device_id)
    current_day = energy.malaysia_today()
    lcd_record = latest_lcd_record(device_id)

    if not user or not lcd_record:
        return {
            "device_id": device_id,
            "date_label": short_date_label(current_day),
            "daily_export_kwh": 0,
            "month_label": current_day.strftime("%b %Y"),
            "monthly_export_kwh": 0,
            "last_updated": None,
        }

    simulated_date = lcd_record["simulated_date"]
    return {
        "device_id": device_id,
        "date_label": short_date_label(simulated_date),
        "daily_export_kwh": energy.kwh(lcd_record["daily_export_kwh"]),
        "month_label": simulated_date.strftime("%b %Y"),
        "monthly_export_kwh": lcd_month_to_date_export(device_id, simulated_date),
        "last_updated": malaysia_time_string(lcd_record["last_updated"]),
    }
