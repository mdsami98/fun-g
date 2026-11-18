import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/agency', label: 'Dashboard', icon: '📊', end: true },
  { to: '/agency/support', label: 'Support Chat', icon: '💬' },
  { to: '/agency/promo-codes', label: 'Promo Codes', icon: '🎟️' },
  { to: '/agency/users', label: 'Users', icon: '👥' },
  { to: '/agency/deposits', label: 'Deposits', icon: '📥' },
  { to: '/agency/settings', label: 'Settings', icon: '⚙️' },
  { to: '/agency/profile', label: 'Profile', icon: '👤' },
];



export function AgencyLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">🏢 AGENCY ADMIN</div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user.name}</strong>
            {user.phone}
          </div>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
