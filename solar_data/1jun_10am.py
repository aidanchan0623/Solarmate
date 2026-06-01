import serial
import sqlite3
from datetime import datetime

SERIAL_PORT = "COM7"   # Change this to your ESP32 port
BAUD_RATE = 115200
DB_NAME = "ina219_data.db"

conn = sqlite3.connect(DB_NAME)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS meter_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recorded_at TEXT NOT NULL,
    voltage_V REAL,
    current_mA REAL,
    power_mW REAL,
    energy_Wh REAL
)
""")

conn.commit()

ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)

print("Connected to ESP32")
print("Saving real-time data to:", DB_NAME)
print("Press CTRL + C to stop")
print()

try:
    while True:
        line = ser.readline().decode("utf-8", errors="ignore").strip()

        if not line:
            continue

        if line.startswith("voltage_V"):
            print("Header received:", line)
            continue

        if line.startswith("ERROR"):
            print(line)
            continue

        try:
            parts = line.split(",")

            if len(parts) != 4:
                print("Invalid line:", line)
                continue

            voltage_V = float(parts[0])
            current_mA = float(parts[1])
            power_mW = float(parts[2])
            energy_Wh = float(parts[3])

            real_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            cursor.execute("""
            INSERT INTO meter_readings (
                recorded_at,
                voltage_V,
                current_mA,
                power_mW,
                energy_Wh
            )
            VALUES (?, ?, ?, ?, ?)
            """, (
                real_time,
                voltage_V,
                current_mA,
                power_mW,
                energy_Wh
            ))

            conn.commit()

            print(
                f"{real_time} | "
                f"V={voltage_V:.3f} V | "
                f"I={current_mA:.2f} mA | "
                f"P={power_mW:.2f} mW | "
                f"E={energy_Wh:.6f} Wh"
            )

        except Exception as e:
            print("Error processing line:", line)
            print(e)

except KeyboardInterrupt:
    print()
    print("Stopped by user")

finally:
    ser.close()
    conn.close()
    print("Serial and database closed")