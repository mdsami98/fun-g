import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../api/client';

const PROVIDERS = [
  { value: 'bkash', label: 'bKash', badgeClass: 'badge-bkash' },
  { value: 'nagad', label: 'Nagad', badgeClass: 'badge-nagad' },
  { value: 'rocket', label: 'Rocket', badgeClass: 'badge-rocket' },
];

const ACCOUNT_TYPES = [
  { value: 'personal', label: 'Personal' },
  { value: 'agent', label: 'Agent' },
  { value: 'merchant', label: 'Merchant' },
];

export function AgencySettings() {
  const { user, accessToken } = useAuth();
  const [searchParams] = useSearchParams();
  const queryAgencyId = searchParams.get('agencyId');
  const agencyId = queryAgencyId || user?.agencyId || user?.agency?.id;
  const agency = user?.agency;

  const [rows, setRows] = useState([]);
  const [originalRows, setOriginalRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadWalletNumbers = async () => {
    if (!agencyId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getAgencyWalletNumbers(accessToken, agencyId);
      const formatted = (data || []).map((item) => ({
        id: String(item.id),
        tempId: String(item.id),
        provider: item.provider,
        number: item.number,
        accountType: item.accountType || item.account_type || 'personal',
        isActive: item.isActive !== undefined ? item.isActive : (item.is_active !== undefined ? item.is_active : true),
      }));
      setRows(formatted);
      setOriginalRows(JSON.parse(JSON.stringify(formatted)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load wallet numbers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWalletNumbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const handleAddRow = () => {
    const newRow = {
      id: null,
      tempId: `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'bkash',
      number: '',
      accountType: 'personal',
      isActive: true,
      isNew: true,
    };
    setRows((prev) => [...prev, newRow]);
    setError('');
  };

  const handleFieldChange = (tempId, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.tempId === tempId) {
          return { ...row, [field]: value };
        }
        return row;
      }),
    );
  };

  const handleDeleteRow = (tempId) => {
    setRows((prev) => prev.filter((row) => row.tempId !== tempId));
  };

  const hasUnsavedChanges = JSON.stringify(rows) !== JSON.stringify(originalRows);

  const handleReset = () => {
    setRows(JSON.parse(JSON.stringify(originalRows)));
    setError('');
    setSuccess('');
  };

  const validateRows = () => {
    if (rows.length === 0) {
      return null;
    }
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const trimmed = (r.number || '').trim();
      if (!trimmed) {
        return `Row #${i + 1}: Account number is required.`;
      }
      if (trimmed.length < 5 || trimmed.length > 20) {
        return `Row #${i + 1}: Account number must be between 5 and 20 characters.`;
      }
    }
    return null;
  };

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateRows();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const payload = rows.map((r) => ({
        id: r.id || undefined,
        provider: r.provider,
        number: r.number.trim(),
        accountType: r.accountType,
        isActive: r.isActive,
      }));

      const updated = await api.syncAgencyWalletNumbers(accessToken, agencyId, payload);
      const formatted = (updated || []).map((item) => ({
        id: String(item.id),
        tempId: String(item.id),
        provider: item.provider,
        number: item.number,
        accountType: item.accountType || item.account_type || 'personal',
        isActive: item.isActive !== undefined ? item.isActive : (item.is_active !== undefined ? item.is_active : true),
      }));
      setRows(formatted);
      setOriginalRows(JSON.parse(JSON.stringify(formatted)));
      setSuccess('Wallet numbers saved successfully!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save wallet numbers');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="settings-header-actions">
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Agency Settings</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
            Configure your agency details and payment recipient wallet numbers.
          </p>
        </div>
        {agency && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'block' }}>
              AGENCY CODE
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-gold)' }}>
              {agency.agencyCode}
            </span>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="dashboard-card">
        <div className="settings-header-actions" style={{ marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Agency Wallet Numbers</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 13, marginTop: 4 }}>
              Dynamic mobile financial services (MFS) list used for player deposits and withdrawals.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAddRow}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>➕</span> Add Wallet Number
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveAll}
              disabled={isSaving || !hasUnsavedChanges}
              style={{ width: 'auto', padding: '10px 20px', fontSize: 14 }}
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <p style={{ color: 'rgba(255,255,255,0.6)', padding: '24px 0', textAlign: 'center' }}>
            Loading wallet numbers…
          </p>
        ) : rows.length === 0 ? (
          <div className="empty-state-box">
            <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
            <h3 style={{ color: 'var(--text-light)', marginBottom: 6 }}>No Wallet Numbers Configured</h3>
            <p style={{ fontSize: 13, marginBottom: 18 }}>
              Add bKash, Nagad, or Rocket numbers to receive and process user transactions.
            </p>
            <button type="button" className="btn-secondary" onClick={handleAddRow}>
              ➕ Add First Number
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dynamic-rows-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Provider</th>
                  <th style={{ width: '32%' }}>Wallet Number</th>
                  <th style={{ width: '22%' }}>Account Type</th>
                  <th style={{ width: '14%' }}>Active</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.tempId} className="dynamic-row-item">
                    {/* Provider Dropdown */}
                    <td>
                      <select
                        aria-label={`Provider for row ${index + 1}`}
                        value={row.provider}
                        className="table-select"
                        onChange={(e) => handleFieldChange(row.tempId, 'provider', e.target.value)}
                      >
                        {PROVIDERS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Number Text Field */}
                    <td>
                      <input
                        aria-label={`Number for row ${index + 1}`}
                        type="text"
                        className="table-input"
                        placeholder="e.g. 01712345678"
                        value={row.number}
                        onChange={(e) => handleFieldChange(row.tempId, 'number', e.target.value)}
                        required
                      />
                    </td>

                    {/* Account Type Dropdown */}
                    <td>
                      <select
                        aria-label={`Account Type for row ${index + 1}`}
                        value={row.accountType}
                        className="table-select"
                        onChange={(e) => handleFieldChange(row.tempId, 'accountType', e.target.value)}
                      >
                        {ACCOUNT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* is_active Toggle */}
                    <td>
                      <label className="switch-label">
                        <span className="switch-toggle">
                          <input
                            aria-label={`Is active for row ${index + 1}`}
                            type="checkbox"
                            checked={row.isActive}
                            onChange={(e) =>
                              handleFieldChange(row.tempId, 'isActive', e.target.checked)
                            }
                          />
                          <span className="switch-slider"></span>
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: row.isActive ? 'var(--success, #4caf50)' : 'rgba(255,255,255,0.4)',
                          }}
                        >
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </label>
                    </td>

                    {/* Delete Action */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-danger"
                        title="Delete Row"
                        aria-label={`Delete row ${index + 1}`}
                        onClick={() => handleDeleteRow(row.tempId)}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              Total: <strong>{rows.length}</strong> row{rows.length !== 1 ? 's' : ''} (
              {rows.filter((r) => r.isActive).length} active)
              {hasUnsavedChanges && (
                <span style={{ color: 'var(--accent-gold)', marginLeft: 8 }}>
                  • Unsaved changes
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {hasUnsavedChanges && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleReset}
                  disabled={isSaving}
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  Discard Changes
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveAll}
                disabled={isSaving || !hasUnsavedChanges}
                style={{ width: 'auto', padding: '8px 20px', fontSize: 13 }}
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
