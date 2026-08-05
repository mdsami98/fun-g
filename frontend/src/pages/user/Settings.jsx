import { useAuth } from '../../context/AuthContext';

export function Settings() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1 className="u-page-title">Settings</h1>

      <div className="u-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🙂</div>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{user.name}</div>
        <div style={{ color: 'var(--u-muted)', fontSize: 13, marginBottom: 12 }}>{user.phone}</div>
        <div className="u-balance-value">৳ {user.balance}</div>
      </div>

      <div className="u-card">
        <div className="u-account-row">
          <span className="u-account-label">Phone</span>
          <span className="u-account-value">{user.phone}</span>
        </div>
        {user.agency && (
          <>
            <div className="u-account-row">
              <span className="u-account-label">Agency</span>
              <span className="u-account-value">{user.agency.name}</span>
            </div>
            <div className="u-account-row">
              <span className="u-account-label">Agency Code</span>
              <span className="u-account-value">{user.agency.agencyCode}</span>
            </div>
          </>
        )}
        <div className="u-account-row">
          <span className="u-account-label">Status</span>
          <span className="u-account-value">{user.isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      <button className="u-logout-btn" type="button" onClick={logout}>
        Log out
      </button>
    </div>
  );
}
