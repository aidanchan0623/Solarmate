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
esp_router = APIRouter()
LCD_DEMO_SESSIONS: dict[str, list[dict]] = {}


def malaysia_time_string(value) -> str | None:
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=energy.MALAYSIA_TZ)
    return value.astimezone(energy.MALAYSIA_TZ).strftime("%Y-%m-%d %H:%M:%S")


def malaysia_time_iso(value) -> str | None:
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=energy.MALAYSIA_TZ)
    return value.astimezone(energy.MALAYSIA_TZ).isoformat()


def short_date_label(day) -> str:
    return f"{day.strftime('%b')} {day.day}"


def request_body_for_log(payload: schemas.MeterReadingRequest) -> dict:
    data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    if data.get("device_secret"):
        data["device_secret"] = "***"
    return data


def lcd_demo_day() -> date:
    return energy.malaysia_today()


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
    simulated_date = lcd_demo_day()
    split = split_generated_energy(device_id, simulated_date, reading.scaled_energy_kwh)
    record = {
        "simulated_date": simulated_date,
        "generated_kwh": split["generated_kwh"],
        "local_consumption_kwh": split["local_consumption_kwh"],
        "daily_export_kwh": split["net_export_kwh"],
        "last_updated": reading.created_at,
    }

    for index, existing_record in enumerate(records):
        if existing_record["simulated_date"] == simulated_date:
            records[index] = record
            break
    else:
        records.append(record)

    records.sort(key=lambda item: item["simulated_date"])


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


def lcd_month_to_date_generation(device_id: str, simulated_date: date) -> float:
    records = LCD_DEMO_SESSIONS.get(device_id) or []
    month_total = sum(
        float(record["generated_kwh"] or 0)
        for record in records
        if record["simulated_date"].year == simulated_date.year
        and record["simulated_date"].month == simulated_date.month
        and record["simulated_date"] <= simulated_date
    )
    return energy.kwh(month_total)


def latest_esp_payload(db: Session, device_id: str = meter_utils.ESP_DEVICE_ID) -> schemas.EspLatestResponse:
    user = meter_utils.device_user(db, device_id)
    latest = meter_utils.latest_reading(db, device_id)
    current_day = energy.malaysia_today()

    if not user or not latest:
        return schemas.EspLatestResponse(
            device_id=device_id,
            voltage_v=0,
            current_a=0,
            power_w=0,
            energy_wh=0,
            scaled_energy_kwh=0,
            generated_kwh=0,
            local_consumption_kwh=0,
            daily_export_kwh=0,
            monthly_export_kwh=0,
            monthly_generation_kwh=0,
            estimated_earnings_today=0,
            device_status="No Data",
            date_key=current_day.isoformat(),
            date_label=short_date_label(current_day),
            last_updated=None,
            last_update=None,
        )

    lcd_record = latest_lcd_record(device_id)
    if lcd_record:
        generated = energy.kwh(lcd_record["generated_kwh"])
        local_consumption = energy.kwh(lcd_record["local_consumption_kwh"])
        daily_export = energy.kwh(lcd_record["daily_export_kwh"])
        simulated_date = lcd_record["simulated_date"]
        monthly_export = lcd_month_to_date_export(device_id, simulated_date)
        monthly_generation = lcd_month_to_date_generation(device_id, simulated_date)
    else:
        generated = energy.kwh(latest.scaled_energy_kwh)
        split = split_generated_energy(device_id, current_day, generated)
        local_consumption = split["local_consumption_kwh"]
        daily_export = split["net_export_kwh"]
        monthly_export = daily_export
        monthly_generation = generated

    return schemas.EspLatestResponse(
        device_id=device_id,
        voltage_v=round(latest.voltage_v, 3),
        current_a=round(latest.current_a, 3),
        power_w=round(latest.power_w, 3),
        energy_wh=round(latest.energy_wh, 3),
        scaled_energy_kwh=energy.kwh(latest.scaled_energy_kwh),
        generated_kwh=generated,
        local_consumption_kwh=local_consumption,
        daily_export_kwh=daily_export,
        monthly_export_kwh=monthly_export,
        monthly_generation_kwh=monthly_generation,
        estimated_earnings_today=energy.money(daily_export * energy.PROSUMER_BUYBACK_RATE),
        device_status=meter_utils.reading_status(latest),
        date_key=current_day.isoformat(),
        date_label=short_date_label(current_day),
        last_updated=malaysia_time_string(latest.created_at),
        last_update=latest.created_at.isoformat(),
    )


