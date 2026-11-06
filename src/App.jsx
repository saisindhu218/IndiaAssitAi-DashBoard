import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useAuth } from "./lib/useAuth";
import Seal from "./components/Seal";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ServiceForm from "./pages/ServiceForm";
import Journeys from "./pages/Journeys";
import Reports from "./pages/Reports";

function Sidebar({ email }) {
  const location = useLocation();
  const isServices = location.pathname === "/" || location.pathname.startsWith("/services");
  const isJourneys = location.pathname.startsWith("/journeys");
  const isReports = location.pathname.startsWith("/reports");

  return (
    <div className="sidebar">
      <div className="brand">
        <Seal size={34} className="brand-mark" />
        <div>
          <div className="brand-word">IndiaAssist</div>
          <div className="brand-sub">Registry / Admin</div>
        </div>
      </div>

      <div className="nav-group">
        <Link to="/" className={`nav-link ${isServices ? "active" : ""}`}>Service Registry</Link>
        <Link to="/journeys" className={`nav-link ${isJourneys ? "active" : ""}`}>Journeys</Link>
        <Link to="/reports" className={`nav-link ${isReports ? "active" : ""}`}>Reports</Link>
      </div>

      <div className="sidebar-footer">
        <span className="email">{email}</span>
        <a href="#" onClick={(e) => { e.preventDefault(); signOut(auth); }}>Sign out</a>
      </div>
    </div>
  );
}

function Gate({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="page">Loading...</div>;
  if (!user) return <Login />;
  if (!isAdmin) {
    return (
      <div className="gateway">
        <div className="gateway-card">
          <Seal size={40} />
          <h1 style={{ marginTop: 16 }}>Not authorized</h1>
          <p>{user.email} isn't on the admin allowlist. Add it to VITE_ADMIN_EMAILS in .env (and make sure the same email is in firestore.rules).</p>
          <button className="btn secondary" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>
    );
  }
  return (
    <div className="shell">
      <Sidebar email={user.email} />
      <div className="main">{children}</div>
    </div>
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
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Gate>
    </BrowserRouter>
  );
}
