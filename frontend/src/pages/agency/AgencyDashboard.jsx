const DUMMY_STATS = [
  { label: 'Total Members', value: '—' },
  { label: 'Pending Deposits', value: '—' },
  { label: 'Pending Withdrawals', value: '—' },
  { label: "Today's Transactions", value: '—' },
];

export function AgencyDashboard() {
  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      <div className="stat-grid">
        {DUMMY_STATS.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-card-label">{stat.label}</div>
            <div className="stat-card-value">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-card">
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>
          This is a placeholder. Member management and deposit/withdrawal
          approvals will replace these stats in a later pass.
        </p>
      </div>
    </div>
  );
}
