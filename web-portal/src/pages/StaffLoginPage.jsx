// src/pages/StaffLoginPage.jsx
// ⚠️  Password is hardcoded here for simplicity.
//     In production, use Firebase Auth or a backend check.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const STAFF_PASSWORD = "iith@ee"; // Change this to your desired password

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);

  function handleLogin() {
    if (pw === STAFF_PASSWORD) {
      sessionStorage.setItem("staffAuth", "true");
      navigate("/staff/dashboard");
    } else {
      setError("Incorrect password. Please try again.");
      setPw("");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        background: "#fff", borderRadius: 24,
        padding: "48px 40px", maxWidth: 460, width: "100%",
        boxShadow: "var(--shadow-lg)",
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center",
      }}>
        {/* Lock icon */}
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: "var(--orange-pale)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2.2rem", marginBottom: 24,
        }}>🔒</div>

        <h2 style={{
          fontFamily: "Sora, sans-serif", fontWeight: 700,
          fontSize: "1.6rem", marginBottom: 6,
        }}>Staff Login</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: "0.9rem" }}>
          Enter password to access the portal
        </p>

        <div style={{ width: "100%", position: "relative", marginBottom: 12 }}>
          <input
            className="input-field"
            type={show ? "text" : "password"}
            placeholder="Enter Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{ paddingRight: 50 }}
          />
          <button
            onClick={() => setShow(!show)}
            style={{
              position: "absolute", right: 14, top: "50%",
              transform: "translateY(-50%)", background: "none",
              color: "var(--text-muted)", fontSize: "1rem",
            }}
          >{show ? "🙈" : "👁️"}</button>
        </div>

        {error && (
          <p style={{
            color: "var(--red)", fontSize: "0.85rem",
            marginBottom: 12, alignSelf: "flex-start",
          }}>{error}</p>
        )}

        <button
          className="btn-primary"
          onClick={handleLogin}
          style={{ marginBottom: 12 }}
        >Login</button>

        <button
          className="btn-secondary"
          onClick={() => navigate("/")}
          style={{ color: "var(--orange)", background: "var(--orange-pale)" }}
        >Back to Home</button>
      </div>
    </div>
  );
}
