import { useEffect, useState } from 'react';
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

export function AdminDashboard() {
  const { user, accessToken, logout } = useAuth();
  const [agencies, setAgencies] = useState([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      loadAgencies();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create agency');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="auth-logo" style={{ fontSize: 22 }}>
          🛡️ SUPER ADMIN
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>{user.name}</span>
          <button className="btn-secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      <div className="dashboard-card">
        <h2 style={{ marginBottom: 16 }}>Create Agency</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="name">
                Agency Name
              </label>
              <input id="name" value={form.name} onChange={update('name')} required />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="agencyCode">
                Agency Code
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
            <input id="bkashNumber" value={form.bkashNumber} onChange={update('bkashNumber')} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="adminName">
                Agency Admin Name
              </label>
              <input id="adminName" value={form.adminName} onChange={update('adminName')} required />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="adminPhone">
                Agency Admin Phone
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
              Agency Admin Password
            </label>
            <input
              id="adminPassword"
              type="password"
              minLength={6}
              value={form.adminPassword}
              onChange={update('adminPassword')}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Agency'}
          </button>
        </form>
      </div>

      <div className="dashboard-card">
        <h2 style={{ marginBottom: 16 }}>Agencies</h2>
        {isLoadingAgencies ? (
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading…</p>
        ) : agencies.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>No agencies yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>bKash</th>
                  <th>Charge / 1000</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((agency) => (
                  <tr key={agency.id}>
                    <td>{agency.name}</td>
                    <td>{agency.agencyCode}</td>
                    <td>{agency.bkashNumber ?? '—'}</td>
                    <td>৳{agency.withdrawalChargeRate}</td>
                    <td>
                      <span className={`status-pill ${agency.isActive ? 'active' : 'inactive'}`}>
                        {agency.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
