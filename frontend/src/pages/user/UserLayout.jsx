import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthPromptModal } from '../../components/AuthPromptModal';
import { AppDownloadHeader } from '../../components/AppDownloadHeader';
import { SideDrawerMenu } from '../../components/SideDrawerMenu';
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="user-shell">
      <a className="u-skip-link" href="#main">
        Skip to content
      </a>

      <div className="user-shell-inner">
        {/* Top App Download Notice */}
        <AppDownloadHeader />

        {/* Main Header matching CkasH reference */}
        <header className="u-app-header">
          <div className="header-left-cluster">
            <button
              type="button"
              className="header-drawer-toggle"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>

            <Link to="/" className="u-app-logo" aria-label="CkasH — home">
              <span className="logo-crown">👑</span>
              <span className="logo-brand-text">
                <span className="brand-c">C</span>kas<span className="brand-h">H</span>
              </span>
            </Link>
          </div>

          {isAuthenticated ? (
            <div className="header-right-cluster">
              <Link to="/wallet" className="u-header-balance-pill">
                <span className="balance-symbol">৳</span>
                <span className="balance-digits">
                  {user?.balance ? parseFloat(user.balance).toLocaleString() : '0'}
                </span>
              </Link>
              <Link to="/account" className="u-header-avatar" aria-label="User account">
                <span className="avatar-initial">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
              </Link>
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
      <SideDrawerMenu isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
