import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthPromptModal } from '../../components/AuthPromptModal';
import '../../styles/userTheme.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: '🏠', end: true, requiresAuth: false },
  { to: '/activity', label: 'Activity', icon: '🧾', requiresAuth: true },
  { to: '/wallet', label: 'Wallet', icon: '👛', requiresAuth: true },
  { to: '/settings', label: 'Settings', icon: '⚙️', requiresAuth: true },
];

export function UserLayout() {
  const { isAuthenticated, user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  return (
    <div className="user-shell">
      <div className="user-shell-inner">
        <div className="u-app-header">
          <div className="u-app-logo">🎮 AVIATOR</div>
          {isAuthenticated ? (
            <div className="u-ticker-btn" style={{ cursor: 'default' }}>
              💰 ৳{user.balance}
            </div>
          ) : (
            <Link to="/login" className="u-header-login-btn">
              Login
            </Link>
          )}
        </div>

        <div className="user-content">
          <Outlet />
        </div>

        <nav className="u-bottom-nav">
          {NAV_ITEMS.map((item) =>
            item.requiresAuth && !isAuthenticated ? (
              <button
                key={item.to}
                type="button"
                className="u-nav-link"
                onClick={() => setShowAuthPrompt(true)}
              >
                <span className="u-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `u-nav-link${isActive ? ' active' : ''}`}
              >
                <span className="u-nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
      </div>

      <AuthPromptModal open={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} />
    </div>
  );
}
