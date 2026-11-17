import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

export function AgencyPromoCodes() {
  const { accessToken } = useAuth();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Form State
  const [codeName, setCodeName] = useState('');
  const [rewardType, setRewardType] = useState('cash');
  const [rewardAmount, setRewardAmount] = useState('50');
  const [maxClaims, setMaxClaims] = useState('100');
  const [expiresAt, setExpiresAt] = useState('');

  const fetchCodes = async () => {
    if (!accessToken) return;
    try {
      const data = await api.getAgencyPromoCodes(accessToken);
      setCodes(data || []);
    } catch (err) {
      console.error('Failed to load promo codes', err);
      setErrorMsg('প্রোমো কোড তালিকা লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [accessToken]);

  const handleCopy = (c) => {
    navigator.clipboard.writeText(c);
    setCopiedCode(c);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = async (item) => {
    try {
      await api.toggleAgencyPromoCode(accessToken, item.id, !item.isActive);
      setCodes((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, isActive: !c.isActive } : c)),
      );
    } catch (err) {
      alert(err.message || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${item.code}" কোডটি মুছে ফেলতে চান?`)) {
      return;
    }
    try {
      await api.deleteAgencyPromoCode(accessToken, item.id);
      setCodes((prev) => prev.filter((c) => c.id !== item.id));
      setSuccessMsg(`"${item.code}" কোডটি সফলভাবে মুছে ফেলা হয়েছে।`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.message || 'কোড মোছা সম্ভব হয়নি।');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanCode = codeName.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('অনুগ্রহ করে প্রোমো কোড লিখুন।');
      return;
    }

    setSubmitting(true);
    try {
      await api.createAgencyPromoCode(accessToken, {
        code: cleanCode,
        rewardType,
        rewardAmount: rewardType === 'cash' ? parseFloat(rewardAmount) : 0,
        maxClaims: maxClaims ? parseInt(maxClaims, 10) : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });

      setSuccessMsg(`🎉 "${cleanCode}" প্রোমো কোড সফলভাবে তৈরি করা হয়েছে!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setModalOpen(false);

      // Reset form
      setCodeName('');
      setRewardType('cash');
      setRewardAmount('50');
      setMaxClaims('100');
      setExpiresAt('');

      await fetchCodes();
    } catch (err) {
      setErrorMsg(err.message || 'প্রোমো কোড তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  const totalClaimsCount = codes.reduce((sum, c) => sum + (c.totalClaimed || 0), 0);
  const activeCodesCount = codes.filter((c) => c.isActive).length;

  return (
    <div className="agency-promo-page">
      <div className="promo-page-top">
        <div>
          <h2>🎟️ প্রোমো কোড ও বোনাস ভাউচার (Promo Codes)</h2>
          <p className="promo-page-sub">
            মার্কেটিং ক্যাম্পেইন বা প্লেয়ার রিটেনশনের জন্য বিশেষ কুপন কোড তৈরি ও নিয়ন্ত্রণ করুন।
          </p>
        </div>

        <button
          type="button"
          className="btn-create-promo"
          onClick={() => {
            setErrorMsg('');
            setModalOpen(true);
          }}
        >
          + নতুন প্রোমো কোড তৈরি করুন
        </button>
      </div>

      {successMsg && <div className="promo-alert success">{successMsg}</div>}
      {errorMsg && !modalOpen && <div className="promo-alert error">{errorMsg}</div>}

      {/* Stats Summary Cards */}
      <div className="promo-stats-grid">
        <div className="promo-stat-card">
          <span className="stat-label">মোট প্রোমো কোড</span>
          <strong className="stat-val">{codes.length}</strong>
        </div>
        <div className="promo-stat-card">
          <span className="stat-label">সক্রিয় কোড</span>
          <strong className="stat-val text-green">{activeCodesCount}</strong>
        </div>
        <div className="promo-stat-card">
          <span className="stat-label">মোট রিডিম সংখ্যা</span>
          <strong className="stat-val text-yellow">{totalClaimsCount}</strong>
        </div>
      </div>

      {/* Promo Codes Table */}
      <div className="promo-table-card">
        {loading ? (
          <div className="table-loading">প্রোমো কোড তালিকা লোড হচ্ছে...</div>
        ) : codes.length === 0 ? (
          <div className="table-empty">
            <span>🎟️</span>
            <p>এখনও কোনো প্রোমো কোড তৈরি করা হয়নি। উপরের বাটনে ক্লিক করে নতুন কোড যোগ করুন।</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="promo-data-table">
              <thead>
                <tr>
                  <th>প্রোমো কোড</th>
                  <th>পুরস্কার (Reward)</th>
                  <th>ব্যবহারের অগ্রগতি</th>
                  <th>মেয়াদ</th>
                  <th>স্ট্যাটাস</th>
                  <th>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((item) => {
                  const maxStr = item.maxClaims ? item.maxClaims : 'আনলিমিটেড';
                  const pct = item.maxClaims
                    ? Math.min(100, Math.round(((item.totalClaimed || 0) / item.maxClaims) * 100))
                    : 100;
                  const isExpired =
                    item.expiresAt && new Date(item.expiresAt).getTime() < Date.now();

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="code-pill-wrapper">
                          <code className="code-pill">{item.code}</code>
                          <button
                            type="button"
                            className="btn-copy-code"
                            onClick={() => handleCopy(item.code)}
                            title="কপি করুন"
                          >
                            {copiedCode === item.code ? '✓' : '📋'}
                          </button>
                        </div>
                      </td>
                      <td>
                        {item.rewardType === 'cash' ? (
                          <span className="reward-tag cash">
                            💰 ৳{parseFloat(item.rewardAmount || 0).toLocaleString()} ক্যাশ
                          </span>
                        ) : (
                          <span className="reward-tag spin">🎡 ফ্রি স্পিন</span>
                        )}
                      </td>
                      <td>
                        <div className="claims-progress-wrapper">
                          <div className="claims-numbers">
                            <strong>{item.totalClaimed || 0}</strong> / {maxStr}
                          </div>
                          {item.maxClaims && (
                            <div className="claims-bar-bg">
                              <div className="claims-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {item.expiresAt ? (
                          <span className={isExpired ? 'text-red' : ''}>
                            {new Date(item.expiresAt).toLocaleDateString()}
                            {isExpired && ' (মেয়াদোত্তীর্ণ)'}
                          </span>
                        ) : (
                          <span className="text-muted">মেয়াদহীন</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn-status-toggle ${item.isActive ? 'active' : 'inactive'}`}
                          onClick={() => handleToggleStatus(item)}
                        >
                          {item.isActive ? '✓ সক্রিয়' : '✕ বন্ধ'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-delete-promo"
                          onClick={() => handleDelete(item)}
                          title="মুছে ফেলুন"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Promo Code Modal */}
      {modalOpen && (
        <div className="promo-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="promo-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>+ নতুন প্রোমো কোড তৈরি করুন</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {errorMsg && <div className="promo-alert error">{errorMsg}</div>}

            <form onSubmit={handleCreate} className="promo-create-form">
              <div className="form-group">
                <label>প্রোমো কোড নাম (ইংরেজি বড় হাতের অক্ষক ও সংখ্যা)*</label>
                <input
                  type="text"
                  placeholder="যেমন: WELCOME50, FRIDAY100"
                  value={codeName}
                  onChange={(e) => setCodeName(e.target.value.toUpperCase())}
                  required
                  maxLength={32}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>পুরস্কারের ধরন (Reward Type)*</label>
                <div className="radio-group-row">
                  <label className={`radio-pill ${rewardType === 'cash' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="rewardType"
                      value="cash"
                      checked={rewardType === 'cash'}
                      onChange={() => setRewardType('cash')}
                    />
                    <span>💰 ক্যাশ বোনাস (Wallet Cash)</span>
                  </label>
                  <label className={`radio-pill ${rewardType === 'spin' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="rewardType"
                      value="spin"
                      checked={rewardType === 'spin'}
                      onChange={() => setRewardType('spin')}
                    />
                    <span>🎡 ফ্রি লাকি স্পিন (Lucky Spin)</span>
                  </label>
                </div>
              </div>

              {rewardType === 'cash' && (
                <div className="form-group">
                  <label>বোনাস ক্যাশ পরিমাণ (৳)*</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="৫০"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>সর্বোচ্চ কতজন প্লেয়ার দাবি করতে পারবে? (খালি রাখলে আনলিমিটেড)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="যেমন: ১০০ (বা খালি রাখুন)"
                  value={maxClaims}
                  onChange={(e) => setMaxClaims(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>মেয়াদ শেষ হওয়ার তারিখ (ঐচ্ছিক)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  বাতিল
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'তৈরি হচ্ছে...' : 'প্রোমো কোড তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .agency-promo-page {
          padding: 24px;
          max-width: 1200px;
        }
        .promo-page-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .promo-page-top h2 {
          font-size: 22px;
          color: #f8fafc;
          margin: 0 0 4px;
        }
        .promo-page-sub {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
        }
        .btn-create-promo {
          padding: 10px 20px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #090d16;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .btn-create-promo:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
        }
        .promo-alert {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .promo-alert.success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #34d399;
        }
        .promo-alert.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }
        .promo-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .promo-stat-card {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .stat-label {
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
        }
        .stat-val {
          font-size: 26px;
          font-weight: 800;
          color: #f8fafc;
        }
        .text-green { color: #10b981; }
        .text-yellow { color: #f59e0b; }
        .text-red { color: #ef4444; }
        .text-muted { color: #64748b; }
        .promo-table-card {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          overflow: hidden;
        }
        .table-loading, .table-empty {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
          font-size: 14px;
        }
        .table-empty span {
          font-size: 36px;
          display: block;
          margin-bottom: 8px;
        }
        .table-responsive {
          overflow-x: auto;
        }
        .promo-data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .promo-data-table th, .promo-data-table td {
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 13px;
        }
        .promo-data-table th {
          background: #1e293b;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .code-pill-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .code-pill {
          background: #1e293b;
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fef08a;
          padding: 3px 8px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1px;
        }
        .btn-copy-code {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 14px;
        }
        .reward-tag {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
        }
        .reward-tag.cash {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .reward-tag.spin {
          background: rgba(236, 72, 153, 0.15);
          color: #f472b6;
          border: 1px solid rgba(236, 72, 153, 0.3);
        }
        .claims-progress-wrapper {
          min-width: 100px;
        }
        .claims-numbers {
          font-size: 12px;
          margin-bottom: 4px;
          color: #cbd5e1;
        }
        .claims-bar-bg {
          height: 6px;
          background: #1e293b;
          border-radius: 3px;
          overflow: hidden;
        }
        .claims-bar-fill {
          height: 100%;
          background: #0284c7;
          border-radius: 3px;
        }
        .btn-status-toggle {
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }
        .btn-status-toggle.active {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }
        .btn-status-toggle.inactive {
          background: rgba(255, 255, 255, 0.08);
          color: #94a3b8;
        }
        .btn-delete-promo {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .btn-delete-promo:hover {
          opacity: 1;
        }
        .promo-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .promo-modal-card {
          width: 100%;
          max-width: 480px;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
        }
        .modal-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .modal-header-row h3 {
          margin: 0;
          font-size: 18px;
          color: #f8fafc;
        }
        .btn-close-modal {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 16px;
          cursor: pointer;
        }
        .promo-create-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 12px;
          color: #cbd5e1;
          font-weight: 600;
        }
        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group input[type="date"] {
          height: 42px;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0 14px;
          color: #f8fafc;
          font-size: 14px;
          outline: none;
        }
        .form-group input:focus {
          border-color: #f59e0b;
        }
        .radio-group-row {
          display: flex;
          gap: 12px;
        }
        .radio-pill {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }
        .radio-pill.selected {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
        }
        .modal-actions-row {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }
        .btn-cancel {
          padding: 10px 18px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-save {
          padding: 10px 22px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
          color: #090d16;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}
