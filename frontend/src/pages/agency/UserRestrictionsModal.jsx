import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../api/client';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function UserRestrictionsModal({ user, agencyId, accessToken, onClose }) {
  const [restrictions, setRestrictions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editMessage, setEditMessage] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    api
      .getUserRestrictions(accessToken, agencyId, user.id)
      .then((data) => {
        if (!cancelled) setRestrictions(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load restrictions');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, agencyId, user.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Restriction message is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const created = await api.addUserRestriction(accessToken, agencyId, user.id, trimmed);
      setRestrictions((prev) => [created, ...prev]);
      setMessage('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add restriction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (restriction) => {
    setError('');
    setEditingId(restriction.id);
    setEditMessage(restriction.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditMessage('');
  };

  const handleSaveEdit = async (restrictionId) => {
    const trimmed = editMessage.trim();
    if (!trimmed) {
      setError('Restriction message is required.');
      return;
    }

    setIsSavingEdit(true);
    setError('');
    try {
      const updated = await api.updateUserRestriction(
        accessToken,
        agencyId,
        user.id,
        restrictionId,
        trimmed,
      );
      setRestrictions((prev) => prev.map((r) => (r.id === restrictionId ? updated : r)));
      setEditingId(null);
      setEditMessage('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update restriction');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (restrictionId) => {
    setDeletingId(restrictionId);
    setError('');
    try {
      await api.deleteUserRestriction(accessToken, agencyId, user.id, restrictionId);
      setRestrictions((prev) => prev.filter((r) => r.id !== restrictionId));
      if (editingId === restrictionId) cancelEdit();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete restriction');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restrictions-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <div className="admin-modal-title" id="restrictions-modal-title">
              Set Restriction
            </div>
            <div className="admin-modal-subtitle">
              {user.name || '—'} · {user.phone}
            </div>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="admin-modal-body">
          {error && <div className="error-message">{error}</div>}

          {isLoading ? (
            <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '20px 0' }}>
              Loading restrictions…
            </p>
          ) : restrictions.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 16 }}>
              No restrictions set for this player yet.
            </p>
          ) : (
            <div className="restriction-list">
              {restrictions.map((r) =>
                editingId === r.id ? (
                  <div className="restriction-item" key={r.id}>
                    <textarea
                      className="restriction-textarea"
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      disabled={isSavingEdit}
                      style={{ marginBottom: 10 }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleSaveEdit(r.id)}
                        disabled={isSavingEdit || !editMessage.trim()}
                        style={{ width: 'auto', padding: '7px 16px', fontSize: 13 }}
                      >
                        {isSavingEdit ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={cancelEdit}
                        disabled={isSavingEdit}
                        style={{ padding: '7px 16px', fontSize: 13 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="restriction-item" key={r.id}>
                    <div className="restriction-message">{r.message}</div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div className="restriction-date">{formatDate(r.createdAt)}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => startEdit(r)}
                          disabled={deletingId === r.id}
                          style={{ padding: '4px 10px', fontSize: 12 }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          style={{ padding: '4px 10px', fontSize: 12 }}
                        >
                          {deletingId === r.id ? 'Deleting…' : '🗑️ Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          <form className="restriction-form" onSubmit={handleSubmit}>
            <label className="label" htmlFor="restriction-message">
              New Restriction
            </label>
            <textarea
              id="restriction-message"
              className="restriction-textarea"
              placeholder="e.g. Withdrawals paused pending ID verification"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              style={{ marginBottom: 12 }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !message.trim()}
              style={{ width: 'auto', padding: '10px 20px', fontSize: 14 }}
            >
              {isSubmitting ? 'Saving…' : 'Add Restriction'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
