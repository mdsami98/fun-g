import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../api/client';

const EMPTY_FORM = {
  name: '',
  agencyCode: '',
  bkashNumber: '',
  adminName: '',
  adminPhone: '',
  adminPassword: '',
};

function formatDate(date) {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

export function AdminDashboard() {
  const { user, accessToken, logout } = useAuth();
  const [agencies, setAgencies] = useState([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);

  // Status toggle tracking
  const [togglingAgencyId, setTogglingAgencyId] = useState(null);

  // Money Flow Filters
  const [selectedAgencyId, setSelectedAgencyId] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [moneyFlow, setMoneyFlow] = useState(null);
  const [isLoadingMoneyFlow, setIsLoadingMoneyFlow] = useState(true);

  // Set dates based on preset
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    if (preset === 'today') {
      const formatted = formatDate(today);
      setStartDate(formatted);
      setEndDate(formatted);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const formatted = formatDate(y);
      setStartDate(formatted);
      setEndDate(formatted);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(today));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const loadMoneyFlow = async () => {
    setIsLoadingMoneyFlow(true);
    try {
      const params = {};
      if (selectedAgencyId && selectedAgencyId !== 'all') {
        params.agencyId = selectedAgencyId;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await api.getSuperAdminMoneyFlow(accessToken, params);
      setMoneyFlow(data);
    } catch (err) {
      console.error('Failed to load money flow:', err);
    } finally {
      setIsLoadingMoneyFlow(false);
    }
  };

  const loadAgencies = async () => {
    setIsLoadingAgencies(true);
    try {
      const data = await api.listAgencies(accessToken);
      setAgencies(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load agencies');
    } finally {
      setIsLoadingAgencies(false);
    }
  };

  useEffect(() => {
    loadAgencies();
  }, []);

  useEffect(() => {
    loadMoneyFlow();
  }, [selectedAgencyId, startDate, endDate]);

  const handleToggleStatus = async (agency) => {
    const nextStatus = !agency.isActive;
    const confirmMsg = nextStatus
      ? `Are you sure you want to ACTIVATE "${agency.name}"? Players and admins will be able to log in.`
      : `Are you sure you want to DEACTIVATE "${agency.name}"? All users and admins of this agency will be blocked from logging in on both Web and Mobile apps.`;

    if (!window.confirm(confirmMsg)) return;

    setTogglingAgencyId(agency.id);
    setError('');
    setSuccess('');
    try {
      await api.toggleAgencyStatus(accessToken, agency.id, nextStatus);
      setSuccess(
        `Agency "${agency.name}" is now ${nextStatus ? 'ACTIVE (সক্রিয়)' : 'INACTIVE (নিষ্ক্রিয়)'}.`
      );
      await Promise.all([loadAgencies(), loadMoneyFlow()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to toggle agency status');
    } finally {
      setTogglingAgencyId(null);
    }
  };

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      await api.createAgency(accessToken, {
        ...form,
        agencyCode: form.agencyCode.toUpperCase(),
      });
      setSuccess(`Agency "${form.name}" created successfully`);
      setForm(EMPTY_FORM);
      setShowCreateCard(false);
      loadAgencies();
      loadMoneyFlow();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create agency');
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = moneyFlow?.summary || {
    totalDeposits: '0.00',
    totalWithdrawals: '0.00',
    netCashflow: '0.00',
    pendingDeposits: '0.00',
    pendingWithdrawals: '0.00',
    pendingDepositsCount: 0,
    pendingWithdrawalsCount: 0,
    turnover: '0.00',
    playerWins: '0.00',
    ggr: '0.00',
    bonusExpenses: '0.00',
    activeAgenciesCount: 0,
    totalAgenciesCount: 0,
    totalPlayersCount: 0,
  };

  const bonuses = moneyFlow?.bonusesBreakdown || {
    referral: '0.00',
    spin: '0.00',
    vip: '0.00',
    promo: '0.00',
    adminCredit: '0.00',
  };

  const agencyBreakdownList = moneyFlow?.agencies || [];
  const selectedAgencyObj = agencies.find((a) => a.id === selectedAgencyId);

  return (
    <div className="dashboard-page" style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      {/* Top Bar Header */}
      <div className="dashboard-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="auth-logo" style={{ fontSize: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            🛡️ SUPER ADMIN DASHBOARD
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
            Platform-wide Financial Control, Money Flow & Agency Management
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowCreateCard(!showCreateCard)}
          >
            {showCreateCard ? '✕ Close Form' : '➕ Create Agency'}
          </button>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            👤 {user.name}
          </span>
          <button className="btn-secondary" onClick={logout} style={{ padding: '8px 16px', fontSize: 13 }}>
            Log out
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="error-message" style={{ marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="success-message" style={{ marginBottom: 20 }}>
          ✅ {success}
        </div>
      )}

      {/* Create Agency Collapsible Card */}
      {showCreateCard && (
        <div className="dashboard-card" style={{ marginBottom: 24, border: '1px solid var(--accent-gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, margin: 0, color: 'var(--accent-gold)' }}>🏢 Create New Agency</h2>
            <button
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: 12 }}
              onClick={() => setShowCreateCard(false)}
            >
              ✕ Close
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="label" htmlFor="name">
                  Agency Name
                </label>
                <input
                  id="name"
                  placeholder="e.g. Dhaka Premier Gaming"
                  value={form.name}
                  onChange={update('name')}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="agencyCode">
                  Agency Code (Unique)
                </label>
                <input
                  id="agencyCode"
                  placeholder="e.g. DHAKA01"
                  value={form.agencyCode}
                  onChange={update('agencyCode')}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="bkashNumber">
                bKash Number <span className="label-optional">(Optional)</span>
              </label>
              <input
                id="bkashNumber"
                placeholder="+88017XXXXXXXX"
                value={form.bkashNumber}
                onChange={update('bkashNumber')}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label" htmlFor="adminName">
                  Agency Admin Full Name
                </label>
                <input
                  id="adminName"
                  placeholder="e.g. Md Admin"
                  value={form.adminName}
                  onChange={update('adminName')}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="adminPhone">
                  Agency Admin Login Phone
                </label>
                <input
                  id="adminPhone"
                  placeholder="+88017XXXXXXXX"
                  value={form.adminPhone}
                  onChange={update('adminPhone')}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="adminPassword">
                Agency Admin Initial Password
              </label>
              <input
                id="adminPassword"
                type="password"
                minLength={6}
                placeholder="Minimum 6 characters"
                value={form.adminPassword}
                onChange={update('adminPassword')}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Agency…' : 'Save & Launch Agency'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCreateCard(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Money Flow Control & Filter Bar */}
      <div className="dashboard-card" style={{ marginBottom: 24, background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--accent-gold)' }}>
              📊 Financial Money Flow & Analytics
            </h3>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              Filtering for:{' '}
              <strong style={{ color: '#fff' }}>
                {selectedAgencyId === 'all'
                  ? '🌐 Entire Platform (All Agencies)'
                  : `🏢 ${selectedAgencyObj ? selectedAgencyObj.name : 'Selected Agency'}`}
              </strong>
            </span>
          </div>

          {/* Quick Date Presets */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'this_month', label: 'This Month' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={datePreset === p.id ? 'btn-primary' : 'btn-secondary'}
                style={{
                  padding: '5px 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  borderColor: datePreset === p.id ? 'var(--accent-gold)' : undefined,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Inputs Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
          <div>
            <label className="label" style={{ fontSize: 11, marginBottom: 4 }}>
              Filter by Agency
            </label>
            <select
              value={selectedAgencyId}
              onChange={(e) => setSelectedAgencyId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid var(--border-subtle)',
                borderRadius: 12,
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                outline: 'none',
              }}
            >
              <option value="all" style={{ background: '#1a1f2c', color: '#fff' }}>
                🌐 All Agencies (Platform Wide)
              </option>
              {agencies.map((agency) => (
                <option
                  key={agency.id}
                  value={agency.id}
                  style={{ background: '#1a1f2c', color: agency.isActive ? '#fff' : '#ff7777' }}
                >
                  {agency.isActive ? '🟢' : '🔴'} {agency.name} ({agency.agencyCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" style={{ fontSize: 11, marginBottom: 4 }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset('custom');
                setStartDate(e.target.value);
              }}
              style={{ padding: '10px 14px' }}
            />
          </div>

          <div>
            <label className="label" style={{ fontSize: 11, marginBottom: 4 }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDatePreset('custom');
                setEndDate(e.target.value);
              }}
              style={{ padding: '10px 14px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-primary"
              onClick={loadMoneyFlow}
              disabled={isLoadingMoneyFlow}
              style={{ flex: 1, padding: '12px 16px', fontSize: 13 }}
            >
              {isLoadingMoneyFlow ? 'Loading…' : '🔄 Refresh Data'}
            </button>
            {(selectedAgencyId !== 'all' || startDate || endDate) && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelectedAgencyId('all');
                  handlePresetChange('all');
                }}
                style={{ padding: '12px 14px', fontSize: 12 }}
                title="Reset all filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Financial Overview KPI Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 24 }}>
        {/* Approved Deposits */}
        <div className="stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
          <div className="stat-card-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>💰 Approved Deposits</span>
            <span style={{ color: '#22c55e' }}>+ Cash In</span>
          </div>
          <div className="stat-card-value" style={{ color: '#22c55e', fontSize: 24 }}>
            ৳{Number(summary.totalDeposits).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            Credited player balances
          </div>
        </div>

        {/* Approved Withdrawals */}
        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="stat-card-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>💸 Approved Withdrawals</span>
            <span style={{ color: '#ef4444' }}>- Cash Out</span>
          </div>
          <div className="stat-card-value" style={{ color: '#ef4444', fontSize: 24 }}>
            ৳{Number(summary.totalWithdrawals).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            Total cash disbursed
          </div>
        </div>

        {/* Net Flow */}
        <div
          className="stat-card"
          style={{
            borderLeft: `4px solid ${Number(summary.netCashflow) >= 0 ? 'var(--accent-gold)' : '#ef4444'}`,
          }}
        >
          <div className="stat-card-label">
            <span>⚖️ Net Cash Flow</span>
          </div>
          <div
            className="stat-card-value"
            style={{
              color: Number(summary.netCashflow) >= 0 ? 'var(--accent-gold)' : '#ef4444',
              fontSize: 24,
            }}
          >
            {Number(summary.netCashflow) >= 0 ? '+' : ''}৳
            {Number(summary.netCashflow).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            Deposits minus Withdrawals
          </div>
        </div>

        {/* Gaming Turnover */}
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-card-label">
            <span>🎰 Gaming Turnover</span>
          </div>
          <div className="stat-card-value" style={{ color: '#60a5fa', fontSize: 24 }}>
            ৳{Number(summary.turnover).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            Player Wins: ৳{Number(summary.playerWins).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* GGR Profit */}
        <div className="stat-card" style={{ borderLeft: '4px solid #a855f7' }}>
          <div className="stat-card-label">
            <span>💎 Gross Gaming Revenue (GGR)</span>
          </div>
          <div className="stat-card-value" style={{ color: '#c084fc', fontSize: 24 }}>
            ৳{Number(summary.ggr).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            House Profit (Turnover - Wins)
          </div>
        </div>

        {/* Bonus Expenses */}
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-card-label">
            <span>🎁 Bonus Expenses</span>
          </div>
          <div className="stat-card-value" style={{ color: '#fbbf24', fontSize: 24 }}>
            ৳{Number(summary.bonusExpenses).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, fontSize: 10 }}>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 4 }}>
              Ref: ৳{bonuses.referral}
            </span>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 4 }}>
              Spin: ৳{bonuses.spin}
            </span>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 4 }}>
              VIP: ৳{bonuses.vip}
            </span>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 4 }}>
              Promo: ৳{bonuses.promo}
            </span>
          </div>
        </div>

        {/* Pending Queue */}
        <div className="stat-card" style={{ borderLeft: '4px solid #ec4899' }}>
          <div className="stat-card-label">
            <span>⏳ Pending Queue</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f472b6' }}>
                {summary.pendingDepositsCount} Deposits
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                ৳{Number(summary.pendingDeposits).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fb7185' }}>
                {summary.pendingWithdrawalsCount} Withdraws
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                ৳{Number(summary.pendingWithdrawals).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
            Awaiting Agency approval
          </div>
        </div>

        {/* Total Active Agencies & Players */}
        <div className="stat-card" style={{ borderLeft: '4px solid #06b6d4' }}>
          <div className="stat-card-label">
            <span>🏢 Network Status</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#22d3ee' }}>
                {summary.activeAgenciesCount} / {summary.totalAgenciesCount}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Active Agencies</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#38bdf8' }}>
                👥 {summary.totalPlayersCount}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Registered Players</div>
            </div>
          </div>
        </div>
      </div>

      {/* Agencies Comparative Table with Status Toggle */}
      <div className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, margin: 0 }}>
              🏢 Agencies & Financial Breakdown ({agencies.length})
            </h2>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              Toggle agency status to instantly block or enable login access for admins and players.
            </span>
          </div>

          {selectedAgencyId !== 'all' && (
            <button
              className="btn-secondary"
              onClick={() => setSelectedAgencyId('all')}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              Show All Agencies
            </button>
          )}
        </div>

        {isLoadingAgencies ? (
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading agencies…</p>
        ) : agencies.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>No agencies found. Click "Create Agency" above to create one.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agency</th>
                  <th>Status & Control</th>
                  <th>Players</th>
                  <th>Deposits</th>
                  <th>Withdrawals</th>
                  <th>Net Flow</th>
                  <th>Turnover</th>
                  <th>GGR Profit</th>
                  <th>Bonuses</th>
                  <th>Management</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((agency) => {
                  const stat = agencyBreakdownList.find((item) => item.id === agency.id) || {
                    playerCount: 0,
                    approvedDeposits: '0.00',
                    approvedWithdrawals: '0.00',
                    netCashflow: '0.00',
                    turnover: '0.00',
                    ggr: '0.00',
                    totalBonuses: '0.00',
                  };
                  const isSelected = selectedAgencyId === agency.id;
                  const isToggling = togglingAgencyId === agency.id;

                  return (
                    <tr
                      key={agency.id}
                      style={{
                        background: isSelected ? 'rgba(212, 175, 55, 0.08)' : undefined,
                        opacity: agency.isActive ? 1 : 0.75,
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: agency.isActive ? '#fff' : '#fca5a5' }}>
                          {agency.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                          Code: <strong style={{ color: 'var(--accent-gold)' }}>{agency.agencyCode}</strong>
                          {agency.bkashNumber && ` • bKash: ${agency.bkashNumber}`}
                        </div>
                      </td>

                      {/* Status Toggle Switch / Button */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className={`status-pill ${agency.isActive ? 'active' : 'inactive'}`}
                            style={{
                              background: agency.isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: agency.isActive ? '#4ade80' : '#f87171',
                              fontWeight: 700,
                            }}
                          >
                            {agency.isActive ? '🟢 Active' : '🔴 Inactive'}
                          </span>

                          <button
                            onClick={() => handleToggleStatus(agency)}
                            disabled={isToggling}
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              borderRadius: 6,
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: '1px solid',
                              backgroundColor: agency.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                              borderColor: agency.isActive ? '#ef4444' : '#22c55e',
                              color: agency.isActive ? '#fca5a5' : '#86efac',
                            }}
                            title={
                              agency.isActive
                                ? 'Click to Deactivate Agency (Blocks logins)'
                                : 'Click to Activate Agency (Enables logins)'
                            }
                          >
                            {isToggling
                              ? 'Saving…'
                              : agency.isActive
                              ? 'Deactivate'
                              : 'Activate'}
                          </button>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600, color: '#38bdf8' }}>
                          👥 {stat.playerCount}
                        </span>
                      </td>

                      <td>
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>
                          ৳{stat.approvedDeposits}
                        </span>
                      </td>

                      <td>
                        <span style={{ color: '#f87171', fontWeight: 600 }}>
                          ৳{stat.approvedWithdrawals}
                        </span>
                      </td>

                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: Number(stat.netCashflow) >= 0 ? 'var(--accent-gold)' : '#ef4444',
                          }}
                        >
                          {Number(stat.netCashflow) >= 0 ? '+' : ''}৳{stat.netCashflow}
                        </span>
                      </td>

                      <td>
                        <span style={{ color: '#60a5fa' }}>৳{stat.turnover}</span>
                      </td>

                      <td>
                        <span style={{ color: '#c084fc', fontWeight: 600 }}>
                          ৳{stat.ggr}
                        </span>
                      </td>

                      <td>
                        <span style={{ color: '#fbbf24', fontSize: 12 }}>
                          ৳{stat.totalBonuses}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setSelectedAgencyId(agency.id)}
                            className="btn-secondary"
                            style={{
                              padding: '5px 8px',
                              fontSize: 11,
                              backgroundColor: isSelected ? 'var(--accent-gold)' : undefined,
                              color: isSelected ? '#000' : undefined,
                            }}
                            title="Filter money flow cards above specifically for this agency"
                          >
                            {isSelected ? '✓ Filtered' : '🔍 Filter Stats'}
                          </button>

                          <Link
                            to={`/agency/users?agencyId=${agency.id}`}
                            className="btn-secondary"
                            style={{
                              padding: '5px 8px',
                              fontSize: 11,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            👥 Players
                          </Link>

                          <Link
                            to={`/agency/settings?agencyId=${agency.id}`}
                            className="btn-secondary"
                            style={{
                              padding: '5px 8px',
                              fontSize: 11,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            ⚙️ Wallet
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

