// src/pages/StudentSelectPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import IITBrand from "../components/IITBrand";
import { subscribeToTables, TABLE_IDS, allocateTable } from "../firebase/database";

export default function StudentSelectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const roll = location.state?.roll;

  const [tables, setTables] = useState({});
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if no roll number
  useEffect(() => {
    if (!roll) navigate("/student/scan");
  }, [roll, navigate]);

  // Real-time tables subscription
  useEffect(() => {
    const unsub = subscribeToTables(setTables);
    return () => unsub();
  }, []);

  const availableTables = TABLE_IDS.filter((id) => {
    const t = tables[id];
    return t && !t.isOn;
  });

  async function handleAllocate() {
    if (!selected) {
      setError("Please select a table.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await allocateTable(selected, roll);
      navigate("/student/confirm", { state: { roll, table: selected } });
    } catch (e) {
      setError("Failed to allocate table. Try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <IITBrand />

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 48px", background: "var(--bg)",
      }}>
        <button
          onClick={() => navigate("/student/scan")}
          style={{
            position: "absolute", top: 24, left: "52%",
            background: "none", color: "var(--text-muted)",
            fontSize: "1.4rem", cursor: "pointer", border: "none",
          }}
        >←</button>

        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: "var(--orange-pale)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2rem", marginBottom: 24,
        }}>⬛</div>

        <h2 style={{
          fontFamily: "Sora, sans-serif", fontWeight: 700,
          fontSize: "1.6rem", marginBottom: 4,
        }}>Select a Table</h2>
        <p style={{ color: "var(--orange)", fontWeight: 600, marginBottom: 4 }}>
          Roll No: {roll}
        </p>
        <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: "0.9rem" }}>
          {availableTables.length} table{availableTables.length !== 1 ? "s" : ""} available
        </p>

        <div style={{ width: "100%", maxWidth: 420 }}>
          <select
            className="input-field"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{ marginBottom: 14, appearance: "auto" }}
          >
            <option value="">-- Select a Table --</option>
            {availableTables.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>

          {availableTables.length === 0 && (
            <div style={{
              background: "var(--yellow-bg)", border: "1px solid var(--yellow)",
              borderRadius: 12, padding: "14px 16px", marginBottom: 14,
              fontSize: "0.88rem", color: "#92400e",
            }}>
              ⚠️ No tables available right now. Please wait or contact staff.
            </div>
          )}

          {error && (
            <p style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 10 }}>{error}</p>
          )}

          <button
            className="btn-primary"
            onClick={handleAllocate}
            disabled={loading || availableTables.length === 0}
            style={{ marginBottom: 12 }}
          >
            {loading ? "Allocating…" : "Allocate Table"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigate("/student/scan")}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
