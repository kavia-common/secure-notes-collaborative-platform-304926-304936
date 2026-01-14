/**
 * Central API client for the Secure Notes backend.
 * Uses cookie-based JWT auth: always includes credentials.
 */

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

function getApiBaseUrl() {
  const base = process.env.REACT_APP_API_BASE_URL;
  if (!base) {
    // Intentionally not throwing hard to keep the app renderable in CI;
    // routes will show an actionable error via toasts.
    return "";
  }
  return base.replace(/\/+$/, "");
}

function isDebugApi() {
  return String(process.env.REACT_APP_DEBUG_API || "").toLowerCase() === "true";
}

/**
 * Normalize backend errors (JSON or text) into a consistent JS Error object.
 */
async function toApiError(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch (_err) {
    // fall back to text
  }

  if (!payload) {
    try {
      const text = await response.text();
      const err = new Error(text || response.statusText);
      err.status = response.status;
      err.payload = text;
      return err;
    } catch (_err) {
      const err = new Error(response.statusText || "Request failed");
      err.status = response.status;
      return err;
    }
  }

  // Typical backend error shapes: { error: { message, code } } OR { message }
  const message =
    payload?.error?.message ||
    payload?.message ||
    payload?.error ||
    response.statusText ||
    "Request failed";

  const err = new Error(message);
  err.status = response.status;
  err.payload = payload;
  return err;
}

// PUBLIC_INTERFACE
export async function apiRequest(path, { method = "GET", body, headers = {} } = {}) {
  /** Make an authenticated (cookie-based) request to the backend API. */
  const base = getApiBaseUrl();
  if (!base) {
    const err = new Error(
      "Missing REACT_APP_API_BASE_URL. Create .env.local (or set env) to point to the backend, e.g. http://localhost:4000"
    );
    err.status = 0;
    throw err;
  }

  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const init = {
    method,
    credentials: "include", // critical for cookie-based JWT
    headers: {
      ...DEFAULT_HEADERS,
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  if (isDebugApi()) {
    // eslint-disable-next-line no-console
    console.log("[api]", method, url, body);
  }

  const res = await fetch(url, init);
  if (!res.ok) {
    throw await toApiError(res);
  }

  // 204 No Content
  if (res.status === 204) return null;

  // If response body isn't JSON, return text.
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return await res.text();
  }

  return await res.json();
}
