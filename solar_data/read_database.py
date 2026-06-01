import sqlite3

DB_NAME = "ina219_data.db"

conn = sqlite3.connect(DB_NAME)
cursor = conn.cursor()

cursor.execute("""
SELECT id, recorded_at, voltage_V, current_mA, power_mW, energy_Wh
FROM meter_readings
ORDER BY id ASC
""")

rows = cursor.fetchall()

for row in rows:
    id, recorded_at, voltage, current, power, energy = row

    print(
        f"{id} | {recorded_at} | "
        f"V={voltage:.3f} V | "
        f"I={current:.2f} mA | "
        f"P={power:.2f} mW | "
        f"E={energy:.6f} Wh"
    )

conn.close()