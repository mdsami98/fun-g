import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../api/client';

const STATUS_PILLS = {
  pending: { label: 'Pending', className: 'status-pill' },
  approved: { label: 'Approved', className: 'status-pill active' },
  rejected: { label: 'Rejected', className: 'status-pill inactive' },
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function AgencyDeposits() {
  const { user, accessToken } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id;

  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ pendingCount: 0, approvedCount: 0, rejectedCount: 0 });
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    if (!agencyId) return;
    setIsLoading(true);
    setError('');
    try {
      const [reqData, statsData] = await Promise.all([
        api.getAgencyDepositRequests(accessToken, agencyId),
        api.getAgencyDepositStats(accessToken, agencyId),
      ]);
      setRequests(Array.isArray(reqData) ? reqData : []);
      if (statsData) setStats(statsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load deposit requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const handleApprove = async (req) => {
    if (!window.confirm(`Approve deposit of ৳${req.amount} for ${req.user?.name || 'User'}? This will immediately add ৳${req.amount} to their account balance.`)) {
      return;
    }

    setProcessingId(req.id);
    setError('');
    setSuccess('');
    try {
      const result = await api.approveAgencyDepositRequest(accessToken, agencyId, req.id);
      setSuccess(`Deposit of ৳${req.amount} approved! User balance is now ৳${result.balance}.`);
      loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve deposit');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req) => {
    if (!window.confirm(`Reject deposit request for ৳${req.amount}? Balance will NOT be added.`)) {
      return;
    }

    setProcessingId(req.id);
    setError('');
    setSuccess('');
    try {
      await api.rejectAgencyDepositRequest(accessToken, agencyId, req.id);
      setSuccess(`Deposit request #${req.id} rejected.`);
      loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reject deposit');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div>
      <div className="dashboard-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Deposit Requests</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            Review, verify TrxIDs, and approve player deposits to credit their balances.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={loadData} disabled={isLoading}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setFilter('pending')}>
          <div className="stat-card-label">Pending Approval</div>
          <div className="stat-card-value" style={{ color: 'var(--error)' }}>
            {stats.pendingCount}
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setFilter('approved')}>
          <div className="stat-card-label">Approved Deposits</div>
          <div className="stat-card-value" style={{ color: '#2fe39a' }}>
            {stats.approvedCount}
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setFilter('rejected')}>
          <div className="stat-card-label">Rejected</div>
          <div className="stat-card-value" style={{ color: '#ff4d6a' }}>
            {stats.rejectedCount}
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="dashboard-card">
        {/* Filter buttons */}
        <div className="agency-filter-tabs">
          <button
            type="button"
            className={`agency-filter-btn${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Requests ({requests.length})
          </button>
          <button
            type="button"
            className={`agency-filter-btn${filter === 'pending' ? ' active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({requests.filter((r) => r.status === 'pending').length})
          </button>
          <button
            type="button"
            className={`agency-filter-btn${filter === 'approved' ? ' active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Approved ({requests.filter((r) => r.status === 'approved').length})
          </button>
          <button
            type="button"
            className={`agency-filter-btn${filter === 'rejected' ? ' active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            Rejected ({requests.filter((r) => r.status === 'rejected').length})
          </button>
        </div>

        {isLoading ? (
          <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '30px 0' }}>
            Loading requests…
          </p>
        ) : filteredRequests.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '30px 0' }}>
            No {filter !== 'all' ? filter : ''} deposit requests found.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Provider</th>
                  <th>Amount</th>
                  <th>TrxID</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const statusInfo = STATUS_PILLS[req.status] || STATUS_PILLS.pending;
                  const isProcessing = processingId === req.id;
                  return (
                    <tr key={req.id}>
                      <td>
                        <strong>{req.user?.name || '—'}</strong>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                          {req.user?.phone || '—'}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`tag-badge ${req.provider || 'bkash'}`}
                          style={{ textTransform: 'uppercase' }}
                        >
                          {req.provider}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--accent-gold, #cccccc)', fontSize: 15 }}>
                          ৳{parseFloat(req.amount).toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        <code
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            padding: '3px 6px',
                            borderRadius: 4,
                            fontSize: 13,
                          }}
                        >
                          {req.transactionId}
                        </code>
                      </td>
                      <td style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                        {formatDate(req.createdAt)}
                      </td>
                      <td>
                        <span className={statusInfo.className}>{statusInfo.label}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {req.status === 'pending' ? (
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn-approve"
                              disabled={isProcessing}
                              onClick={() => handleApprove(req)}
                              title="Approve & Credit Balance"
                            >
                              {isProcessing ? '…' : '✓ Approve'}
                            </button>
                            <button
                              type="button"
                              className="btn-reject"
                              disabled={isProcessing}
                              onClick={() => handleReject(req)}
                              title="Reject Deposit"
                            >
                              {isProcessing ? '…' : '✕ Reject'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                            {req.status === 'approved' ? '✓ Credited' : '✕ Rejected'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