def latest_meter_reading_payload(
    db: Session,
    device_id: str = meter_utils.ESP_DEVICE_ID,
) -> schemas.LatestMeterReadingResponse:
    if not meter_utils.device_user(db, device_id):
        raise HTTPException(status_code=404, detail="Unknown SolarMate device_id")

    latest = meter_utils.latest_reading(db, device_id)
    esp_payload = latest_esp_payload(db, device_id)
    created_at = latest.created_at.isoformat() if latest else None
    return schemas.LatestMeterReadingResponse(
        device_id=device_id,
        voltage_v=round(latest.voltage_v, 3) if latest else 0,
        current_a=round(latest.current_a, 3) if latest else 0,
        power_w=round(latest.power_w, 3) if latest else 0,
        energy_wh=round(latest.energy_wh, 3) if latest else 0,
        scaled_energy_kwh=energy.kwh(latest.scaled_energy_kwh) if latest else 0,
        generated_kwh=esp_payload.generated_kwh,
        local_consumption_kwh=esp_payload.local_consumption_kwh,
        daily_export_kwh=esp_payload.daily_export_kwh,
        monthly_export_kwh=esp_payload.monthly_export_kwh,
        monthly_generation_kwh=esp_payload.monthly_generation_kwh,
        estimated_earnings_today=esp_payload.estimated_earnings_today,
        date_key=esp_payload.date_key,
        date_label=esp_payload.date_label,
        created_at=created_at,
        last_updated=esp_payload.last_updated,
        last_update=created_at,
        status=meter_utils.reading_status(latest),
    )


def log_latest_meter_reading(route: str, payload: schemas.LatestMeterReadingResponse) -> None:
    print(
        "[ESP DEBUG] returning latest meter reading",
        {
            "route": route,
            "device_id": payload.device_id,
            "voltage_v": payload.voltage_v,
            "current_a": payload.current_a,
            "power_w": payload.power_w,
            "energy_wh": payload.energy_wh,
            "scaled_energy_kwh": payload.scaled_energy_kwh,
            "created_at": payload.created_at,
        },
    )


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
    print("[ESP DEBUG] POST /api/meter/reading received body", request_body_for_log(payload))
    if payload.device_secret and payload.device_secret != meter_utils.ESP_DEVICE_SECRET:
        raise HTTPException(status_code=403, detail="Invalid device secret")

    power_w = payload.power_w
    if power_w is None:
        power_w = payload.voltage_v * payload.current_a

    reading = save_reading(
        db=db,
        device_id=payload.device_id,
        voltage_v=payload.voltage_v,
        current_a=payload.current_a,
        power_w=power_w,
        energy_wh=payload.energy_wh,
    )
    if payload.device_id == meter_utils.ESP_DEVICE_ID:
        print(
            "[ESP DEBUG] received ESP data",
            {
                "device_id": payload.device_id,
                "voltage_v": round(payload.voltage_v, 3),
                "current_a": round(payload.current_a, 3),
                "power_w": round(power_w, 3),
                "energy_wh": round(payload.energy_wh, 3),
                "scaled_energy_kwh": energy.kwh(reading.scaled_energy_kwh),
                "created_at": malaysia_time_string(reading.created_at),
            },
        )
    return {
        "status": "ok",
        "message": "Reading saved",
        "device_id": payload.device_id,
    }


