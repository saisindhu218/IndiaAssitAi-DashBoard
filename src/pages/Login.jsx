import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, isAdminEmail } from "../lib/firebase";
import Seal from "../components/Seal";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!isAdminEmail(email)) {
      setError("This email isn't on the admin allowlist (VITE_ADMIN_EMAILS in .env).");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gateway">
      <div className="gateway-card">
        <Seal size={44} className="gateway-mark" />
        <h1>Administrator Access</h1>
        <p>Sign in with the same account used in the mobile app.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
            {loading ? "Verifying..." : "Enter Registry"}
          </button>
        </form>
      </div>
    </div>
  );
}
