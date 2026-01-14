import { apiRequest } from "./client";

// Auth
// PUBLIC_INTERFACE
export async function register({ email, password }) {
  /** Register a new user. Backend sets no session; user should login after registration. */
  return await apiRequest("/auth/register", { method: "POST", body: { email, password } });
}

// PUBLIC_INTERFACE
export async function login({ email, password }) {
  /** Login and set the JWT cookie (HTTP-only). */
  return await apiRequest("/auth/login", { method: "POST", body: { email, password } });
}

// PUBLIC_INTERFACE
export async function logout() {
  /** Logout and clear the JWT cookie (HTTP-only). */
  return await apiRequest("/auth/logout", { method: "POST" });
}

// Collections
// PUBLIC_INTERFACE
export async function listCollections() {
  /** List collections for the authenticated user. */
  return await apiRequest("/collections");
}

// PUBLIC_INTERFACE
export async function createCollection({ name }) {
  /** Create a collection. */
  return await apiRequest("/collections", { method: "POST", body: { name } });
}

// PUBLIC_INTERFACE
export async function updateCollection({ collectionId, name }) {
  /** Rename/update a collection. */
  return await apiRequest(`/collections/${collectionId}`, { method: "PUT", body: { name } });
}

// PUBLIC_INTERFACE
export async function deleteCollection({ collectionId }) {
  /** Delete a collection. */
  return await apiRequest(`/collections/${collectionId}`, { method: "DELETE" });
}

// Notes
// PUBLIC_INTERFACE
export async function listNotesForCollection({ collectionId }) {
  /** List notes under a collection. */
  return await apiRequest(`/collections/${collectionId}/notes`);
}

// PUBLIC_INTERFACE
export async function createNoteForCollection({ collectionId, title, content }) {
  /** Create a note under a collection. */
  return await apiRequest(`/collections/${collectionId}/notes`, {
    method: "POST",
    body: { title, content },
  });
}

// PUBLIC_INTERFACE
export async function getNote({ noteId }) {
  /** Get a note by id. */
  return await apiRequest(`/notes/${noteId}`);
}

// PUBLIC_INTERFACE
export async function updateNote({ noteId, title, content }) {
  /** Update a note by id. */
  return await apiRequest(`/notes/${noteId}`, { method: "PUT", body: { title, content } });
}

// PUBLIC_INTERFACE
export async function deleteNote({ noteId }) {
  /** Delete a note by id. */
  return await apiRequest(`/notes/${noteId}`, { method: "DELETE" });
}
