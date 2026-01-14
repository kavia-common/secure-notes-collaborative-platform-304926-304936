import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToasts } from "../context/ToastContext";

// PUBLIC_INTERFACE
export default function Register() {
  /** Registration page for creating an account. */
  const auth = useAuth();
  const toasts = useToasts();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await auth.actions.register({ email, password });
      navigate("/login", { replace: true });
    } catch (err) {
      toasts.error(err.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="row">
            <div className="brand-badge" aria-hidden="true" />
            <div className="stack" style={{ gap: 4 }}>
              <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.01em" }}>Create account</div>
              <div className="small muted">Register to start organizing your notes</div>
            </div>
          </div>
        </div>

        <div className="auth-card-body">
          <form className="stack" onSubmit={onSubmit}>
            <div className="stack" style={{ gap: 6 }}>
              <label className="small" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="stack" style={{ gap: 6 }}>
              <label className="small" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="row-between">
              <div className="small muted">
                Already have an account? <Link to="/login">Login</Link>
              </div>

              <button className="btn btn-secondary" type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create account"}
              </button>
            </div>

            <div className="small muted">
              Note: you’ll be asked to log in after registration (cookie-based session).
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
