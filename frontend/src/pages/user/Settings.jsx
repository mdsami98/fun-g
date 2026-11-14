import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/Icon';

export function Settings() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1 className="u-page-title">Account</h1>

      <div className="u-card u-profile">
        <div className="u-profile-avatar">
          <Icon name="user-circle" size={40} />
        </div>
        <div className="u-profile-name">{user.name}</div>
        <div className="u-profile-phone">{user.phone}</div>
        <div className="u-balance-label">Balance</div>
        <div className="u-balance-value">৳{user.balance}</div>
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
        <Icon name="sign-out" size={20} />
        Log out
      </button>
    </div>
  );
}
