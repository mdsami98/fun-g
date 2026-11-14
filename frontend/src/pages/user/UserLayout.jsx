import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthPromptModal } from '../../components/AuthPromptModal';
import { Icon } from '../../components/Icon';
import '../../styles/userTheme.css';

/* Bottom nav: 5 top-level destinations, each icon + label (fill weight).
   The `center` item renders as the solid primary pill. */
const NAV_ITEMS = [
  { to: '/', label: 'Promotion', icon: 'gift', end: true, requiresAuth: false },
  { to: '/activity', label: 'Activity', icon: 'clock-counter-clockwise', requiresAuth: true },
  { to: '/games', label: 'Games', icon: 'game-controller', requiresAuth: false, center: true },
  { to: '/wallet', label: 'Wallet', icon: 'wallet', requiresAuth: true },
  { to: '/account', label: 'Account', icon: 'user', requiresAuth: true },
];

function NavContent({ item }) {
  return (
    <>
      {item.center ? (
        <span className="u-nav-center-btn">
          <Icon name={item.icon} weight="fill" size={24} />
        </span>
      ) : (
        <span className="u-nav-icon">
          <Icon name={item.icon} weight="fill" size={24} />
        </span>
      )}
      <span className="u-nav-label">{item.label}</span>
    </>
  );
}

export function UserLayout() {
  const { isAuthenticated, user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  return (
    <div className="user-shell">
      <a className="u-skip-link" href="#main">
        Skip to content
      </a>

      <div className="user-shell-inner">
        <header className="u-app-header">
          <Link to="/" className="u-app-logo" aria-label="Aviator — home">
            <Icon name="game-controller" weight="fill" size={26} />
            <span className="u-app-logo-text">AVIATOR</span>
          </Link>
          {isAuthenticated ? (
            <div className="u-header-balance">
              <Icon name="coins" weight="fill" size={20} />
              <span className="u-visually-hidden">Balance </span>৳{user.balance}
            </div>
          ) : (
            <div className="u-header-actions">
              <Link to="/login" className="u-header-btn outline">
                Log in
              </Link>
              <Link to="/register" className="u-header-btn solid">
                Register
              </Link>
            </div>
          )}
        </header>

        <main className="user-content" id="main" tabIndex={-1}>
          <Outlet />
        </main>

        <nav className="u-bottom-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const className = `u-nav-link${item.center ? ' center' : ''}`;

            return item.requiresAuth && !isAuthenticated ? (
              <button
                key={item.to}
                type="button"
                className={className}
                onClick={() => setShowAuthPrompt(true)}
              >
                <NavContent item={item} />
              </button>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `${className}${isActive ? ' active' : ''}`}
              >
                <NavContent item={item} />
              </NavLink>
            );
          })}
        </nav>
      </div>

      <AuthPromptModal open={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} />
    </div>
  );
}
