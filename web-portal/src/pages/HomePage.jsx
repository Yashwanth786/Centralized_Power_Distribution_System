// src/pages/HomePage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../iit-logo.png";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 20px",
    }}>
      {/* Logo */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          marginBottom: 36,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          width: 150,
          height: 150,
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <img
          src={logo}
          alt="IIT Hyderabad Logo"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>

      <h1 style={{
        fontFamily: "Sora, sans-serif", fontSize: "2rem", fontWeight: 800,
        color: "var(--text)", textAlign: "center", marginBottom: 8,
      }}>
        Indian Institute of Technology Hyderabad
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "1rem", marginBottom: 52 }}>
        Electrical Engineering Laboratory Portal
      </p>

      {/* Cards */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
        <PortalCard
          icon="🖥️"
          title="Technical Staff Portal"
          desc="Manage tables & power supply"
          onClick={() => navigate("/staff/login")}
        />
        <PortalCard
          icon="👤"
          title="Student Portal"
          desc="Scan ID & get table allocation"
          onClick={() => navigate("/student/scan")}
        />
      </div>
    </div>
  );
}

function PortalCard({ icon, title, desc, onClick }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: `2px solid ${hovered ? "var(--orange)" : "var(--border)"}`,
        borderRadius: 20,
        padding: "40px 36px",
        width: 280,
        cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center",
        boxShadow: hovered ? "var(--shadow-lg)" : "var(--shadow-sm)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "all 0.25s ease",
      }}
    >
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: hovered ? "var(--orange)" : "var(--orange-pale)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "2rem", marginBottom: 20,
        transition: "all 0.25s",
      }}>
        {icon}
      </div>
      <h3 style={{
        fontFamily: "Sora, sans-serif", fontWeight: 700,
        fontSize: "1.1rem", marginBottom: 8, color: "var(--text)",
      }}>{title}</h3>
      <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>{desc}</p>
    </div>
  );
}
