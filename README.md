# SolarMate Prototype

SolarMate is a React/Vite + FastAPI prototype for community-based solar energy sharing. It keeps simulated role dashboards for normal users and includes one ESP32-connected prosumer prototype account.

## Run Backend

```powershell
cd backend
pip install -r requirements.txt
python seed.py
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Use `--host 0.0.0.0` when the ESP32 must reach the laptop backend.

## Run Frontend

```powershell
npm install
npm run dev
```

If PowerShell blocks npm scripts, use:

```powershell
npm.cmd install
npm.cmd run dev
```

## Demo Accounts

- Admin: `admin / admin123`
- Demo prosumer: `prosumer_demo / password123`
- Demo consumer: `consumer_demo / password123`
- ESP32 prosumer: `prosumeresp / password123`

## ESP32 Prototype

Device ID:

```text
ESP32_SOLARMATE_001
```

ESP32 POST endpoint:

```text
POST http://<laptop-ip>:8000/api/meter/reading
```

Example body:

```json
{
  "device_id": "ESP32_SOLARMATE_001",
  "device_secret": "solarmate-demo-key",
  "voltage_v": 8.2,
  "current_a": 0.12,
  "power_w": 0.984,
  "energy_wh": 4.35
}
```

The ESP32 cannot use `127.0.0.1` to reach your laptop. Find your laptop IPv4 address with:

```powershell
ipconfig
```

Then update `esp32/solarmate_esp32_sender.ino`:

```cpp
const char* API_URL = "http://YOUR_LAPTOP_IP:8000/api/meter/reading";
```

## ESP Demo Scaling

Real LED/prototype energy is very small, so SolarMate stores:

```text
scaled_export_kwh = energy_wh x 2.0
```

The UI displays both real prototype energy in Wh and demo-scaled export in kWh.
