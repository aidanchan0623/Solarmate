/*
  SolarMate ESP32 prototype sender

  IMPORTANT:
  - ESP32 cannot use 127.0.0.1 to reach your laptop backend.
  - Run `ipconfig` on the laptop and use the IPv4 address in API_URL.
  - Example: http://192.168.1.25:8000/api/meter/reading

  This example starts with mock voltage/current values so you can test the
  backend first. If you add an INA219 sensor later, replace readVoltage()
  and readCurrent() with INA219 readings.
*/

#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "http://YOUR_LAPTOP_IP:8000/api/meter/reading";
const char* DEVICE_ID = "ESP32_SOLARMATE_001";
const char* DEVICE_SECRET = "solarmate-demo-key";

unsigned long lastSendMs = 0;
unsigned long lastEnergyMs = 0;
float accumulatedWh = 0.0;

float readVoltage() {
  // Mock low-voltage DC prototype value.
  return 8.2 + (random(-15, 15) / 100.0);

  // Optional INA219 idea:
  // return ina219.getBusVoltage_V();
}

float readCurrent() {
  // Mock current for LED/small-load prototype testing.
  return 0.12 + (random(-4, 4) / 1000.0);

  // Optional INA219 idea:
  // return ina219.getCurrent_mA() / 1000.0;
}

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected. ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

void sendReading(float voltage, float current, float power, float energyWh) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"device_secret\":\"" + String(DEVICE_SECRET) + "\",";
  payload += "\"voltage_v\":" + String(voltage, 3) + ",";
  payload += "\"current_a\":" + String(current, 3) + ",";
  payload += "\"power_w\":" + String(power, 3) + ",";
  payload += "\"energy_wh\":" + String(energyWh, 3);
  payload += "}";

  int statusCode = http.POST(payload);
  Serial.print("POST status: ");
  Serial.println(statusCode);
  Serial.println(payload);
  http.end();
}

void setup() {
  Serial.begin(115200);
  randomSeed(analogRead(0));
  connectWiFi();
  lastEnergyMs = millis();
}

void loop() {
  unsigned long now = millis();
  float voltage = readVoltage();
  float current = readCurrent();
  float power = voltage * current;

  float elapsedHours = (now - lastEnergyMs) / 3600000.0;
  accumulatedWh += power * elapsedHours;
  lastEnergyMs = now;

  if (now - lastSendMs >= 5000) {
    sendReading(voltage, current, power, accumulatedWh);
    lastSendMs = now;
  }
}
