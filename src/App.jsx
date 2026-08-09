import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useAuth } from "./lib/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ServiceForm from "./pages/ServiceForm";
import Journeys from "./pages/Journeys";

function TopBar() {
  const location = useLocation();
  const isServices = location.pathname === "/" || location.pathname.startsWith("/services");
  const isJourneys = location.pathname.startsWith("/journeys");
  return (
    <div className="topbar">
      <div className="topbar-title">🇮🇳 IndiaAssist Admin</div>
      <div className="topbar-links">
        <Link to="/" className={isServices ? "active" : ""}>Services</Link>
        <Link to="/journeys" className={isJourneys ? "active" : ""}>Journeys</Link>
        <a href="#" onClick={(e) => { e.preventDefault(); signOut(auth); }}>Sign Out</a>
      </div>
    </div>
  );
}

function Gate({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="container">Loading...</div>;
  if (!user) return <Login />;
  if (!isAdmin) {
    return (
      <div className="container">
        <div className="card">
          <h2>Not authorized</h2>
          <p>{user.email} isn't on the admin allowlist. Add it to VITE_ADMIN_EMAILS in .env.</p>
          <button className="btn secondary" onClick={() => signOut(auth)}>Sign Out</button>
        </div>
      </div>
    );
  }
  return (
    <>
      <TopBar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Gate>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/services/:id" element={<ServiceForm />} />
          <Route path="/journeys" element={<Journeys />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Gate>
    </BrowserRouter>
  );
}
