/*
 * ============================================================
 *  IIT Hyderabad – EE Lab Power Controller  v3.0
 *  Hardware : Seeed Studio XIAO ESP32-C3
 *  Libraries needed (install via Arduino Library Manager):
 *    1. Firebase ESP32 Client  by Mobizt  (search: "Firebase ESP Client")
 *    2. ArduinoJson             by Benoit Blanchon
 *
 *  IMPORTANT: Each ESP controls ONE table.
 *  Set TABLE_ID below to match the table (e.g. "T-01", "T-02" ... "T-10")
 * ============================================================
 *
 *  PIN MAP  (same as v2.0)
 *  ┌──────────┬────────┬──────────────────────────────────────────┐
 *  │ Label    │ GPIO   │ Function                                 │
 *  ├──────────┼────────┼──────────────────────────────────────────┤
 *  │ D0       │  2     │ ADC – Voltage divider (mains sense)      │
 *  │ D1       │  3     │ Emergency button (NO, active LOW)        │
 *  │ D2       │  4     │ ULN I3 → Relay 3  (HIGH = ON)           │
 *  │ D3       │  5     │ ULN I2 → Relay 2  (HIGH = ON)           │
 *  │ D4       │  6     │ ULN I1 → Relay 1  (HIGH = ON)           │
 *  │ D5       │  7     │ GREEN LED  (mains present)               │
 *  │ D10      │ 10     │ RED   LED  (battery / error)             │
 *  └──────────┴────────┴──────────────────────────────────────────┘
 *
 *  FIREBASE DATABASE PATHS used by this ESP:
 *    tables/<TABLE_ID>/isOn        → READ  (portal sets ON, ESP reads)
 *    tables/<TABLE_ID>/studentRoll → READ  (for logging only)
 *    power/<TABLE_ID>/source       → WRITE ("mains" | "battery")
 *    power/<TABLE_ID>/lastSeen     → WRITE (epoch ms, heartbeat)
 *    tables/<TABLE_ID>/isOn        → WRITE false  (on emergency / power loss)
 *    tables/<TABLE_ID>/studentRoll → WRITE null   (on emergency / power loss)
 *    tables/<TABLE_ID>/timestamp   → WRITE null
 *    tables/<TABLE_ID>/sessionEnd  → WRITE null
 * ============================================================
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include <time.h>

// ─────────────────────────────────────────────────────────────
//  EDIT THESE 5 LINES BEFORE UPLOADING
// ─────────────────────────────────────────────────────────────
#define WIFI_SSID       "WIFI_USERNAME"
#define WIFI_PASSWORD   "WIFI_PASSWORD"
#define TABLE_ID        "T-01"     // Change per ESP: T-01, T-02 … T-10

// From Firebase Console → Project Settings → General → Web API Key
#define FIREBASE_API_KEY  "AIzaSyAnQ02o76gdbtppvow-VptA11PoSBgWgtk"

// From Firebase Console → Realtime Database → copy URL (ends in .firebaseio.com)
#define DATABASE_URL  "https://iith-ee-lab-default-rtdb.asia-southeast1.firebasedatabase.app"
// ─────────────────────────────────────────────────────────────

// ── PINS ──────────────────────────────────────────────────────
#define PIN_MAINS_ADC    D0
#define PIN_EMERG_BTN    D1
#define PIN_RELAY3       D2
#define PIN_RELAY2       D3
#define PIN_RELAY1       D4
#define PIN_LED_GREEN    D5
#define PIN_LED_RED      D10

#define MAINS_THRESHOLD  500
#define DEBOUNCE_MS       50

// ── Firebase objects ──────────────────────────────────────────
FirebaseData   fbdo;
FirebaseData   fbdo2;   // second stream object for listening
FirebaseConfig config;

// ── State ─────────────────────────────────────────────────────
bool  mainsPresent   = false;
bool  lastMailsState = false;
bool  emergTripped   = false;
bool  relayState     = false;

bool  lastBtnReading = HIGH;
bool  btnWasPressed  = false;
unsigned long lastDebounce   = 0;
unsigned long lastHeartbeat  = 0;
unsigned long lastFirebaseRead = 0;

#define HEARTBEAT_INTERVAL_MS   10000   // send heartbeat every 10 s
#define FIREBASE_POLL_MS         2000   // check isOn every 2 s

String tablePath   = "tables/" + String(TABLE_ID);
String powerPath   = "power/"  + String(TABLE_ID);

// ─────────────────────────────────────────────────────────────
//  RELAY CONTROL
// ─────────────────────────────────────────────────────────────
void setRelays(bool on) {
  digitalWrite(PIN_RELAY1, on ? HIGH : LOW);
  digitalWrite(PIN_RELAY2, on ? HIGH : LOW);
  digitalWrite(PIN_RELAY3, on ? HIGH : LOW);
  relayState = on;
  Serial.printf("[RELAY] → %s\n", on ? "ON" : "OFF");
}

void updateLED(bool mains) {
  digitalWrite(PIN_LED_GREEN, mains ? HIGH : LOW);
  digitalWrite(PIN_LED_RED,   mains ? LOW  : HIGH);
}

// ─────────────────────────────────────────────────────────────
//  FIREBASE HELPERS
// ─────────────────────────────────────────────────────────────

// Mark this table as OFF in Firebase (deallocate)
void firebaseDeallocate(const char* reason) {
  Serial.printf("[FB] Deallocating table: %s\n", reason);

  Firebase.RTDB.setBool(&fbdo,   (tablePath + "/isOn").c_str(), false);
}

// Send power source to Firebase
void firebaseSetPower(const char* source) {
  bool ok1 = Firebase.RTDB.setString(&fbdo, (powerPath + "/source").c_str(),   source);
  bool ok2 = Firebase.RTDB.setString(&fbdo, (powerPath + "/lastSeen").c_str(), getReadableTime()); // ← readable
  Serial.printf("[FB] Power write → source=%s  ok=%d/%d\n", source, ok1, ok2);
  if (!ok1) Serial.printf("    Error: %s\n", fbdo.errorReason().c_str());
}

void syncTime() {
  configTime(5 * 3600 + 30 * 60, 0, "pool.ntp.org"); // IST = UTC+5:30
  Serial.print("[NTP] Syncing time");
  struct tm t;
  int attempts = 0;
  while (!getLocalTime(&t) && attempts < 20) {
    delay(500); Serial.print("."); attempts++;
  }
  Serial.println();
  if (attempts < 20) Serial.println("[NTP] Time synced");
  else               Serial.println("[NTP] Sync failed — using uptime");
}

String getReadableTime() {
  struct tm t;
  if (getLocalTime(&t)) {
    char buf[32];
    // Format: "07/05/2026, 03:45:12 pm"
    strftime(buf, sizeof(buf), "%d/%m/%Y, %I:%M:%S %p", &t);
    // strftime gives uppercase AM/PM — convert to lowercase
    String s = String(buf);
    s.toLowerCase();
    // But that lowercases everything — fix day/month back
    // Easier: build manually
    char buf2[32];
    int h = t.tm_hour;
    const char* ampm = h >= 12 ? "pm" : "am";
    if (h > 12) h -= 12;
    if (h == 0) h = 12;
    snprintf(buf2, sizeof(buf2), "%02d/%02d/%04d, %02d:%02d:%02d %s",
      t.tm_mday, t.tm_mon+1, t.tm_year+1900,
      h, t.tm_min, t.tm_sec, ampm);
    return String(buf2);
  }
  // Fallback: uptime
  unsigned long s = millis() / 1000;
  char buf[20];
  snprintf(buf, sizeof(buf), "uptime %02lu:%02lu:%02lu", s/3600, (s%3600)/60, s%60);
  return String(buf);
}

// Separate counter read + increment for numeric log IDs
void firebaseAddLog(const char* message, const char* type) {
  if (!Firebase.ready()) return;

  // Step 1: Get current log count
  int nextId = 1;
  if (Firebase.RTDB.getInt(&fbdo2, "logCount")) {
    nextId = fbdo2.intData() + 1;
  }

  // Step 2: Build log entry — NO label field
  String path = "logs/" + String(nextId);
  FirebaseJson json;
  json.set("message",   message);
  json.set("tableId",   TABLE_ID);
  json.set("type",      type);
  json.set("timestamp", getReadableTime());  // human readable string

  bool ok = Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json);
  Serial.printf("[FB] Log #%d write ok=%d  msg=%s\n", nextId, ok, message);

  // Step 3: Update counter
  if (ok) Firebase.RTDB.setInt(&fbdo, "logCount", nextId);
}

// Read isOn from Firebase
bool firebaseReadIsOn() {
  if (Firebase.RTDB.getBool(&fbdo2, (tablePath + "/isOn").c_str())) {
    return fbdo2.boolData();
  }
  return relayState; // fallback to current state on read error
}

// ─────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println("\n=== IIT-H EE Lab ESP32 v3.0 ===");
  Serial.printf("Table: %s\n", TABLE_ID);

  // GPIO init
  pinMode(PIN_RELAY1,    OUTPUT); digitalWrite(PIN_RELAY1, LOW);
  pinMode(PIN_RELAY2,    OUTPUT); digitalWrite(PIN_RELAY2, LOW);
  pinMode(PIN_RELAY3,    OUTPUT); digitalWrite(PIN_RELAY3, LOW);
  pinMode(PIN_LED_GREEN, OUTPUT); digitalWrite(PIN_LED_GREEN, LOW);
  pinMode(PIN_LED_RED,   OUTPUT); digitalWrite(PIN_LED_RED, HIGH); // RED on during boot
  pinMode(PIN_EMERG_BTN, INPUT_PULLUP);
  analogReadResolution(12);
  Serial.println("[GPIO] All relays OFF");

  // WiFi
  Serial.printf("[WiFi] Connecting to %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint8_t att = 0;
  while (WiFi.status() != WL_CONNECTED && att < 40) {
    delay(500); att++;
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Connected  IP=%s\n", WiFi.localIP().toString().c_str());
    syncTime();
  } else {
    Serial.println("[WiFi] FAILED — running offline");
    // Blink red rapidly
    for (int i = 0; i < 10; i++) {
      digitalWrite(PIN_LED_RED, HIGH); delay(150);
      digitalWrite(PIN_LED_RED, LOW);  delay(150);
    }
  }

  // Firebase
  config.api_key      = FIREBASE_API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = "5RFhLer9K24lkmJdqD4DI9QeSpST9qMLCpQRcAzI";

  Firebase.begin(&config, NULL);
  Firebase.reconnectWiFi(true);

  Serial.println("[Firebase] Waiting for ready...");
  unsigned long fbWait = millis();
  while (!Firebase.ready() && millis() - fbWait < 10000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();

  if (Firebase.ready()) {
    firebaseSetPower("mains");
    Serial.println("[Firebase] Connected OK");
  } else {
    Serial.println("[Firebase] FAILED — check Database Secret and URL");
  }

  // Turn off red LED — ready
  digitalWrite(PIN_LED_RED, LOW);
  Serial.println("[Boot] Ready.");
}

// ─────────────────────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────────────────────
void loop() {

  // ── Mains sense ─────────────────────────────────────────────
  bool mains = analogRead(PIN_MAINS_ADC) > MAINS_THRESHOLD;
  if (mains != lastMailsState) {
    lastMailsState = mains;
    mainsPresent   = mains;
    updateLED(mains);
    const char* src = mains ? "mains" : "battery";
    Serial.printf("[POWER] Source: %s\n", src);
    firebaseSetPower(src);

    // Power cut while relays were ON → deallocate
    if (!mains && relayState) {
      Serial.println("[POWER] Mains lost while relays ON — deallocating");
      setRelays(false);
      firebaseDeallocate("mains_lost");
      firebaseAddLog("Mains power lost — relays turned OFF", "power"); // ← ADD THIS
    } else if (mains) {
      firebaseAddLog("Mains power restored", "power"); // ← ADD THIS
    }
  }
  mainsPresent = mains;

  // ── Emergency button ─────────────────────────────────────────
  bool reading = digitalRead(PIN_EMERG_BTN);
  if (reading != lastBtnReading) lastDebounce = millis();

  if ((millis() - lastDebounce) > DEBOUNCE_MS) {
    if (reading == LOW && !btnWasPressed) {
      btnWasPressed = true;
      if (!emergTripped) {
        emergTripped = true;
        Serial.println("[EMERG] Button pressed — turning OFF relays");
        setRelays(false);
        // Tell Firebase: relays are OFF due to emergency
        firebaseDeallocate("emergency_button");
        firebaseAddLog("Emergency button pressed — relays OFF", "emergency");
      }
    }
    if (reading == HIGH && btnWasPressed) {
      btnWasPressed = false;
      emergTripped  = false;   // Auto-reset latch when button released
      Serial.println("[EMERG] Button released — latch cleared");
    }
  }
  lastBtnReading = reading;

  // ── Poll Firebase for isOn ───────────────────────────────────
  if (Firebase.ready() && (millis() - lastFirebaseRead > FIREBASE_POLL_MS)) {
    lastFirebaseRead = millis();

    // Only follow Firebase if no emergency latch
    if (!emergTripped) {
      bool fbOn = firebaseReadIsOn();
      if (fbOn != relayState) {
        Serial.printf("[FB] isOn changed to %s → updating relays\n", fbOn ? "TRUE" : "FALSE");
        setRelays(fbOn);
      }
    }
  }

  // ── Heartbeat ────────────────────────────────────────────────
  if (Firebase.ready() && (millis() - lastHeartbeat > HEARTBEAT_INTERVAL_MS)) {
    lastHeartbeat = millis();
    const char* src = mainsPresent ? "mains" : "battery";
    Firebase.RTDB.setString(&fbdo, (powerPath + "/source").c_str(),   src);
    Firebase.RTDB.setInt(&fbdo,    (powerPath + "/lastSeen").c_str(),  millis());
  }

  delay(20);
}
