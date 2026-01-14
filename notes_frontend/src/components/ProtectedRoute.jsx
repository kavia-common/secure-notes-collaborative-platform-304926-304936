import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// PUBLIC_INTERFACE
export function ProtectedRoute({ children }) {
  /** Redirects to /login if user is not authenticated. */
  const auth = useAuth();

  if (auth.status === "loading") {
    return (
      <div className="auth-shell">
        <div className="pill">
          <span className="spinner" aria-hidden="true" />
          <span>Checking session…</span>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
