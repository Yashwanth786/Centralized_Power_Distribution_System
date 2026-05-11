// src/pages/StudentScanPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import IITBrand from "../components/IITBrand";
import { subscribeToTables, TABLE_IDS } from "../firebase/database";

export default function StudentScanPage() {
  const navigate = useNavigate();
  const [roll, setRoll] = useState("");
  const [recentAllocations, setRecentAllocations] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Subscribe to get recent allocations for display
    const unsub = subscribeToTables((tables) => {
      const recents = [];
      TABLE_IDS.forEach((id) => {
        const t = tables[id];
        if (t && t.studentRoll && t.studentRoll !== "null" && t.timestamp && t.timestamp > 0) {
          recents.push({ roll: t.studentRoll, table: id, timestamp: t.timestamp });
        }
      });
      recents.sort((a, b) => b.timestamp - a.timestamp);
      setRecentAllocations(recents.slice(0, 5));
    });
    return () => unsub();
  }, []);

  function handleNext() {
    const trimmed = roll.trim();
    if (!trimmed) {
      setError("Please enter your roll number.");
      return;
    }
    setError("");
    // Pass roll number via location state
    navigate("/student/select", { state: { roll: trimmed } });
  }

  function formatDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <IITBrand />

      {/* Right panel */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 48px",
        background: "var(--bg)",
      }}>
        <button
          onClick={() => navigate("/")}
          style={{
            position: "absolute", top: 24, left: "52%",
            background: "none", color: "var(--text-muted)",
            fontSize: "1.4rem", cursor: "pointer", border: "none",
          }}
        >←</button>

        {/* Scan icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: "var(--orange-pale)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2rem", marginBottom: 24,
        }}>⬛</div>

        <h2 style={{
          fontFamily: "Sora, sans-serif", fontWeight: 700,
          fontSize: "1.6rem", marginBottom: 8,
        }}>Scan Your ID Card</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
          Enter your Roll Number to get started
        </p>

        <div style={{ width: "100%", maxWidth: 420 }}>
          <input
            className="input-field"
            placeholder="Enter Roll Number (e.g., EE22BTECH11001)"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
            style={{ marginBottom: 12, fontFamily: "monospace", letterSpacing: 1 }}
          />
          {error && (
            <p style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 10 }}>{error}</p>
          )}
          <button className="btn-primary" onClick={handleNext} style={{ marginBottom: 24 }}>
            Next →
          </button>

          {/* Recent allocations */}
          {recentAllocations.length > 0 && (
            <div style={{
              background: "#fff", borderRadius: 14, padding: "18px 20px",
              border: "1px solid var(--border)",
            }}>
              <p style={{
                fontWeight: 600, fontSize: "0.9rem", marginBottom: 14,
                color: "var(--text)",
              }}>Recent Allocations</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr>
                    {["Roll No", "Table", "Date"].map((h) => (
                      <th key={h} style={{
                        textAlign: "left", padding: "6px 8px",
                        color: "var(--text-muted)", fontWeight: 500,
                        borderBottom: "1px solid var(--border)",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentAllocations.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: "8px 8px", color: "var(--text)" }}>{r.roll}</td>
                      <td style={{ padding: "8px 8px", color: "var(--orange)", fontWeight: 600 }}>{r.table}</td>
                      <td style={{ padding: "8px 8px", color: "var(--text-muted)" }}>{formatDate(r.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