@router.get("/latest", response_model=schemas.LatestMeterReadingResponse)
def get_latest_default(
    device_id: str = meter_utils.ESP_DEVICE_ID,
    db: Session = Depends(get_db),
):
    payload = latest_meter_reading_payload(db, device_id)
    log_latest_meter_reading("/api/meter/latest", payload)
    return payload


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
    payload = latest_meter_reading_payload(db, device_id)
    log_latest_meter_reading(f"/api/meter/latest/{device_id}", payload)
    return payload


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
    latest_payload = latest_meter_reading_payload(db, device_id) if user else None

    def latest_fields() -> dict:
        if not latest_payload:
            return {
                "voltage_v": 0,
                "current_a": 0,
                "power_w": 0,
                "energy_wh": 0,
                "scaled_energy_kwh": 0,
                "created_at": None,
                "last_update": None,
                "status": "No Data",
            }
        return {
            "voltage_v": latest_payload.voltage_v,
            "current_a": latest_payload.current_a,
            "power_w": latest_payload.power_w,
            "energy_wh": latest_payload.energy_wh,
            "scaled_energy_kwh": latest_payload.scaled_energy_kwh,
            "created_at": latest_payload.created_at,
            "last_update": latest_payload.last_update,
            "status": latest_payload.status,
        }

    if not user or not lcd_record:
        response = {
            "device_id": device_id,
            "date_key": current_day.isoformat(),
            "current_date_iso": current_day.isoformat(),
            "date_label": short_date_label(current_day),
            "current_date_label": short_date_label(current_day),
            "generated_kwh": latest_payload.generated_kwh if latest_payload else 0,
            "local_consumption_kwh": latest_payload.local_consumption_kwh if latest_payload else 0,
            "daily_export_kwh": latest_payload.daily_export_kwh if latest_payload else 0,
            "month_label": current_day.strftime("%b %Y"),
            "monthly_export_kwh": latest_payload.monthly_export_kwh if latest_payload else 0,
            "monthly_generation_kwh": latest_payload.monthly_generation_kwh if latest_payload else 0,
            "last_updated": latest_payload.last_updated if latest_payload else None,
            "last_updated_iso": latest_payload.last_update if latest_payload else None,
            **latest_fields(),
        }
        print("[ESP DEBUG] returning LCD summary", response)
        return response

    simulated_date = lcd_record["simulated_date"]
    response = {
        "device_id": device_id,
        "date_key": simulated_date.isoformat(),
        "current_date_iso": simulated_date.isoformat(),
        "date_label": short_date_label(simulated_date),
        "current_date_label": short_date_label(simulated_date),
        "generated_kwh": energy.kwh(lcd_record["generated_kwh"]),
        "local_consumption_kwh": energy.kwh(lcd_record["local_consumption_kwh"]),
        "daily_export_kwh": energy.kwh(lcd_record["daily_export_kwh"]),
        "month_label": simulated_date.strftime("%b %Y"),
        "monthly_export_kwh": lcd_month_to_date_export(device_id, simulated_date),
        "monthly_generation_kwh": lcd_month_to_date_generation(device_id, simulated_date),
        "last_updated": malaysia_time_string(lcd_record["last_updated"]),
        "last_updated_iso": malaysia_time_iso(lcd_record["last_updated"]),
        **latest_fields(),
    }
    print("[ESP DEBUG] returning LCD summary", response)
    return response


@esp_router.get("/latest", response_model=schemas.EspLatestResponse)
def get_latest_esp_data(
    device_id: str = meter_utils.ESP_DEVICE_ID,
    db: Session = Depends(get_db),
):
    payload = latest_esp_payload(db, device_id)
    print(
        "[ESP DEBUG] exposing latest ESP data",
        {
            "device_id": payload.device_id,
            "generated_kwh": payload.generated_kwh,
            "daily_export_kwh": payload.daily_export_kwh,
            "last_updated": payload.last_updated,
        },
    )
    return payload
