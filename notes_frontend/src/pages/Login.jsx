import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToasts } from "../context/ToastContext";

// PUBLIC_INTERFACE
export default function Login() {
  /** Login page for cookie-based JWT auth. */
  const auth = useAuth();
  const toasts = useToasts();
  const navigate = useNavigate();
  const location = useLocation();

  const nextPath = useMemo(() => {
    const qp = new URLSearchParams(location.search);
    return qp.get("next") || "/app";
  }, [location.search]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await auth.actions.login({ email, password });
      navigate(nextPath, { replace: true });
    } catch (err) {
      toasts.error(err.message || "Login failed.");
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
              <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.01em" }}>Secure Notes</div>
              <div className="small muted">Sign in to manage collections and notes</div>
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
                autoComplete="current-password"
                required
              />
            </div>

            <div className="row-between">
              <div className="small muted">
                No account? <Link to="/register">Register</Link>
              </div>

              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </div>

            {auth.status === "anon" ? null : (
              <div className="small muted">
                Session state: <strong>{auth.status}</strong>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
