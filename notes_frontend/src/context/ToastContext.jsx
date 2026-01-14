import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

function randomId() {
  return Math.random().toString(16).slice(2);
}

// PUBLIC_INTERFACE
export function ToastProvider({ children }) {
  /** Provides app-wide toast notifications. */
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((toast) => {
    const id = toast.id || randomId();
    const ttlMs = toast.ttlMs ?? 3500;
    const t = { id, type: toast.type || "info", title: toast.title, message: toast.message, ttlMs };
    setToasts((prev) => [t, ...prev].slice(0, 4));

    window.setTimeout(() => removeToast(id), ttlMs);
    return id;
  }, [removeToast]);

  const api = useMemo(
    () => ({
      push: pushToast,
      success: (message, title = "Success") => pushToast({ type: "success", title, message }),
      error: (message, title = "Error") => pushToast({ type: "error", title, message }),
      info: (message, title = "Info") => pushToast({ type: "info", title, message }),
      remove: removeToast,
      toasts,
    }),
    [pushToast, removeToast, toasts]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-host" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "toast",
              t.type === "success" ? "toast-success" : "",
              t.type === "error" ? "toast-error" : "",
            ].join(" ")}
            role="status"
          >
            <div style={{ minWidth: 0 }}>
              <div className="toast-title">{t.title}</div>
              <div className="toast-message">{t.message}</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => removeToast(t.id)} aria-label="Dismiss toast">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// PUBLIC_INTERFACE
export function useToasts() {
  /** Hook to use the toast API. */
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToasts must be used within ToastProvider");
  return ctx;
}
