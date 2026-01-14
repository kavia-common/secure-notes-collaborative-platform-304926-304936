import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../api/endpoints";
import { useToasts } from "./ToastContext";

const AuthContext = createContext(null);

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provides auth state and actions based on cookie-based JWT. */
  const toasts = useToasts();
  const [status, setStatus] = useState("loading"); // loading | authed | anon
  const [userEmail, setUserEmail] = useState(null);

  const refreshSession = useCallback(async () => {
    // Since cookie is HTTP-only, we probe via a protected endpoint.
    // We also try to retain email from last successful login.
    try {
      await api.listCollections();
      setStatus("authed");
      return true;
    } catch (err) {
      if (err?.status === 401) {
        setStatus("anon");
        return false;
      }
      // Non-401 errors mean backend unreachable/misconfigured.
      setStatus("anon");
      toasts.error(err.message || "Unable to reach backend API.");
      return false;
    }
  }, [toasts]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const doRegister = useCallback(
    async ({ email, password }) => {
      await api.register({ email, password });
      // Registration doesn't log in; keep anon
      toasts.success("Account created. Please log in.");
      return true;
    },
    [toasts]
  );

  const doLogin = useCallback(
    async ({ email, password }) => {
      await api.login({ email, password });
      setUserEmail(email);
      setStatus("authed");
      toasts.success("Welcome back!");
      return true;
    },
    [toasts]
  );

  const doLogout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setStatus("anon");
      setUserEmail(null);
      toasts.info("Signed out.");
    }
  }, [toasts]);

  const value = useMemo(
    () => ({
      status,
      isAuthenticated: status === "authed",
      userEmail,
      actions: {
        register: doRegister,
        login: doLogin,
        logout: doLogout,
        refreshSession,
      },
    }),
    [status, userEmail, doRegister, doLogin, doLogout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth() {
  /** Hook for accessing auth state/actions. */
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
