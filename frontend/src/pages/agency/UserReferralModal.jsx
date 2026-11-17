import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';

export function UserReferralModal({ agencyId, userId, token, onClose, onUpdated }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [mode, setMode] = useState('lifetime');
  const [maxReferrals, setMaxReferrals] = useState(5);
  const [resetWindowHours, setResetWindowHours] = useState(24);
  const [bonusAmount, setBonusAmount] = useState(10);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!agencyId || !userId) return;
    setIsLoading(true);
    setError('');

    api
      .getAgencyUserReferralConfig(token, agencyId, userId)
      .then((res) => {
        setData(res);
        setMode(res.config.mode || 'lifetime');
        setMaxReferrals(res.config.maxReferrals ?? 5);
        setResetWindowHours(res.config.resetWindowHours || 24);
        setBonusAmount(Number(res.config.bonusAmount) || 10);
        setIsActive(res.config.isActive ?? true);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load referral config');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [agencyId, userId, token]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.updateAgencyUserReferralConfig(token, agencyId, userId, {
        mode,
        maxReferrals: parseInt(maxReferrals, 10),
        resetWindowHours: mode === 'window' ? parseInt(resetWindowHours, 10) : 0,
        bonusAmount: parseFloat(bonusAmount),
        isActive,
      });

      setSuccess('Referral settings updated successfully!');
      setTimeout(() => {
        if (onUpdated) onUpdated();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update referral settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 16,
          width: '100%',
          maxWidth: 580,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Referral Policy: {data?.user?.name ?? 'Player'}
            </h2>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              Phone: {data?.user?.phone} • Code: <strong style={{ color: '#38bdf8' }}>{data?.config?.referralCode}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
              Loading player referral settings...
            </div>
          ) : (
            <form onSubmit={handleSave}>
              {error && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#f87171',
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid #22c55e',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#4ade80',
                    fontSize: 13,
                    marginBottom: 16,
                    fontWeight: 600,
                  }}
                >
                  {success}
                </div>
              )}

              {/* Status summary banner */}
              <div
                style={{
                  backgroundColor: '#090d16',
                  borderRadius: 10,
                  padding: 14,
                  border: '1px solid #1e293b',
                  marginBottom: 18,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>
                    CURRENT USAGE
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
                    {data?.config?.currentWindowCount ?? 0} in active window • {data?.config?.totalLifetimeCount ?? 0} total
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: isActive ? '#4ade80' : '#f87171',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {isActive ? 'Active' : 'Disabled'}
                </div>
              </div>

              {/* Mode Selection */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 }}>
                  Referral Limit Mechanism
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setMode('lifetime')}
                    style={{
                      backgroundColor: mode === 'lifetime' ? 'rgba(37, 99, 235, 0.2)' : '#090d16',
                      borderColor: mode === 'lifetime' ? '#2563eb' : '#1e293b',
                      borderWidth: 1.5,
                      borderStyle: 'solid',
                      borderRadius: 8,
                      padding: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: mode === 'lifetime' ? '#60a5fa' : '#f8fafc', fontSize: 13 }}>
                      Lifetime Limit
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                      Default quota. Total lifetime limit.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('window')}
                    style={{
                      backgroundColor: mode === 'window' ? 'rgba(37, 99, 235, 0.2)' : '#090d16',
                      borderColor: mode === 'window' ? '#2563eb' : '#1e293b',
                      borderWidth: 1.5,
                      borderStyle: 'solid',
                      borderRadius: 8,
                      padding: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: mode === 'window' ? '#60a5fa' : '#f8fafc', fontSize: 13 }}>
                      Recurring Window
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                      Resets every 12h, 24h, etc.
                    </div>
                  </button>
                </div>
              </div>

              {/* Recurring Window Interval (if mode == 'window') */}
              {mode === 'window' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                    Reset Interval
                  </label>
                  <select
                    value={resetWindowHours}
                    onChange={(e) => setResetWindowHours(Number(e.target.value))}
                    style={{
                      width: '100%',
                      backgroundColor: '#090d16',
                      border: '1px solid #1e293b',
                      borderRadius: 8,
                      color: '#f8fafc',
                      padding: '10px 12px',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  >
                    <option value={6}>Every 6 Hours</option>
                    <option value={12}>Every 12 Hours</option>
                    <option value={24}>Every 24 Hours (Daily)</option>
                    <option value={48}>Every 48 Hours</option>
                    <option value={72}>Every 72 Hours (3 Days)</option>
                    <option value={168}>Every 7 Days (Weekly)</option>
                  </select>
                </div>
              )}

              {/* Max Referrals Input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                  Max Referrals Allowed {mode === 'window' ? 'Per Time Window' : 'In Lifetime'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={maxReferrals}
                  onChange={(e) => setMaxReferrals(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    color: '#f8fafc',
                    padding: '10px 12px',
                    fontSize: 14,
                    outline: 'none',
                  }}
                  required
                />
              </div>

              {/* Bonus Amount per Referral */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                  Bonus Amount Per Successful Signup (৳)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    color: '#f8fafc',
                    padding: '10px 12px',
                    fontSize: 14,
                    outline: 'none',
                  }}
                  required
                />
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Default is ৳10.00. You can customize this to ৳50.00 or any amount.
                </div>
              </div>

              {/* Active Toggle */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#2563eb' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                    Referral Feature Active for this Player
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#94a3b8',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}

          {/* Player's Referral History */}
          {data?.history && data.history.length > 0 && (
            <div style={{ marginTop: 24, borderTop: '1px solid #1e293b', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#cbd5e1', marginBottom: 10 }}>
                Referral History ({data.history.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.history.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#090d16',
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <span style={{ color: '#f8fafc', fontWeight: 600 }}>{item.referredUserName}</span>
                      <span style={{ color: '#64748b', marginLeft: 8 }}>{item.referredUserPhone}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#4ade80', fontWeight: 700 }}>+৳{item.bonusAmount}</span>
                      <span style={{ color: '#64748b' }}>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
