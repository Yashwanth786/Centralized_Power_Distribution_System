// src/App.js
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { clearAllData } from "./firebase/database";
import HomePage from "./pages/HomePage";
import StudentScanPage from "./pages/StudentScanPage";
import StudentSelectPage from "./pages/StudentSelectPage";
import StudentConfirmPage from "./pages/StudentConfirmPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import StaffDashboardPage from "./pages/StaffDashboardPage";

export default function App() {
  useEffect(() => {
    clearAllData();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/student/scan" element={<StudentScanPage />} />
        <Route path="/student/select" element={<StudentSelectPage />} />
        <Route path="/student/confirm" element={<StudentConfirmPage />} />
        <Route path="/staff/login" element={<StaffLoginPage />} />
        <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
