import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

export function AgencyDashboard() {
  const { user, accessToken } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id;
  const [stats, setStats] = useState({ pendingCount: 0, approvedCount: 0, rejectedCount: 0 });

  useEffect(() => {
    if (!agencyId) return;
    api
      .getAgencyDepositStats(accessToken, agencyId)
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, [accessToken, agencyId]);

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      <div className="stat-grid">
        <Link to="/agency/deposits" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-card" style={{ borderColor: stats.pendingCount > 0 ? 'var(--error)' : undefined }}>
            <div className="stat-card-label">Pending Deposits</div>
            <div className="stat-card-value" style={{ color: stats.pendingCount > 0 ? 'var(--error)' : undefined }}>
              {stats.pendingCount}
            </div>
            {stats.pendingCount > 0 && (
              <span style={{ fontSize: 12, color: 'var(--accent-gold)' }}>
                ➔ Review now
              </span>
            )}
          </div>
        </Link>

        <div className="stat-card">
          <div className="stat-card-label">Approved Deposits</div>
          <div className="stat-card-value">{stats.approvedCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Pending Withdrawals</div>
          <div className="stat-card-value">—</div>
        </div>

        <Link to="/agency/users" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-card">
            <div className="stat-card-label">Agency Users</div>
            <div className="stat-card-value" style={{ color: '#4da6ff' }}>👥 View</div>
            <span style={{ fontSize: 12, color: 'var(--accent-gold)' }}>
              ➔ View user list
            </span>
          </div>
        </Link>
      </div>

      <div className="dashboard-card">
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/agency/users" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            👥 View Agency Users
          </Link>
          <Link to="/agency/deposits" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            📥 Manage Deposits ({stats.pendingCount} pending)
          </Link>
          <Link to="/agency/settings" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ⚙️ Wallet Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
