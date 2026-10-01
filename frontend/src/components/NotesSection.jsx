import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getNotes, createNote, updateNote, deleteNote } from '../services/api';
import { formatDate } from '../utils/formatters';

export const NotesSection = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchNotesList = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getNotes(token);
      setNotes(res.notes || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch notes', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    fetchNotesList();
  }, [fetchNotesList]);

  const handleOpenCreate = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteBody('');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (note) => {
    setEditingNoteId(note._id);
    setNoteTitle(note.title);
    setNoteBody(note.body);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    if (submitting) return;
    setIsEditorOpen(false);
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteBody('');
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    const cleanTitle = noteTitle.trim();
    const cleanBody = noteBody.trim();

    if (!cleanTitle || !cleanBody) {
      showToast('Title and content are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingNoteId) {
        await updateNote(token, editingNoteId, cleanTitle, cleanBody);
        showToast('Note updated successfully', 'success');
      } else {
        await createNote(token, cleanTitle, cleanBody);
        showToast('Note created successfully', 'success');
      }
      handleCloseEditor();
      fetchNotesList();
    } catch (err) {
      showToast(err.message || 'Failed to save note', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId, noteTitle) => {
    if (!window.confirm(`Delete note "${noteTitle}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteNote(token, noteId);
      showToast('Note deleted', 'info');
      setNotes((prev) => prev.filter((n) => n._id !== noteId));
    } catch (err) {
      showToast(err.message || 'Failed to delete note', 'error');
    }
  };

  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
  });

  return (
    <main className="app-main" style={{ maxWidth: '980px', margin: '0 auto', width: '100%' }}>
      <section className="action-toolbar" style={{ margin: '0 0 20px 0' }}>
        <div className="toolbar-filters">
          <div className="search-box">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search notes by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>+ New Note</span>
        </button>
      </section>

      {isEditorOpen && (
        <section className="table-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {editingNoteId ? 'Edit Personal Note' : 'Create Personal Note'}
            </h3>
            <button
              type="button"
              className="modal-close-btn"
              onClick={handleCloseEditor}
              disabled={submitting}
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSaveNote}>
            <div className="form-group">
              <label className="form-label" htmlFor="note-input-title">Title</label>
              <input
                type="text"
                id="note-input-title"
                className="form-input"
                placeholder="e.g. Viva Presentation Points, Credentials Reminder"
                maxLength={100}
                required
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                disabled={submitting}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="note-input-body">Note Content</label>
              <textarea
                id="note-input-body"
                className="form-input"
                rows={6}
                placeholder="Type your notes here..."
                required
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseEditor}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!noteTitle.trim() || !noteBody.trim() || submitting}
              >
                {submitting ? 'Saving...' : editingNoteId ? 'Update Note' : 'Create Note'}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card" style={{ height: '140px', borderRadius: 'var(--radius-lg)' }}></div>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <section className="table-card">
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <h3>No personal notes found</h3>
            <p>Write quick notes, reminders, or revision summaries separate from files.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
              + Create First Note
            </button>
          </div>
        </section>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
          {filteredNotes.map((note) => (
            <div
              key={note._id}
              className="note-card"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
                transition: 'var(--transition)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, wordBreak: 'break-word' }}>
                    {note.title}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                    {formatDate(note.updatedAt || note.createdAt)}
                  </span>
                </div>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  margin: '0 0 16px 0',
                }}>
                  {note.body}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenEdit(note)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className="btn btn-danger-outline btn-sm"
                  onClick={() => handleDeleteNote(note._id, note.title)}
                  title="Delete note"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};
