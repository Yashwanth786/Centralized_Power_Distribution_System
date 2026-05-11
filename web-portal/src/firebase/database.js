// src/firebase/database.js
import { db } from "./config";
import {
  ref,
  set,
  get,
  query,
  orderByKey,
  limitToLast,
  onValue,
  update,
} from "firebase/database";

export const TABLE_IDS = Array.from({ length: 10 }, (_, i) =>
  `T-${String(i + 1).padStart(2, "0")}`
);

export const SESSION_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

// ── Time formatter → "07/05/2026, 03:45:12 pm" ───────────────────
export function toReadable(ms) {
  const d    = new Date(ms);
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  let   h    = d.getHours();
  const min  = String(d.getMinutes()).padStart(2, "0");
  const sec  = String(d.getSeconds()).padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${dd}/${mm}/${yyyy}, ${String(h).padStart(2,"0")}:${min}:${sec} ${ampm}`;
}

// ── Init all tables on first load ─────────────────────────────────
export async function initTables() {
  const snap = await get(ref(db, "tables"));
  if (snap.exists()) return;
  const updates = {};
  TABLE_IDS.forEach((id) => {
    updates[`tables/${id}`] = {
      isOn: false, studentRoll: "null",
      lastUsed: "", timestampLabel: "", sessionEndLabel: "",
    };
    updates[`power/${id}`] = {
      source: "offline", lastSeen: toReadable(Date.now()),
    };
  });
  await update(ref(db), updates);
}

// ── Subscriptions ─────────────────────────────────────────────────
export function subscribeToTables(callback) {
  return onValue(ref(db, "tables"), (snap) => callback(snap.val() || {}));
}

export function subscribeToPower(callback) {
  return onValue(ref(db, "power"), (snap) => callback(snap.val() || {}));
}

// ── Allocate ──────────────────────────────────────────────────────
export async function allocateTable(tableId, studentRoll) {
  const now        = Date.now();
  const sessionEnd = now + SESSION_DURATION_MS;
  await set(ref(db, `tables/${tableId}`), {
    isOn:            true,
    studentRoll:     studentRoll,
    starttimeLabel:  toReadable(now),
    sessionEndLabel: toReadable(sessionEnd),
    sessionEnd:      sessionEnd,
  });
  await addLog({
    message: `Table ${tableId} allocated to student ${studentRoll}`,
    tableId, type: "session_start",
  });
}

// ── Deallocate ────────────────────────────────────────────────────
export async function deallocateTable(tableId, reason = "staff_ended") {
  await set(ref(db, `tables/${tableId}`), {
    isOn:     false,
    lastUsed: toReadable(Date.now()),
  });
  await addLog({
    message: `Table ${tableId} session ended — reason: ${reason}`,
    tableId,
    type: reason === "expired" ? "expire" : "session_end",
  });
}

// ── All OFF ───────────────────────────────────────────────────────
export async function allTablesOff() {
  const writes = TABLE_IDS.map((id) =>
    set(ref(db, `tables/${id}`), {
      isOn:     false,
      lastUsed: toReadable(Date.now()),
    })
  );
  await Promise.all(writes);
  await addLog({ message: "ALL TABLES turned OFF by staff", tableId: null, type: "staff" });
}

export async function getTablesOnce() {
  const snap = await get(ref(db, "tables"));
  return snap.val() || {};
}

// ── Logs ──────────────────────────────────────────────────────────
// Structure: logCount: 5,  logs/1/{...}  logs/2/{...} ...
// IDs are integers 1,2,3... Sorted newest-first by descending ID.

export async function addLog({ message, tableId = null, type = "info" }) {
  const countSnap = await get(ref(db, "logCount"));
  const nextId    = (countSnap.val() || 0) + 1;
  await set(ref(db, `logs/${nextId}`), {
    message,
    tableId,
    type,
    timestamp: toReadable(Date.now()),
  });
  await set(ref(db, "logCount"), nextId);
}

export function subscribeToLogs(callback, limit = 100) {
  const logsQuery = query(ref(db, "logs"), orderByKey(), limitToLast(limit));
  return onValue(logsQuery, (snap) => {
    const data = snap.val() || {};
    const logs = Object.entries(data)
      .map(([id, v]) => ({ id: Number(id), ...v }))
      .sort((a, b) => b.id - a.id);  // highest ID = newest = first
    callback(logs);
  });
}

export async function clearLogs() {
  await set(ref(db, "logs"),     null);
  await set(ref(db, "logCount"), 0);
}

// ── Clear everything on startup ───────────────────────────────────
export async function clearAllData() {
  const tableWrites = TABLE_IDS.map((id) =>
    set(ref(db, `tables/${id}`), {
      isOn:     false,
      lastUsed: "",
    })
  );
  const powerWrites = TABLE_IDS.map((id) =>
    set(ref(db, `power/${id}`), {
      source:   "offline",
      lastSeen: toReadable(Date.now()),
    })
  );
  await Promise.all([...tableWrites, ...powerWrites]);
  await set(ref(db, "logs"),     null);
  await set(ref(db, "logCount"), 0);
  console.log("[DB] All data cleared on startup");
}