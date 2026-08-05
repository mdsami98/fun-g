import { useAuth } from '../../context/AuthContext';

export function AgencyProfile() {
  const { user } = useAuth();
  const agency = user.agency;

  return (
    <div>
      <h1 className="page-title">Profile</h1>

      <div className="dashboard-card">
        <h2>{user.name}</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>{user.phone}</p>
      </div>

      {agency && (
        <div className="dashboard-card">
          <h2 style={{ marginBottom: 16 }}>Your Agency</h2>
          <table className="data-table">
            <tbody>
              <tr>
                <th>Name</th>
                <td>{agency.name}</td>
              </tr>
              <tr>
                <th>Code</th>
                <td>{agency.agencyCode}</td>
              </tr>
              <tr>
                <th>bKash Number</th>
                <td>{agency.bkashNumber ?? '—'}</td>
              </tr>
              <tr>
                <th>Withdrawal Charge</th>
                <td>৳{agency.withdrawalChargeRate} per 1000</td>
              </tr>
              <tr>
                <th>Status</th>
                <td>
                  <span className={`status-pill ${agency.isActive ? 'active' : 'inactive'}`}>
                    {agency.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
