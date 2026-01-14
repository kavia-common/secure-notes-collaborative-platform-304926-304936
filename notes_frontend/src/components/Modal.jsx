import React, { useEffect } from "react";

// PUBLIC_INTERFACE
export function Modal({ title, children, onClose, footer }) {
  /** Accessible modal with backdrop and ESC-to-close. */
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        // Click outside closes
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <div className="row-between">
            <h2>{title}</h2>
            <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close modal">
              ✕
            </button>
          </div>
        </div>
        <div className="modal-body">
          <div className="stack">{children}</div>
          {footer ? <div style={{ marginTop: 12 }}>{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
