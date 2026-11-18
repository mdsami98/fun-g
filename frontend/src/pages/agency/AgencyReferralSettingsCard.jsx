import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';

export function AgencyReferralSettingsCard({ agencyId, token }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [mode, setMode] = useState('lifetime');
  const [maxReferrals, setMaxReferrals] = useState(5);
  const [resetWindowHours, setResetWindowHours] = useState(24);
  const [bonusAmount, setBonusAmount] = useState(10);
  const [isEnabled, setIsEnabled] = useState(true);
  const [syncToExistingUsers, setSyncToExistingUsers] = useState(false);

  useEffect(() => {
    if (!agencyId) return;
    setIsLoading(true);
    setError('');

    api
      .getAgencyDefaultReferralConfig(token, agencyId)
      .then((res) => {
        setMode(res.defaultReferralMode || 'lifetime');
        setMaxReferrals(res.defaultMaxReferrals ?? 5);
        setResetWindowHours(res.defaultResetWindowHours ?? 24);
        setBonusAmount(Number(res.defaultReferralBonus) || 10);
        setIsEnabled(res.isReferralEnabled ?? true);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load agency referral settings');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [agencyId, token]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        defaultReferralMode: mode,
        defaultMaxReferrals: Number(maxReferrals),
        defaultResetWindowHours: mode === 'window' ? Number(resetWindowHours) : 24,
        defaultReferralBonus: Number(bonusAmount),
        isReferralEnabled: isEnabled,
        syncToExistingUsers,
      };

      await api.updateAgencyDefaultReferralConfig(token, agencyId, payload);
      setSuccess(
        syncToExistingUsers
          ? '✓ Global referral policy updated and synced to all existing agency players!'
          : '✓ Global referral policy updated successfully for all new player registrations!'
      );
      setSyncToExistingUsers(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save referral policy');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dashboard-card" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🎁</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Agency-Wide Default Referral Policy</h2>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 13, marginTop: 4 }}>
            Set standard referral limits, bonus rewards, and reset rules automatically applied to all new players in this agency.
          </p>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 6,
            backgroundColor: isEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: isEnabled ? '#4ade80' : '#f87171',
            border: `1px solid ${isEnabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          }}
        >
          {isEnabled ? '● Referral Program Active' : '● Referral Program Disabled'}
        </span>
      </div>

      {error && <div className="error-message" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="success-message" style={{ marginBottom: 16 }}>{success}</div>}

      {isLoading ? (
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', padding: '24px 0', textAlign: 'center' }}>
          Loading referral policy…
        </p>
      ) : (
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {/* Feature Active Toggle */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent-gold)' }}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-light)' }}>
                  Enable Referral Program for this Agency
                </span>
              </label>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 4, marginLeft: 28 }}>
                When disabled, players cannot earn referral rewards and referral registration links are blocked.
              </div>
            </div>

            {/* Quota Mode Selection */}
            <div className="form-group">
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-light)', marginBottom: 6, display: 'block' }}>
                Default Quota Mode
              </label>
              <select
                className="form-control"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={{
                  backgroundColor: '#090d16',
                  color: '#fff',
                  border: '1px solid #334155',
                  padding: '10px 12px',
                  borderRadius: 8,
                  width: '100%',
                }}
              >
                <option value="lifetime">Lifetime Limit (Fixed total referrals per user)</option>
                <option value="window">Rolling Time Window (Resets every X hours)</option>
              </select>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                {mode === 'lifetime'
                  ? 'Players can only invite up to the limit throughout their account lifetime.'
                  : 'Quota resets automatically after the specified hours, allowing continuous referrals.'}
              </div>
            </div>

            {/* Max Referrals Limit */}
            <div className="form-group">
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-light)', marginBottom: 6, display: 'block' }}>
                Default Max Referrals
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={maxReferrals}
                onChange={(e) => setMaxReferrals(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="form-control"
                style={{
                  backgroundColor: '#090d16',
                  color: '#fff',
                  border: '1px solid #334155',
                  padding: '10px 12px',
                  borderRadius: 8,
                  width: '100%',
                }}
              />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                Maximum friends each player can invite per cycle (e.g. 5).
              </div>
            </div>

            {/* Reset Window Hours (only if window mode) */}
            {mode === 'window' && (
              <div className="form-group">
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-light)', marginBottom: 6, display: 'block' }}>
                  Reset Window (Hours)
                </label>
                <select
                  className="form-control"
                  value={resetWindowHours}
                  onChange={(e) => setResetWindowHours(Number(e.target.value))}
                  style={{
                    backgroundColor: '#090d16',
                    color: '#fff',
                    border: '1px solid #334155',
                    padding: '10px 12px',
                    borderRadius: 8,
                    width: '100%',
                  }}
                >
                  <option value={12}>Every 12 Hours</option>
                  <option value={24}>Every 24 Hours (1 Day)</option>
                  <option value={48}>Every 48 Hours (2 Days)</option>
                  <option value={72}>Every 72 Hours (3 Days)</option>
                  <option value={168}>Every 168 Hours (1 Week)</option>
                </select>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                  Interval after which the user referral counter automatically rolls back to 0.
                </div>
              </div>
            )}

            {/* Bonus Amount per Referral */}
            <div className="form-group">
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-light)', marginBottom: 6, display: 'block' }}>
                Default Bonus Amount (৳ BDT)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: 10, color: '#f59e0b', fontWeight: 800 }}>৳</span>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="1"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="form-control"
                  style={{
                    backgroundColor: '#090d16',
                    color: '#fff',
                    border: '1px solid #334155',
                    padding: '10px 12px 10px 30px',
                    borderRadius: 8,
                    width: '100%',
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                Instant cash credit deposited to referrer&apos;s wallet on successful signup.
              </div>
            </div>

            {/* Sync to Existing Users Checkbox */}
            <div
              className="form-group"
              style={{
                gridColumn: '1 / -1',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 8,
                padding: '12px 16px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={syncToExistingUsers}
                  onChange={(e) => setSyncToExistingUsers(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#3b82f6' }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>
                  🔄 Apply these updated rules to ALL existing players in this agency
                </span>
              </label>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginTop: 4, marginLeft: 28 }}>
                If unchecked, this policy only applies to future player registrations. Existing players will keep their current individual rules.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
              style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
            >
              {isSaving ? 'Saving Policy…' : '💾 Save Agency Referral Policy'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
