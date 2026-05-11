# IIT Hyderabad – EE Lab Portal
## Complete Setup Guide

---

## OVERVIEW

This system has 3 parts:
1. **React Web Portal** (runs on localhost) — Staff + Student interfaces
2. **Firebase Realtime Database** — Central data store (cloud, free tier)
3. **ESP32 Firmware** — One sketch uploaded per table's ESP32-C3

---

## PART 1: FIREBASE SETUP (Do this FIRST)

### Step 1.1 — Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Name it: `iith-ee-lab` (or anything)
4. Disable Google Analytics (not needed) → **Create project**

### Step 1.2 — Enable Realtime Database
1. In left sidebar → **Build → Realtime Database**
2. Click **"Create Database"**
3. Choose location: **asia-southeast1 (Singapore)** (closest to India)
4. Start in **Test mode** (allows read/write for 30 days — change rules later)
5. Click **Enable**

### Step 1.3 — Enable Anonymous Authentication
1. In left sidebar → **Build → Authentication**
2. Click **"Get started"**
3. Click **"Anonymous"** under Sign-in providers
4. Toggle it **ON** → Save

### Step 1.4 — Get your Firebase Config
1. In left sidebar → ⚙️ **Project Settings**
2. Scroll down to **"Your apps"** section
3. Click **"</> Web"** icon
4. Register app with nickname `lab-portal`
5. You will see a config block like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "iith-ee-lab.firebaseapp.com",
  databaseURL: "https://iith-ee-lab-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iith-ee-lab",
  storageBucket: "iith-ee-lab.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefabcdef"
};
```

6. **Copy this entire block** — you'll need it next.

### Step 1.5 — Set Database Rules (for production)
In Realtime Database → **Rules** tab, replace with:

```json
{
  "rules": {
    "tables": {
      ".read": true,
      ".write": true
    },
    "power": {
      ".read": true,
      ".write": true
    }
  }
}
```

Click **Publish**.

---

## PART 2: WEB PORTAL SETUP

### Step 2.1 — Install Node.js
- Download from https://nodejs.org → Install the **LTS** version

### Step 2.2 — Extract / copy the project folder
Place the `iith-lab-portal` folder anywhere on your PC (e.g., `C:\Users\You\Desktop\iith-lab-portal`)

### Step 2.3 — Add your Firebase config
Open the file:
```
iith-lab-portal/src/firebase/config.js
```

Replace the placeholder values with YOUR actual config from Step 1.4:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXX...",          // ← paste yours
  authDomain: "iith-ee-lab.firebaseapp.com",
  databaseURL: "https://iith-ee-lab-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iith-ee-lab",
  storageBucket: "iith-ee-lab.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef..."
};
```

### Step 2.4 — Change Staff Password (optional)
Open `src/pages/StaffLoginPage.jsx`, find line:
```javascript
const STAFF_PASSWORD = "iith@ee2024";
```
Change the password to whatever you want.

### Step 2.5 — Install dependencies & run
Open Terminal (or Command Prompt / PowerShell) in the project folder:

```bash
cd iith-lab-portal
npm install
npm start
```

Wait ~30 seconds. Browser opens automatically at:
**http://localhost:3000**

That's it! The portal is running. Keep the terminal open.

---

## PART 3: ESP32 FIRMWARE SETUP

### Step 3.1 — Install Arduino IDE
Download from https://www.arduino.cc/en/software

### Step 3.2 — Add ESP32 board support
1. Open Arduino IDE → **File → Preferences**
2. In "Additional boards manager URLs" add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Click OK
4. Go to **Tools → Board → Boards Manager**
5. Search "esp32" → Install **"esp32 by Espressif Systems"** (version 2.x)

### Step 3.3 — Install required libraries
In Arduino IDE → **Sketch → Include Library → Manage Libraries**

Install these two (search by name):
- **Firebase ESP Client** by Mobizt (version 4.x)
- **ArduinoJson** by Benoit Blanchon

### Step 3.4 — Configure the sketch
Open `esp32_firmware/lab_controller_v3.ino`

Edit the top section (lines with ★):

```cpp
#define WIFI_SSID       "YourWiFiName"
#define WIFI_PASSWORD   "YourWiFiPassword"
#define TABLE_ID        "T-01"     // ← CHANGE THIS for each ESP!

#define FIREBASE_API_KEY  "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX"
#define DATABASE_URL      "https://iith-ee-lab-default-rtdb.asia-southeast1.firebasedatabase.app"
```

**For each table ESP, only change `TABLE_ID`**:
- Table 1 → `"T-01"`, Table 2 → `"T-02"` ... Table 10 → `"T-10"`

The API key and database URL stay the same for all ESPs.

