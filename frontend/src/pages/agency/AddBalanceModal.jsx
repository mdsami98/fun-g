import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../api/client';

export function AddBalanceModal({ user, agencyId, accessToken, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError('Enter a valid amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const result = await api.addUserBalance(accessToken, agencyId, user.id, value);
      setSuccess(`৳${value.toLocaleString()} added. New balance: ৳${parseFloat(result.balance).toLocaleString()}`);
      setAmount('');
      onSuccess?.(user.id, result.balance);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add balance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-balance-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <div className="admin-modal-title" id="add-balance-modal-title">
              Add Balance
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
          {success && <div className="success-message">{success}</div>}

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 16 }}>
            Current balance: <strong style={{ color: '#4caf50' }}>৳{parseFloat(user.balance || 0).toLocaleString()}</strong>
          </p>

          <form onSubmit={handleSubmit}>
            <label className="label" htmlFor="add-balance-amount">
              Amount (৳)
            </label>
            <input
              id="add-balance-amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              style={{ marginBottom: 16 }}
              autoFocus
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !amount}
              style={{ width: 'auto', padding: '10px 20px', fontSize: 14 }}
            >
              {isSubmitting ? 'Adding…' : 'Add Balance'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
