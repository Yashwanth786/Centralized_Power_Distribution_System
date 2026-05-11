// src/pages/StudentConfirmPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import IITBrand from "../components/IITBrand";
import { SESSION_DURATION_MS } from "../firebase/database";

export default function StudentConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roll, table } = location.state || {};
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!roll || !table) { navigate("/student/scan"); return; }
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); navigate("/student/scan"); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [roll, table, navigate]);

  const sessionHours = SESSION_DURATION_MS / (1000 * 60 * 60);

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

        {/* Confirmation card */}
        <div style={{
          background: "#fff",
          border: "2px solid var(--green)",
          borderRadius: 20,
          padding: "40px 36px",
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(22,163,74,0.12)",
          animation: "fadeIn 0.4s ease",
        }}>
          {/* Success icon */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "var(--green-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2.4rem", margin: "0 auto 24px",
          }}>✅</div>

          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 6 }}>
            Student Roll Number
          </p>
          <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "1.3rem", marginBottom: 20 }}>
            {roll}
          </p>

          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 6 }}>
            Allotted Table Number
          </p>
          <p style={{
            fontFamily: "Sora,sans-serif", fontWeight: 800,
            fontSize: "3rem", color: "var(--green)", lineHeight: 1, marginBottom: 24,
          }}>
            {table}
          </p>

          <div style={{
            background: "var(--orange-pale)",
            borderRadius: 12, padding: "14px 20px",
            marginBottom: 20,
          }}>
            <p style={{ color: "var(--orange-dark)", fontWeight: 600, fontSize: "0.95rem" }}>
              Please go to the table, the power is ON
            </p>
          </div>

          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 8 }}>
            Session Duration: <strong>{sessionHours} Hours</strong>
          </p>
          <p style={{ color: "var(--text-light)", fontSize: "0.78rem" }}>
            Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}…
          </p>
        </div>
      </div>
    </div>
  );
}