### Step 3.5 — Upload
1. Select board: **Tools → Board → ESP32 Arduino → XIAO_ESP32C3**
2. Select port: **Tools → Port** (the COM port that appears when you plug in USB)
3. Click **Upload** (→ button)
4. Repeat for each table's ESP with the correct TABLE_ID

### Step 3.6 — Verify in Firebase
After uploading, open Serial Monitor (115200 baud) and you should see:
```
=== IIT-H EE Lab ESP32 v3.0 ===
Table: T-01
[GPIO] All relays OFF
[WiFi] Connecting to YourWiFi
[WiFi] Connected  IP=192.168.x.x
[Firebase] Initialised
[Boot] Ready.
```

In Firebase Console → Realtime Database, you should see:
```
power/
  T-01/
    source: "mains"
    lastSeen: 12345
```

---

## PART 4: HOW EVERYTHING WORKS TOGETHER

### Student Flow
1. Student opens http://localhost:3000 → **Student Portal**
2. Enters roll number → **Next**
3. Sees dropdown of available tables (those not `isOn` in Firebase)
4. Selects table → **Allocate Table**
5. Portal writes to Firebase: `tables/T-01/isOn = true`, studentRoll, sessionEnd
6. ESP32 for T-01 sees `isOn = true` → turns ON its 3 relays
7. Confirmation screen shows: "Go to table T-01, power is ON"
8. After 3 hours: portal sets `isOn = false` → ESP turns OFF relays

### Staff Flow
1. Staff opens http://localhost:3000 → **Technical Staff Portal**
2. Logs in with password
3. Sees all 10 tables with live status, countdown timers
4. Can click **End Session** on any table → sets `isOn = false` in Firebase → ESP turns OFF
5. **ALL OFF** button → deallocates all tables at once

### Power Cut Handling
- ESP detects mains voltage drops below threshold
- Sets `power/T-01/source = "battery"` in Firebase
- If relays were ON, ESP sets `tables/T-01/isOn = false` and clears studentRoll
- Staff portal shows "Battery" badge for that table
- Table becomes available again for new student

### ESP Offline Detection
- Each ESP sends a heartbeat (lastSeen timestamp) to Firebase every 10 seconds
- If `lastSeen` is old (>30s), the portal can flag it as offline
- Power badge shows "🔴 Offline"

### Emergency Button
- Student/staff presses hardware button on the table
- ESP immediately turns OFF relays
- ESP writes `isOn = false` to Firebase
- Table shows as available in staff portal
- Latch clears automatically when button is released

---

## DATABASE STRUCTURE REFERENCE

```
Firebase Realtime Database
├── tables/
│   ├── T-01/
│   │   ├── isOn        : false         ← boolean, main relay state
│   │   ├── studentRoll : "EE22B..."    ← string, null when unoccupied
│   │   ├── timestamp   : 1715000000000 ← epoch ms when session started
│   │   └── sessionEnd  : 1715010800000 ← epoch ms when session expires
│   ├── T-02/ ...
│   └── T-10/
└── power/
    ├── T-01/
    │   ├── source   : "mains"   ← "mains" | "battery" | "offline"
    │   └── lastSeen : 12345678  ← millis() from ESP heartbeat
    ├── T-02/ ...
    └── T-10/
```

---

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Portal won't start | Run `npm install` first, then `npm start` |
| Firebase errors in console | Double-check config.js values, especially databaseURL |
| ESP won't connect to WiFi | Check SSID/password, ensure 2.4GHz network |
| ESP won't connect to Firebase | Check API key and DATABASE_URL |
| Relay not turning ON | Verify TABLE_ID matches what you select in portal |
| No tables in student dropdown | Check if ESP is sending heartbeat to Firebase |

---

## FILES REFERENCE

```
iith-lab-portal/
├── src/
│   ├── App.js                    — Routing
│   ├── index.js                  — Entry point
│   ├── index.css                 — Global styles
│   ├── firebase/
│   │   ├── config.js             — ★ PUT YOUR CONFIG HERE
│   │   └── database.js           — All DB functions
│   ├── components/
│   │   └── IITBrand.jsx          — Left-panel logo/brand
│   └── pages/
│       ├── HomePage.jsx          — Landing page (2 cards)
│       ├── StudentScanPage.jsx   — Enter roll number
│       ├── StudentSelectPage.jsx — Choose table
│       ├── StudentConfirmPage.jsx — Allocation confirmation
│       ├── StaffLoginPage.jsx    — Staff password login
│       └── StaffDashboardPage.jsx — Main control panel
├── public/
│   └── index.html
├── esp32_firmware/
│   └── lab_controller_v3.ino    — ★ Upload to each ESP32
└── package.json
```
