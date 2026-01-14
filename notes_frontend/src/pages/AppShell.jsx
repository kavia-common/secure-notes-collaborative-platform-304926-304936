import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "../api/endpoints";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { useToasts } from "../context/ToastContext";

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function normalizeCollection(c) {
  return {
    id: c.id || c.collectionId || c.collection_id,
    name: c.name,
    createdAt: c.createdAt || c.created_at,
    updatedAt: c.updatedAt || c.updated_at,
  };
}

function normalizeNote(n) {
  return {
    id: n.id || n.noteId || n.note_id,
    collectionId: n.collectionId || n.collection_id,
    title: n.title,
    content: n.content ?? n.body ?? "",
    createdAt: n.createdAt || n.created_at,
    updatedAt: n.updatedAt || n.updated_at,
  };
}

// PUBLIC_INTERFACE
export default function AppShell() {
  /** Main authenticated notes UI (collections sidebar + notes list + editor). */
  const auth = useAuth();
  const toasts = useToasts();

  const [loadingCollections, setLoadingCollections] = useState(false);
  const [collections, setCollections] = useState([]);

  const [activeCollectionId, setActiveCollectionId] = useState(null);

  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);

  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [saving, setSaving] = useState(false);

  const [collectionModal, setCollectionModal] = useState(null); // { mode: 'create'|'rename', collectionId?, defaultName? }
  const [collectionNameDraft, setCollectionNameDraft] = useState("");

  const [noteModal, setNoteModal] = useState(null); // { mode: 'create' }
  const [noteTitleDraft, setNoteTitleDraft] = useState("New note");

  const lastLoadedNoteId = useRef(null);

  const activeCollection = useMemo(
    () => collections.find((c) => c.id === activeCollectionId) || null,
    [collections, activeCollectionId]
  );

  const activeNote = useMemo(() => notes.find((n) => n.id === activeNoteId) || null, [notes, activeNoteId]);

  const loadCollections = useCallback(async () => {
    setLoadingCollections(true);
    try {
      const data = await api.listCollections();
      const list = Array.isArray(data) ? data : data?.collections || [];
      const normalized = list.map(normalizeCollection);
      setCollections(normalized);

      // pick first collection if none selected
      if (!activeCollectionId && normalized.length > 0) {
        setActiveCollectionId(normalized[0].id);
      }
    } catch (err) {
      if (err?.status === 401) {
        // Session expired; kick out
        await auth.actions.refreshSession();
      } else {
        toasts.error(err.message || "Failed to load collections.");
      }
    } finally {
      setLoadingCollections(false);
    }
  }, [toasts, auth.actions, activeCollectionId]);

  const loadNotes = useCallback(
    async (collectionId) => {
      if (!collectionId) return;
      setLoadingNotes(true);
      try {
        const data = await api.listNotesForCollection({ collectionId });
        const list = Array.isArray(data) ? data : data?.notes || [];
        const normalized = list.map((n) => normalizeNote({ ...n, collectionId }));
        setNotes(normalized);

        // reset active note if not in list
        if (normalized.length === 0) {
          setActiveNoteId(null);
          setEditorTitle("");
          setEditorContent("");
          lastLoadedNoteId.current = null;
        } else if (!normalized.some((n) => n.id === activeNoteId)) {
          setActiveNoteId(normalized[0].id);
        }
      } catch (err) {
        if (err?.status === 401) {
          await auth.actions.refreshSession();
        } else {
          toasts.error(err.message || "Failed to load notes.");
        }
      } finally {
        setLoadingNotes(false);
      }
    },
    [toasts, auth.actions, activeNoteId]
  );

  // initial load
  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // when collection changes, load notes
  useEffect(() => {
    loadNotes(activeCollectionId);
  }, [activeCollectionId, loadNotes]);

  // when active note changes, load it and fill editor
  useEffect(() => {
    async function loadNoteIfNeeded() {
      if (!activeNoteId) return;
      if (lastLoadedNoteId.current === activeNoteId && activeNote) return;

      try {
        const data = await api.getNote({ noteId: activeNoteId });
        const n = normalizeNote(data);
        lastLoadedNoteId.current = activeNoteId;
        setEditorTitle(n.title || "");
        setEditorContent(n.content || "");
      } catch (err) {
        toasts.error(err.message || "Failed to load note.");
      }
    }
    loadNoteIfNeeded();
  }, [activeNoteId, activeNote, toasts]);

  const onCreateCollection = useCallback(() => {
    setCollectionNameDraft("");
    setCollectionModal({ mode: "create" });
  }, []);

  const onRenameCollection = useCallback(
    (collectionId) => {
      const c = collections.find((x) => x.id === collectionId);
      setCollectionNameDraft(c?.name || "");
      setCollectionModal({ mode: "rename", collectionId, defaultName: c?.name || "" });
    },
    [collections]
  );

  const onSubmitCollectionModal = useCallback(async () => {
    const name = collectionNameDraft.trim();
    if (!name) {
      toasts.error("Collection name is required.");
      return;
    }

    try {
      if (collectionModal?.mode === "create") {
        const created = await api.createCollection({ name });
        const c = normalizeCollection(created);
        setCollections((prev) => [c, ...prev]);
        setActiveCollectionId(c.id);
        toasts.success("Collection created.");
      } else if (collectionModal?.mode === "rename") {
        const updated = await api.updateCollection({ collectionId: collectionModal.collectionId, name });
        const c = normalizeCollection(updated);
        setCollections((prev) => prev.map((x) => (x.id === c.id ? c : x)));
        toasts.success("Collection updated.");
      }
      setCollectionModal(null);
    } catch (err) {
      toasts.error(err.message || "Collection action failed.");
    }
  }, [collectionNameDraft, collectionModal, toasts]);

  const onDeleteCollection = useCallback(
    async (collectionId) => {
      const c = collections.find((x) => x.id === collectionId);
      const ok = window.confirm(`Delete collection "${c?.name || "Untitled"}"? This also deletes its notes.`);
      if (!ok) return;

      try {
        await api.deleteCollection({ collectionId });
        setCollections((prev) => prev.filter((x) => x.id !== collectionId));
        if (activeCollectionId === collectionId) {
          const remaining = collections.filter((x) => x.id !== collectionId);
          setActiveCollectionId(remaining[0]?.id || null);
        }
        toasts.info("Collection deleted.");
      } catch (err) {
        toasts.error(err.message || "Failed to delete collection.");
      }
    },
    [collections, activeCollectionId, toasts]
  );

  const onCreateNote = useCallback(() => {
    if (!activeCollectionId) {
      toasts.error("Create or select a collection first.");
      return;
    }
    setNoteTitleDraft("New note");
    setNoteModal({ mode: "create" });
  }, [activeCollectionId, toasts]);

  const onSubmitNoteModal = useCallback(async () => {
    const title = noteTitleDraft.trim();
    if (!title) {
      toasts.error("Note title is required.");
      return;
    }
    try {
      const created = await api.createNoteForCollection({
        collectionId: activeCollectionId,
        title,
        content: "",
      });
      const n = normalizeNote({ ...created, collectionId: activeCollectionId });
      setNotes((prev) => [n, ...prev]);
      setActiveNoteId(n.id);
      setNoteModal(null);
      toasts.success("Note created.");
    } catch (err) {
      toasts.error(err.message || "Failed to create note.");
    }
  }, [noteTitleDraft, activeCollectionId, toasts]);

  const onDeleteNote = useCallback(
    async (noteId) => {
      const n = notes.find((x) => x.id === noteId);
      const ok = window.confirm(`Delete note "${n?.title || "Untitled"}"?`);
      if (!ok) return;

      try {
        await api.deleteNote({ noteId });
        const remaining = notes.filter((x) => x.id !== noteId);
        setNotes(remaining);
        if (activeNoteId === noteId) {
          setActiveNoteId(remaining[0]?.id || null);
          setEditorTitle("");
          setEditorContent("");
          lastLoadedNoteId.current = null;
        }
        toasts.info("Note deleted.");
      } catch (err) {
        toasts.error(err.message || "Failed to delete note.");
      }
    },
    [notes, activeNoteId, toasts]
  );

  const onSaveNote = useCallback(async () => {
    if (!activeNoteId) return;
    const title = editorTitle.trim();
    if (!title) {
      toasts.error("Title cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateNote({ noteId: activeNoteId, title, content: editorContent });
      const n = normalizeNote(updated);
      setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, ...n } : x)));
      toasts.success("Saved.");
    } catch (err) {
      toasts.error(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [activeNoteId, editorTitle, editorContent, toasts]);

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-badge" aria-hidden="true" />
            <div>Secure Notes</div>
          </div>

          <div className="header-actions">
            <div className="header-user">{auth.userEmail ? `Signed in as ${auth.userEmail}` : "Authenticated session"}</div>
            <button className="btn btn-sm" onClick={() => auth.actions.refreshSession()}>
              Refresh
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => auth.actions.logout()}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-header-title">
              <h2>Collections</h2>
              <button className="btn btn-sm btn-secondary" onClick={onCreateCollection}>
                + New
              </button>
            </div>
            <div className="small muted" style={{ marginTop: 6 }}>
              Organize notes into folders
            </div>
          </div>

          <div className="sidebar-content">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <div className="pill">
                {loadingCollections ? <span className="spinner" aria-hidden="true" /> : null}
                <span>{collections.length} total</span>
              </div>
            </div>

            {collections.length === 0 ? (
              <div className="small muted">
                No collections yet. Create your first collection to start writing notes.
              </div>
            ) : (
              <div className="list" role="list">
                {collections.map((c) => (
                  <div
                    key={c.id}
                    className={["list-item", c.id === activeCollectionId ? "active" : ""].join(" ")}
                    role="listitem"
                    onClick={() => setActiveCollectionId(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setActiveCollectionId(c.id);
                    }}
                    tabIndex={0}
                  >
                    <div className="row-between">
                      <div className="list-item-title" title={c.name}>
                        {c.name}
                      </div>
                      <div className="row" style={{ gap: 6 }}>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRenameCollection(c.id);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCollection(c.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="main-panel">
          <section className="notes-list">
            <div className="notes-list-header">
              <div className="row-between">
                <h2>Notes</h2>
                <button className="btn btn-sm btn-primary" onClick={onCreateNote} disabled={!activeCollectionId}>
                  + New
                </button>
              </div>
              <div className="small muted" style={{ marginTop: 6 }}>
                {activeCollection ? `In “${activeCollection.name}”` : "Select a collection"}
              </div>
            </div>

            <div className="notes-list-content">
              <div className="row-between" style={{ marginBottom: 10 }}>
                <div className="pill">
                  {loadingNotes ? <span className="spinner" aria-hidden="true" /> : null}
                  <span>{notes.length} notes</span>
                </div>
              </div>

              {activeCollectionId && notes.length === 0 ? (
                <div className="small muted">No notes yet. Create one to start writing.</div>
              ) : null}

              {!activeCollectionId ? <div className="small muted">Choose a collection from the left.</div> : null}

              <div className="list" role="list">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className={["list-item", n.id === activeNoteId ? "active" : ""].join(" ")}
                    role="listitem"
                    onClick={() => setActiveNoteId(n.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setActiveNoteId(n.id);
                    }}
                    tabIndex={0}
                  >
                    <div className="row-between">
                      <div style={{ minWidth: 0 }}>
                        <div className="list-item-title" title={n.title}>
                          {n.title}
                        </div>
                        <div className="list-item-subtitle" title={n.content}>
                          {truncate(n.content, 60)}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(n.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="editor">
            <div className="editor-header">
              <div className="row-between">
                <h2>Editor</h2>
                <button className="btn btn-sm btn-secondary" onClick={onSaveNote} disabled={!activeNoteId || saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
              <div className="small muted" style={{ marginTop: 6 }}>
                {activeNote ? `Editing: ${activeNote.title}` : "Select a note to edit"}
              </div>
            </div>

            <div className="editor-body">
              {!activeNoteId ? (
                <div className="small muted">Pick a note on the left, or create a new note.</div>
              ) : (
                <div className="stack">
                  <div className="stack" style={{ gap: 6 }}>
                    <label className="small" htmlFor="note-title">
                      Title
                    </label>
                    <input
                      id="note-title"
                      className="input"
                      value={editorTitle}
                      onChange={(e) => setEditorTitle(e.target.value)}
                      placeholder="Title"
                    />
                  </div>

                  <div className="stack" style={{ gap: 6 }}>
                    <label className="small" htmlFor="note-content">
                      Content (markdown/plain text)
                    </label>
                    <textarea
                      id="note-content"
                      className="textarea"
                      value={editorContent}
                      onChange={(e) => setEditorContent(e.target.value)}
                      placeholder="Write your note here…"
                    />
                  </div>

                  <div className="row-between">
                    <div className="small muted">
                      Tip: click <strong>Save</strong> to persist changes
                    </div>
                    <div className="row">
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          // reload current note from API
                          lastLoadedNoteId.current = null;
                          toasts.info("Reloading note…");
                          api
                            .getNote({ noteId: activeNoteId })
                            .then((data) => {
                              const n = normalizeNote(data);
                              setEditorTitle(n.title || "");
                              setEditorContent(n.content || "");
                              toasts.success("Reloaded.");
                            })
                            .catch((err) => toasts.error(err.message || "Reload failed."));
                        }}
                      >
                        Reload
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {collectionModal ? (
        <Modal
          title={collectionModal.mode === "create" ? "Create collection" : "Rename collection"}
          onClose={() => setCollectionModal(null)}
          footer={
            <div className="row-between">
              <button className="btn" onClick={() => setCollectionModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={onSubmitCollectionModal}>
                {collectionModal.mode === "create" ? "Create" : "Save"}
              </button>
            </div>
          }
        >
          <div className="stack" style={{ gap: 6 }}>
            <label className="small" htmlFor="collection-name">
              Name
            </label>
            <input
              id="collection-name"
              className="input"
              value={collectionNameDraft}
              onChange={(e) => setCollectionNameDraft(e.target.value)}
              placeholder="e.g. Work, Personal, Ideas…"
              autoFocus
            />
          </div>
        </Modal>
      ) : null}

      {noteModal ? (
        <Modal
          title="Create note"
          onClose={() => setNoteModal(null)}
          footer={
            <div className="row-between">
              <button className="btn" onClick={() => setNoteModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={onSubmitNoteModal}>
                Create
              </button>
            </div>
          }
        >
          <div className="stack" style={{ gap: 6 }}>
            <label className="small" htmlFor="note-title-draft">
              Title
            </label>
            <input
              id="note-title-draft"
              className="input"
              value={noteTitleDraft}
              onChange={(e) => setNoteTitleDraft(e.target.value)}
              autoFocus
            />
          </div>
          <div className="small muted">A blank note will be created; use the editor to write content.</div>
        </Modal>
      ) : null}
    </div>
  );
}
