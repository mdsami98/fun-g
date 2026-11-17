import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Icon } from './Icon';

function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'এইমাত্র';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} মিনিট আগে`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'গতকাল';
  return `${diffDays} দিন আগে`;
}

function getNotificationIcon(type) {
  switch (type) {
    case 'deposit_approved':
      return { icon: 'check-circle', color: '#4ade80' };
    case 'deposit_rejected':
      return { icon: 'x-circle', color: '#f87171' };
    case 'withdraw_approved':
      return { icon: 'wallet', color: '#38bdf8' };
    case 'withdraw_rejected':
      return { icon: 'warning', color: '#f87171' };
    case 'referral_bonus':
      return { icon: 'gift', color: '#f59e0b' };
    case 'spin_reward':
      return { icon: 'sparkle', color: '#ec4899' };
    case 'vip_reward':
      return { icon: 'trophy', color: '#a855f7' };
    default:
      return { icon: 'bell', color: '#60a5fa' };
  }
}

export function NotificationBell() {
  const { isAuthenticated, accessToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!isAuthenticated || !accessToken) return;
    try {
      const res = await api.getMyNotifications(accessToken, 20);
      setNotifications(res.items || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000); // Poll every 25s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.markNotificationRead(accessToken, notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Continue
      }
    }
  };

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    try {
      await api.markAllNotificationsRead(accessToken);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Continue
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        style={{
          position: 'relative',
          background: isOpen ? '#1e293b' : 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 20,
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: unreadCount > 0 ? '#fde047' : '#cbd5e1',
          transition: 'all 0.2s ease',
        }}
      >
        <Icon name="bell" weight={unreadCount > 0 ? 'fill' : 'regular'} size={19} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 800,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #090d16',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 46,
            right: 0,
            width: 320,
            maxWidth: 'calc(100vw - 24px)',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 16,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.75), 0 0 20px rgba(15, 23, 42, 0.5)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeInSlide 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #1e293b',
              backgroundColor: '#090d16',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
                নোটিফিকেশন
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 10,
                  }}
                >
                  {unreadCount} নতুন
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                সব পঠিত মার্ক করুন
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔕</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>কোনো নোটিফিকেশন নেই</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>নতুন আপডেট এখানে প্রদর্শিত হবে</div>
              </div>
            ) : (
              notifications.map((notif) => {
                const { icon, color } = getNotificationIcon(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      backgroundColor: notif.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.08)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color,
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={icon} weight="fill" size={17} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: notif.isRead ? 600 : 800,
                          color: notif.isRead ? '#cbd5e1' : '#f8fafc',
                          marginBottom: 2,
                        }}
                      >
                        {notif.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#94a3b8',
                          lineHeight: 1.4,
                          marginBottom: 4,
                        }}
                      >
                        {notif.message}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>
                        {formatTimeAgo(notif.createdAt)}
                      </div>
                    </div>

                    {!notif.isRead && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#38bdf8',
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
