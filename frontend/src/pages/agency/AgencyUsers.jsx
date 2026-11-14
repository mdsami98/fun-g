import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../api/client';
import { UserRestrictionsModal } from './UserRestrictionsModal';
import { AddBalanceModal } from './AddBalanceModal';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function AgencyUsers() {
  const { user, accessToken } = useAuth();
  const [searchParams] = useSearchParams();
  const queryAgencyId = searchParams.get('agencyId');
  const agencyId = queryAgencyId || user?.agencyId || user?.agency?.id;

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [restrictionUser, setRestrictionUser] = useState(null);
  const [balanceUser, setBalanceUser] = useState(null);
  const menuRef = useRef(null);
  const canAddBalance = user?.role === 'super_admin' || user?.role === 'agency_admin';

  const toggleMenu = (e, userId) => {
    if (openMenuId === userId) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 6, left: rect.right });
    setOpenMenuId(userId);
  };

  useEffect(() => {
    if (!openMenuId) return undefined;
    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [openMenuId]);

  const loadUsers = async () => {
    if (!agencyId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getAgencyUsers(accessToken, agencyId);
      // Strictly exclude agency admins from the players list
      const playerList = Array.isArray(data)
        ? data.filter((u) => u.role === 'user')
        : [];
      setUsers(playerList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load agency users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || '').includes(search);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.isActive) ||
      (statusFilter === 'inactive' && !u.isActive);
    return matchesSearch && matchesStatus;
  });

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;
  const totalBalance = users
    .reduce((sum, u) => sum + parseFloat(u.balance || 0), 0)
    .toFixed(2);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Agency Players</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, marginTop: 4 }}>
            View and manage all registered players under your agency.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={loadUsers}
          disabled={isLoading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {isLoading ? 'Refreshing…' : '🔄 Refresh Data'}
        </button>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Players</div>
          <div className="stat-value">{totalUsers}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Total Player Balance</div>
          <div className="stat-card-value" style={{ color: '#4caf50' }}>
            ৳{parseFloat(totalBalance).toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Active Players</div>
          <div className="stat-card-value" style={{ color: '#22c55e' }}>
            {activeCount}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Disabled Accounts</div>
          <div className="stat-card-value" style={{ color: inactiveCount > 0 ? '#ff5c72' : 'inherit' }}>
            {inactiveCount}
          </div>
        </div>
      </div>

      {/* Main Tabular View Card */}
      <div className="dashboard-card">
        {/* Tabular Navigation & Search Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          {/* Sub-Tabs: All Players, Active, Disabled */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`agency-filter-btn${statusFilter === 'all' ? ' active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Players ({totalUsers})
            </button>
            <button
              type="button"
              className={`agency-filter-btn${statusFilter === 'active' ? ' active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`agency-filter-btn${statusFilter === 'inactive' ? ' active' : ''}`}
              onClick={() => setStatusFilter('inactive')}
            >
              Disabled ({inactiveCount})
            </button>
          </div>

          {/* Live Search Input */}
          <div style={{ minWidth: 260 }}>
            <input
              type="text"
              placeholder="🔍 Search player name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle, #3d3d3d)',
                borderRadius: 8,
                color: '#ffffff',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Tabular Table Content */}
        {isLoading ? (
          <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '30px 0' }}>
            Loading players list…
          </p>
        ) : filteredUsers.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '30px 0' }}>
            {search || statusFilter !== 'all'
              ? 'No players match your search/filter.'
              : 'No players registered under this agency yet.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Player Name</th>
                  <th>Phone Number</th>
                  <th style={{ textAlign: 'right' }}>Wallet Balance</th>
                  <th style={{ textAlign: 'center' }}>Account Status</th>
                  <th style={{ textAlign: 'right' }}>Registered Date</th>
                  <th style={{ textAlign: 'center', width: 70 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => (
                  <tr key={u.id}>
                    <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                      {idx + 1}
                    </td>
                    <td>
                      <strong style={{ fontSize: 15, color: '#ffffff' }}>
                        {u.name || '—'}
                      </strong>
                    </td>
                    <td>
                      <code
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 13,
                          letterSpacing: 0.5,
                        }}
                      >
                        {u.phone}
                      </code>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <strong
                        style={{
                          color: '#4caf50',
                          fontSize: 15,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        ৳{parseFloat(u.balance || 0).toLocaleString()}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={`status-pill ${u.isActive ? 'active' : 'inactive'}`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.65)',
                      }}
                    >
                      {formatDate(u.createdAt)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="row-menu" ref={openMenuId === u.id ? menuRef : null}>
                        <button
                          type="button"
                          className={`row-menu-btn${openMenuId === u.id ? ' active' : ''}`}
                          aria-label={`Actions for ${u.name || u.phone}`}
                          aria-haspopup="true"
                          aria-expanded={openMenuId === u.id}
                          onClick={(e) => toggleMenu(e, u.id)}
                        >
                          ⋮
                        </button>
                        {openMenuId === u.id && menuPosition && (
                          <div
                            className="row-menu-dropdown"
                            style={{ top: menuPosition.top, left: menuPosition.left, transform: 'translateX(-100%)' }}
                          >
                            <button
                              type="button"
                              className="row-menu-item"
                              onClick={() => {
                                setOpenMenuId(null);
                                setRestrictionUser(u);
                              }}
                            >
                              🚫 Set Restriction
                            </button>
                            {canAddBalance && (
                              <button
                                type="button"
                                className="row-menu-item"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setBalanceUser(u);
                                }}
                              >
                                💰 Add Balance
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {restrictionUser && (
        <UserRestrictionsModal
          user={restrictionUser}
          agencyId={agencyId}
          accessToken={accessToken}
          onClose={() => setRestrictionUser(null)}
        />
      )}

      {balanceUser && (
        <AddBalanceModal
          user={balanceUser}
          agencyId={agencyId}
          accessToken={accessToken}
          onClose={() => setBalanceUser(null)}
          onSuccess={(userId, newBalance) => {
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, balance: newBalance } : u)));
            setBalanceUser((prev) => (prev ? { ...prev, balance: newBalance } : prev));
          }}
        />
      )}
    </div>
  );
}
