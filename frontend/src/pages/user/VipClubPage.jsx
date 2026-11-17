import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Icon } from '../../components/Icon';

export function VipClubPage() {
  const { accessToken, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [claimingLevel, setClaimingLevel] = useState(null);
  const [vipData, setVipData] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchVipStatus = async () => {
    if (!accessToken) return;
    try {
      const data = await api.getVipStatus(accessToken);
      setVipData(data);
    } catch (err) {
      console.error('Failed to load VIP data', err);
      setErrorMsg('ভিআইপি তথ্য লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVipStatus();
  }, [accessToken]);

  const handleClaim = async (tier) => {
    if (!accessToken || claimingLevel !== null) return;
    setClaimingLevel(tier.level);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.claimVipReward(accessToken, tier.level);
      setSuccessMsg(`🎉 অভিনন্দন! আপনি ${tier.bengaliName} স্তরের ৳${res.rewardAmount} লেভেল-আপ ক্যাশ বোনাস সফলভাবে গ্রহণ করেছেন!`);
      if (refreshUser) {
        await refreshUser();
      }
      await fetchVipStatus();
    } catch (err) {
      setErrorMsg(err.message || 'বোনাস সংগ্রহ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setClaimingLevel(null);
    }
  };

  if (loading) {
    return (
      <div className="vip-page-loading">
        <div className="vip-spinner" />
        <p>ভিআইপি ক্লাবের তথ্য লোড হচ্ছে...</p>
        <style>{`
          .vip-page-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 50vh;
            color: #94a3b8;
          }
          .vip-spinner {
            width: 36px;
            height: 36px;
            border: 3px solid rgba(245, 158, 11, 0.2);
            border-top-color: #f59e0b;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 12px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const { currentTier, nextTier, totalDeposited, progressPercentage, requiredForNext, tiers } = vipData || {};

  return (
    <div className="vip-page-container">
      {/* Page Header */}
      <div className="vip-page-header">
        <button
          type="button"
          className="vip-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <Icon name="arrow-left" size={20} />
        </button>
        <h1 className="vip-page-title">👑 ভিআইপি লয়্যালটি ক্লাব</h1>
        <div style={{ width: 36 }} />
      </div>

      {successMsg && (
        <div className="vip-alert success">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')}>✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="vip-alert error">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')}>✕</button>
        </div>
      )}

      {/* Current VIP Card */}
      <div className="vip-hero-card">
        <div className="vip-hero-top">
          <div className="vip-badge-large">{currentTier?.badge}</div>
          <div className="vip-hero-info">
            <span className="vip-current-label">আপনার বর্তমান স্তর</span>
            <h2 className="vip-current-name">
              {currentTier?.bengaliName} ({currentTier?.name})
            </h2>
            <div className="vip-deposit-stat">
              মোট অনুমোদিত ডিপোজিট: <strong>৳{totalDeposited?.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {nextTier ? (
          <div className="vip-progress-section">
            <div className="vip-progress-label">
              <span>পরবর্তী স্তর: {nextTier.badge} {nextTier.bengaliName}</span>
              <span className="vip-progress-pct">{progressPercentage}%</span>
            </div>
            <div className="vip-progress-bar-bg">
              <div
                className="vip-progress-bar-fill"
                style={{ width: `${Math.max(5, progressPercentage)}%` }}
              />
            </div>
            <div className="vip-progress-hint">
              {nextTier.bengaliName} স্তরে পৌঁছাতে আরও <strong>৳{requiredForNext?.toLocaleString()}</strong> ডিপোজিট করুন
            </div>
          </div>
        ) : (
          <div className="vip-max-tier-badge">
            💎 অভিনন্দন! আপনি সর্বোচ্চ ডায়মন্ড স্তরে পৌঁছেছেন!
          </div>
        )}
      </div>

      {/* VIP Tiers Breakdown */}
      <div className="vip-section-heading">
        <h3>ভিআইপি স্তরসমূহ ও বিশেষ সুবিধাসমূহ</h3>
        <p>ডিপোজিট করুন, স্তর বৃদ্ধি করুন এবং লুফে নিন লেভেল-আপ ক্যাশ বোনাস</p>
      </div>

      <div className="vip-tiers-grid">
        {tiers?.map((tier) => (
          <div
            key={tier.level}
            className={`vip-tier-card ${tier.isReached ? 'unlocked' : 'locked'} ${
              currentTier?.level === tier.level ? 'current-active' : ''
            }`}
          >
            <div className="tier-card-header">
              <div className="tier-badge-icon">{tier.badge}</div>
              <div className="tier-titles">
                <h4 className="tier-name-bn">
                  {tier.bengaliName} VIP
                  {currentTier?.level === tier.level && (
                    <span className="current-pill">বর্তমান</span>
                  )}
                </h4>
                <span className="tier-min-deposit">
                  ন্যূনতম ডিপোজিট: {tier.minDeposit === 0 ? '৳০ (ফ্রি)' : `৳${tier.minDeposit.toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Level Up Reward Banner */}
            {tier.levelUpReward > 0 && (
              <div className="tier-reward-box">
                <div className="reward-info">
                  <span className="reward-tag">লেভেল-আপ রিওয়ার্ড</span>
                  <strong className="reward-amount">৳{tier.levelUpReward.toLocaleString()}</strong>
                </div>

                {tier.isClaimed ? (
                  <span className="tier-btn claimed">
                    ✓ নেওয়া হয়েছে
                  </span>
                ) : tier.canClaim ? (
                  <button
                    type="button"
                    className="tier-btn claim-now"
                    onClick={() => handleClaim(tier)}
                    disabled={claimingLevel === tier.level}
                  >
                    {claimingLevel === tier.level ? 'গ্রহণ হচ্ছে...' : '🎁 ক্যাশ নিন'}
                  </button>
                ) : (
                  <span className="tier-btn locked">
                    🔒 লকড
                  </span>
                )}
              </div>
            )}

            {/* Perks List */}
            <div className="tier-perks-list">
              {tier.perks.map((perk, idx) => (
                <div key={idx} className="tier-perk-item">
                  <span className="perk-check">✓</span>
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* VIP Rules / Explanation */}
      <div className="vip-info-box">
        <h4>📌 ভিআইপি ক্লাব নিয়মাবলী:</h4>
        <ul>
          <li>আপনার সফলভাবে অনুমোদিত ডিপোজিটের উপর ভিত্তি করে স্বয়ংক্রিয়ভাবে ভিআইপি স্তর নির্ধারিত হয়।</li>
          <li>প্রতিটি স্তরে উন্নীত হলে এককালীন ক্যাশ বোনাস সংগ্রহ করা যায়, যা সাথে সাথে মূল ওয়ালেটে জমা হয়।</li>
          <li>উচ্চ স্তরে পৌঁছালে ক্যাশআউট স্পিড, উইথড্রয়াল লিমিট ও স্পেশাল প্রমোশন সুবিধা বৃদ্ধি পায়।</li>
        </ul>
      </div>

      <style>{`
        .vip-page-container {
          padding: 16px 16px 80px;
          max-width: 680px;
          margin: 0 auto;
          color: #f1f5f9;
        }
        .vip-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .vip-back-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .vip-page-title {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
          color: #fef08a;
        }
        .vip-alert {
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .vip-alert.success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #6ee7b7;
        }
        .vip-alert.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }
        .vip-alert button {
          background: none;
          border: none;
          color: inherit;
          font-size: 14px;
          cursor: pointer;
        }
        .vip-hero-card {
          background: radial-gradient(circle at 100% 0%, #1e2e4a 0%, #0d1527 80%);
          border: 1px solid rgba(245, 158, 11, 0.35);
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 158, 11, 0.1);
          margin-bottom: 24px;
        }
        .vip-hero-top {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .vip-badge-large {
          font-size: 42px;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          border: 1px solid rgba(245, 158, 11, 0.25);
        }
        .vip-hero-info {
          flex: 1;
        }
        .vip-current-label {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .vip-current-name {
          font-size: 20px;
          font-weight: 800;
          margin: 2px 0 4px;
          color: #fef08a;
        }
        .vip-deposit-stat {
          font-size: 13px;
          color: #cbd5e1;
        }
        .vip-deposit-stat strong {
          color: #38bdf8;
        }
        .vip-progress-section {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 12px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .vip-progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #cbd5e1;
          margin-bottom: 6px;
          font-weight: 600;
        }
        .vip-progress-pct {
          color: #f59e0b;
        }
        .vip-progress-bar-bg {
          height: 8px;
          background: #1e293b;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .vip-progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #f59e0b, #10b981);
          border-radius: 6px;
          transition: width 0.4s ease-out;
        }
        .vip-progress-hint {
          font-size: 11px;
          color: #94a3b8;
        }
        .vip-progress-hint strong {
          color: #fef08a;
        }
        .vip-max-tier-badge {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34d399;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          padding: 10px;
          border-radius: 10px;
        }
        .vip-section-heading {
          margin-bottom: 14px;
        }
        .vip-section-heading h3 {
          font-size: 16px;
          font-weight: 800;
          margin: 0 0 2px;
          color: #f1f5f9;
        }
        .vip-section-heading p {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }
        .vip-tiers-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 24px;
        }
        .vip-tier-card {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .vip-tier-card.unlocked {
          border-color: rgba(245, 158, 11, 0.3);
        }
        .vip-tier-card.current-active {
          border-color: #f59e0b;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.15);
        }
        .vip-tier-card.locked {
          opacity: 0.85;
        }
        .tier-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .tier-badge-icon {
          font-size: 28px;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tier-titles {
          flex: 1;
        }
        .tier-name-bn {
          font-size: 16px;
          font-weight: 800;
          margin: 0 0 2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .current-pill {
          font-size: 10px;
          font-weight: 700;
          background: #f59e0b;
          color: #090d16;
          padding: 1px 6px;
          border-radius: 10px;
        }
        .tier-min-deposit {
          font-size: 12px;
          color: #94a3b8;
        }
        .tier-reward-box {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .reward-info {
          display: flex;
          flex-direction: column;
        }
        .reward-tag {
          font-size: 10px;
          color: #f59e0b;
          font-weight: 700;
          text-transform: uppercase;
        }
        .reward-amount {
          font-size: 16px;
          color: #fef08a;
          font-weight: 800;
        }
        .tier-btn {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          border: none;
        }
        .tier-btn.claim-now {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #090d16;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
          animation: claimPulse 1.5s infinite;
        }
        @keyframes claimPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .tier-btn.claimed {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
        }
        .tier-btn.locked {
          background: rgba(255, 255, 255, 0.06);
          color: #64748b;
        }
        .tier-perks-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tier-perk-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #cbd5e1;
        }
        .perk-check {
          color: #10b981;
          font-weight: 800;
        }
        .vip-info-box {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 14px;
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.6;
        }
        .vip-info-box h4 {
          margin: 0 0 8px;
          color: #f1f5f9;
          font-size: 13px;
        }
        .vip-info-box ul {
          margin: 0;
          padding-left: 18px;
        }
        .vip-info-box li {
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}
