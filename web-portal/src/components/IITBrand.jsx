// src/components/IITBrand.jsx
import React from "react";
import logo from "../iit-logo.png";

// Shared left-panel branding used on student pages
export default function IITBrand() {
  return (
    <div style={{
      width: "50%",
      background: "var(--orange)",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative circles */}
      <div style={{
        position: "absolute", width: 320, height: 320, borderRadius: "50%",
        background: "rgba(255,255,255,0.06)", top: -80, right: -80,
      }} />
      <div style={{
        position: "absolute", width: 200, height: 200, borderRadius: "50%",
        background: "rgba(255,255,255,0.06)", bottom: 60, left: -60,
      }} />

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

      <h2 style={{
        fontFamily: "Sora, sans-serif", fontWeight: 700,
        fontSize: "1.6rem", color: "#fff", textAlign: "center", lineHeight: 1.3,
      }}>
        Indian Institute of Technology Hyderabad
      </h2>
      <p style={{ color: "rgba(255,255,255,0.75)", marginTop: 10, fontSize: "0.95rem" }}>
        Electrical Engineering Lab
      </p>
    </div>
  );
}
