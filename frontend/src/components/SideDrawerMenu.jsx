import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icon';

export function SideDrawerMenu({ isOpen, onClose, onOpenSpin, onOpenSupport, onOpenPromo }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-user-info">
            <div className="drawer-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="drawer-username">
                {isAuthenticated ? user?.name || user?.phone : 'গেস্ট প্লেয়ার'}
              </div>
              <div className="drawer-user-phone">
                {isAuthenticated ? user?.phone : 'লগইন করুন সম্পূর্ণ সুবিধার জন্য'}
              </div>
            </div>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        {/* Balance Card */}
        {isAuthenticated ? (
          <div className="drawer-balance-card">
            <div className="drawer-balance-label">মোট ব্যালেন্স:</div>
            <div className="drawer-balance-amount">৳ {user?.balance || '0.00'}</div>
            <div className="drawer-balance-actions">
              <button
                type="button"
                className="drawer-action-btn deposit"
                onClick={() => goTo('/wallet')}
              >
                💼 ডিপোজিট
              </button>
              <button
                type="button"
                className="drawer-action-btn withdraw"
                onClick={() => goTo('/wallet')}
              >
                🏧 উত্তোলন
              </button>
            </div>
          </div>
        ) : (
          <div className="drawer-auth-buttons">
            <button
              type="button"
              className="drawer-login-btn"
              onClick={() => goTo('/login')}
            >
              লগ ইন
            </button>
            <button
              type="button"
              className="drawer-register-btn"
              onClick={() => goTo('/register')}
            >
              রেজিস্ট্রেশন
            </button>
          </div>
        )}

        {/* Menu Navigation Links */}
        <nav className="drawer-nav-list">
          <button type="button" className="drawer-nav-item" onClick={() => goTo('/')}>
            <span className="drawer-nav-icon"><Icon name="house" weight="fill" size={20} /></span>
            <span>হোম (Home)</span>
          </button>

          <button type="button" className="drawer-nav-item" onClick={() => goTo('/games')}>
            <span className="drawer-nav-icon"><Icon name="game-controller" weight="fill" size={20} /></span>
            <span>সকল গেম (All Games)</span>
          </button>

          <button type="button" className="drawer-nav-item highlight" onClick={() => goTo('/aviator')}>
            <span className="drawer-nav-icon"><Icon name="airplane-tilt" weight="fill" size={20} /></span>
            <span>Aviator ক্র্যাশ গেম</span>
            <span className="drawer-badge hot">HOT</span>
          </button>

          <button type="button" className="drawer-nav-item" onClick={() => goTo('/wallet')}>
            <span className="drawer-nav-icon"><Icon name="wallet" weight="fill" size={20} /></span>
            <span>ওয়ালেট ও ট্রানজেকশন</span>
          </button>

          <button type="button" className="drawer-nav-item" onClick={() => goTo('/activity')}>
            <span className="drawer-nav-icon"><Icon name="clock-counter-clockwise" weight="fill" size={20} /></span>
            <span>বেট হিস্ট্রি ও অ্যাক্টিভিটি</span>
          </button>

          <button type="button" className="drawer-nav-item" onClick={() => goTo('/referrals')}>
            <span className="drawer-nav-icon"><Icon name="gift" weight="fill" size={20} /></span>
            <span>রেফার ও আয় (Refer & Earn)</span>
            <span className="drawer-badge" style={{ background: '#10b981', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>৳ বোনাস</span>
          </button>

          <div className="drawer-divider" />

          <button
            type="button"
            className="drawer-nav-item"
            onClick={() => {
              onClose();
              if (onOpenSpin) onOpenSpin();
            }}
          >
            <span className="drawer-nav-icon">🎡</span>
            <span>দৈনিক লাকি স্পিন (Lucky Spin)</span>
            <span className="drawer-badge" style={{ background: '#ec4899', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>ফ্রি</span>
          </button>

          <button
            type="button"
            className="drawer-nav-item"
            onClick={() => goTo('/vip')}
          >
            <span className="drawer-nav-icon"><Icon name="trophy" weight="fill" size={20} /></span>
            <span>ভিআইপি ক্লাব (VIP Club)</span>
            <span className="drawer-badge" style={{ background: '#f59e0b', color: '#090d16', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto', fontWeight: 'bold' }}>ক্যাশ বোনাস</span>
          </button>

          <button
            type="button"
            className="drawer-nav-item"
            onClick={() => {
              onClose();
              if (onOpenPromo) onOpenPromo();
            }}
          >
            <span className="drawer-nav-icon">🎟️</span>
            <span>প্রোমো কোড রিডিম (Redeem)</span>
            <span className="drawer-badge" style={{ background: '#8b5cf6', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>ভাউচার</span>
          </button>



          <button
            type="button"
            className="drawer-nav-item"
            onClick={() => {
              onClose();
              if (onOpenSupport) onOpenSupport();
            }}
          >
            <span className="drawer-nav-icon"><Icon name="broadcast" weight="fill" size={20} /></span>
            <span>কাস্টমার সাপোর্ট (Live Chat)</span>
            <span className="drawer-badge" style={{ background: '#10b981', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>অনলাইন</span>
          </button>


          {isAuthenticated && (
            <button
              type="button"
              className="drawer-nav-item logout"
              onClick={() => {
                logout();
                onClose();
              }}
            >
              <span className="drawer-nav-icon">🚪</span>
              <span>লগ আউট (Log out)</span>
            </button>
          )}
        </nav>
      </aside>
    </div>
  );
}
