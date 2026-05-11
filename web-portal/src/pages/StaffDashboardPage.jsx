// src/pages/StaffDashboardPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  subscribeToTables,
  subscribeToPower,
  subscribeToLogs,
  clearLogs,
  deallocateTable,
  allTablesOff,
  TABLE_IDS,
  allocateTable,
  SESSION_DURATION_MS,
} from "../firebase/database";

// ── Small helper: format ms → HH:MM:SS ───────────────────────────
function fmtCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`;
}

// ── Countdown cell component ──────────────────────────────────────
function Countdown({ sessionEnd, onExpire }) {
  const [remaining, setRemaining] = useState(Math.max(0, sessionEnd - Date.now()));
  const cbRef = useRef(onExpire);
  useEffect(() => { cbRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (!sessionEnd) return;
    const tick = setInterval(() => {
      const r = Math.max(0, sessionEnd - Date.now());
      setRemaining(r);
      if (r === 0) { clearInterval(tick); cbRef.current && cbRef.current(); }
    }, 1000);
    return () => clearInterval(tick);
  }, [sessionEnd]);

  const isWarning = remaining < 10 * 60 * 1000; // last 10 min
  return (
    <span style={{
      fontFamily: "monospace", fontWeight: 600, fontSize: "0.95rem",
      color: isWarning ? "var(--red)" : "var(--orange)",
    }}>
      {fmtCountdown(remaining)}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    available: { bg: "#dcfce7", color: "#16a34a", dot: "#16a34a", label: "Available" },
    occupied:  { bg: "#fff7ed", color: "#c2410c", dot: "#ea580c", label: "Occupied" },
    off:       { bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af", label: "Off" },
  };
  const s = styles[status] || styles.off;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: s.bg, color: s.color,
      padding: "4px 12px", borderRadius: 20,
      fontSize: "0.82rem", fontWeight: 600,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: s.dot,
        boxShadow: status === "occupied" ? `0 0 6px ${s.dot}` : "none",
        animation: status === "occupied" ? "pulse 1.5s infinite" : "none",
      }} />
      {s.label}
    </span>
  );
}

// ── Power source indicator ────────────────────────────────────────
function PowerBadge({ source }) {
  const map = {
    mains:   { emoji: "⚡", color: "#16a34a", label: "Mains" },
    battery: { emoji: "🔋", color: "#d97706", label: "Battery" },
    offline: { emoji: "🔴", color: "#6b7280", label: "Offline" },
  };
  const s = map[source] || map.offline;
  return (
    <span style={{ fontSize: "0.82rem", color: s.color, fontWeight: 500 }}>
      {s.emoji} {s.label}
    </span>
  );
}

// ── Main dashboard ────────────────────────────────────────────────
export default function StaffDashboardPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState({});
  const [power, setPower]   = useState({});
  const [confirmAllOff, setConfirmAllOff] = useState(false);
  const [tick, setTick] = useState(0); // forces re-render
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // Auth guard
  useEffect(() => {
    if (sessionStorage.getItem("staffAuth") !== "true") navigate("/staff/login");
  }, [navigate]);

  // Live subscriptions
  useEffect(() => {
    const u1 = subscribeToTables(setTables);
    const u2 = subscribeToPower(setPower);
    const u3 = subscribeToLogs(setLogs); 
    return () => { u1(); u2(); u3(); };
  }, []);

  // Periodic re-render for countdowns
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-expire sessions
  const handleExpire = useCallback(async (tableId) => {
    await deallocateTable(tableId, "expired");
  }, []);

  async function handleEndSession(tableId) {
    await deallocateTable(tableId, "staff_ended");
  }

  async function handleAllOff() {
    await allTablesOff();
    setConfirmAllOff(false);
  }

  function handleLogout() {
    sessionStorage.removeItem("staffAuth");
    navigate("/");
  }

  // Derived stats
  const occupied  = TABLE_IDS.filter((id) => tables[id]?.isOn).length;
  const available = TABLE_IDS.filter((id) => !tables[id]?.isOn).length;
  const offline   = TABLE_IDS.filter((id) => power[id]?.source === "offline").length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <div style={{
        background: "var(--orange)", padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 68, boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.18)", color: "#fff",
              border: "none", borderRadius: 10, padding: "8px 14px",
              fontSize: "1rem", cursor: "pointer",
            }}
          >←</button>
          <div>
            <p style={{ color: "#fff", fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "1.05rem" }}>
              Technical Staff Portal
            </p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
              Electrical Lab — Power Management
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Stats chips */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: `${occupied} Occupied`, color: "#ea580c" },
              { label: `${available} Available`, color: "#16a34a" },
              { label: `${offline} Offline`, color: "#6b7280" },
            ].map((s) => (
              <span key={s.label} style={{
                background: "rgba(255,255,255,0.15)", color: "#fff",
                padding: "4px 12px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 500,
              }}>{s.label}</span>
            ))}
          </div>

          <button
            onClick={() => setShowLogs(!showLogs)}
            style={{
              background: "rgba(255,255,255,0.18)", color: "#fff",
              border: "none", borderRadius: 12, padding: "10px 20px",
              fontWeight: 600, fontSize: "0.88rem", cursor: "pointer",
            }}
          >
            📋 {showLogs ? "Hide Logs" : "Show Logs"}
          </button>

          <button
            onClick={() => setConfirmAllOff(true)}
            style={{
              background: "#dc2626", color: "#fff", border: "none",
              borderRadius: 12, padding: "10px 20px",
              fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 12px rgba(220,38,38,0.4)",
            }}
          >
            ⛔ ALL OFF
          </button>
        </div>
      </div>

      <div style={{ padding: "20px", width: "100%" }}>
        {/* Legend */}
        <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
          {[
            { dot: "#16a34a", label: "Available" },
            { dot: "#ea580c", label: "Occupied" },
            { dot: "#9ca3af", label: "Off / Offline" },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.dot }} />
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{
          background: "#fff",
          borderRadius: 18,
          border: "1px solid var(--border)",
          overflowX: "auto",
          width: "100%",
          boxShadow: "var(--shadow-md)",
        }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "0.8fr 1fr 1.4fr 1.5fr 1.5fr 1.2fr",
            padding: "14px 24px",
            borderBottom: "2px solid var(--border)",
            background: "#fafaf9",
          }}>
            {["Table", "Status", "Student", "Start Time / Last Used", "Time Remaining", "Action"].map((h) => (
              <span key={h} style={{
                fontSize: "0.82rem", fontWeight: 700,
                color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px",
              }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {TABLE_IDS.map((id, idx) => {
            const t = tables[id] || {};
            const p = power[id] || {};
            const isOn = !!t.isOn;
            const isOnline = p.source !== "offline";
            const status = isOn ? "occupied" : (isOnline ? "available" : "off");

            return (
              <div
                key={id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "0.8fr 1fr 1.4fr 1.5fr 1.5fr 1.2fr",
                  padding: "18px 24px",
                  borderBottom: idx < TABLE_IDS.length - 1 ? "1px solid var(--border)" : "none",
                  background: isOn ? "rgba(255,237,213,0.3)" : "#fff",
                  transition: "background 0.3s",
                  alignItems: "center",
                }}
              >
                {/* Table ID */}
                <span style={{
                  fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "1rem",
                }}>
                  {id}
                </span>

                {/* Status */}
                <StatusBadge status={status} />

                {/* Student */}
                <span style={{
                  fontFamily: "monospace",
                  color: isOn ? "var(--text)" : "var(--text-light)",
                  fontSize: "0.88rem",
                }}>
                  {(t.studentRoll && t.studentRoll !== "null") ? t.studentRoll : "—"}
                </span>

                {/* Start Time */}
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  {t.starttimeLabel || "—"}
                </span>

                {/* Countdown */}
                <span>
                  {isOn && t.sessionEnd ? (
                    <Countdown
                      sessionEnd={t.sessionEnd}
                      onExpire={() => handleExpire(id)}
                    />
                  ) : (
                    <span style={{ color: "var(--text-light)" }}>—</span>
                  )}
                </span>

                {/* Power & Action */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <PowerBadge source={p.source || "offline"} />
                  {isOn ? (
                    <button
                      onClick={() => handleEndSession(id)}
                      style={{
                        background: "#dc2626", color: "#fff",
                        border: "none", borderRadius: 10,
                        padding: "8px 18px", fontSize: "0.82rem",
                        fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                        boxShadow: "0 3px 10px rgba(220,38,38,0.3)",
                      }}
                    >
                      ⛔ End Session
                    </button>
                  ) : (
                    <span style={{
                      color: "var(--text-light)", fontSize: "0.82rem",
                      padding: "8px 18px",
                    }}>
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showLogs && (
          <div style={{
            background: "#fff", borderRadius: 18,
            border: "1px solid var(--border)",
            overflow: "hidden", boxShadow: "var(--shadow-md)",
            marginTop: 24,
          }}>
            {/* Logs Header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 24px", borderBottom: "2px solid var(--border)",
              background: "#fafaf9",
            }}>
              <span style={{
                fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "1rem",
              }}>
                📋 Activity Logs
              </span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {logs.length} entries
                </span>
                <button
                  onClick={async () => {
                    if (window.confirm("Clear all logs from Firebase?")) await clearLogs();
                  }}
                  style={{
                    background: "var(--red-bg)", color: "var(--red)",
                    border: "1px solid var(--red)", borderRadius: 8,
                    padding: "6px 14px", fontSize: "0.78rem",
                    fontWeight: 600, cursor: "pointer",
                  }}
                >
                  🗑 Clear Logs
                </button>
              </div>
            </div>

            {/* Log rows */}
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {logs.length === 0 ? (
                <div style={{
                  padding: "40px", textAlign: "center",
                  color: "var(--text-light)", fontSize: "0.88rem",
                }}>
                  No logs yet. Activity will appear here.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 16,
                    padding: "14px 24px",
                    borderBottom: "1px solid var(--border)",
                    background: "#fff",
                  }}>
                    {/* Type icon */}
                    <span style={{ fontSize: "1.1rem", marginTop: 2 }}>
                      {{ 
                        session_start: "🟢",
                        session_end:   "🔴",
                        expire:        "⏰",
                        emergency:     "🚨",
                        power:         "⚡",
                        staff:         "👤",
                        info:          "ℹ️",
                      }[log.type] || "📌"}
                    </span>

                    {/* Message + meta */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "0.88rem", color: "var(--text)", marginBottom: 3 }}>
                        {log.message}
                      </p>
                      <div style={{ display: "flex", gap: 14 }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          🕐 {log.timestamp}
                        </span>
                        {log.tableId && (
                          <span style={{
                            fontSize: "0.75rem", color: "var(--orange)",
                            fontWeight: 600,
                          }}>
                            {log.tableId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Type badge */}
                    <span style={{
                      fontSize: "0.7rem", fontWeight: 600, padding: "3px 10px",
                      borderRadius: 20, flexShrink: 0,
                      ...({
                        session_start: { background: "var(--green-bg)",  color: "var(--green)" },
                        session_end:   { background: "var(--red-bg)",    color: "var(--red)" },
                        expire:        { background: "var(--yellow-bg)", color: "var(--yellow)" },
                        emergency:     { background: "var(--red-bg)",    color: "var(--red)" },
                        power:         { background: "#dbeafe",          color: "#1d4ed8" },
                        staff:         { background: "var(--orange-pale)", color: "var(--orange)" },
                      }[log.type] || { background: "#f3f4f6", color: "#6b7280" })
                    }}>
                      {log.type?.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {/* Live indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginTop: 16, justifyContent: "flex-end",
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--green)",
            boxShadow: "0 0 6px var(--green)",
            animation: "pulse 1.5s infinite",
          }} />
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Live — auto-refreshes from Firebase
          </span>
        </div>
      </div>

      {/* ALL OFF Confirm Modal */}
      {confirmAllOff && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 999, backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "#fff", borderRadius: 20,
            padding: "40px 36px", maxWidth: 400, width: "90%",
            textAlign: "center", boxShadow: "var(--shadow-lg)",
            animation: "fadeIn 0.25s ease",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>⚠️</div>
            <h3 style={{
              fontFamily: "Sora,sans-serif", fontWeight: 700,
              fontSize: "1.3rem", marginBottom: 10,
            }}>Turn OFF All Tables?</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 28, lineHeight: 1.6 }}>
              This will immediately end all active sessions and cut power to all {occupied} occupied tables.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setConfirmAllOff(false)}
                style={{
                  flex: 1, padding: "14px", borderRadius: 12,
                  border: "2px solid var(--border)",
                  background: "#fff", fontWeight: 600, cursor: "pointer",
                }}
              >Cancel</button>
              <button
                onClick={handleAllOff}
                style={{
                  flex: 1, padding: "14px", borderRadius: 12,
                  background: "#dc2626", color: "#fff",
                  border: "none", fontWeight: 700, cursor: "pointer",
                }}
              >Yes, ALL OFF</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
