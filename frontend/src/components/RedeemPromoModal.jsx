import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { playNotificationSound } from '../utils/sound';
import { Icon } from './Icon';

export function RedeemPromoModal({ isOpen, onClose, onSuccess }) {
  const { accessToken, refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  if (!isOpen) return null;

  const handleRedeem = async (e) => {
    e?.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !accessToken || loading) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.redeemPromoCode(accessToken, cleanCode);
      setSuccessData(res);
      playNotificationSound(true);
      if (refreshUser) {
        await refreshUser();
      }
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      setErrorMsg(err.message || 'প্রোমো কোডটি সঠিক নয়। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setErrorMsg('');
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="redeem-modal-overlay" onClick={handleClose}>
      <div
        className="redeem-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="redeem-modal-close"
          onClick={handleClose}
          aria-label="Close"
        >
          ✕
        </button>

        {successData ? (
          <div className="redeem-success-view">
            <div className="success-icon-bounce">
              {successData.rewardType === 'cash' ? '🎉' : '🎡'}
            </div>
            <h3 className="success-title">প্রোমো কোড সফল হয়েছে!</h3>
            <div className="success-reward-pill">
              {successData.rewardType === 'cash'
                ? `৳${parseFloat(successData.rewardAmount).toLocaleString()} ক্যাশ বোনাস`
                : '১টি ফ্রি লাকি স্পিন'}
            </div>
            <p className="success-desc">
              {successData.rewardType === 'cash'
                ? 'আপনার ওয়ালেট ব্যালেন্সে বোনাসের টাকা যোগ করা হয়েছে। এখনই Aviator বা যেকোনো গেমে খেলুন।'
                : 'আপনার দৈনিক লাকি হুইল এখন সক্রিয়! এখনই চাকা ঘুরিয়ে আকর্ষণীয় পুরস্কার জিতুন।'}
            </p>
            <button
              type="button"
              className="redeem-modal-action-btn"
              onClick={handleClose}
            >
              ঠিক আছে
            </button>
          </div>
        ) : (
          <>
            <div className="redeem-modal-header">
              <span className="redeem-icon-badge">🎟️</span>
              <h2 className="redeem-title">প্রোমো কোড রিডিম</h2>
              <p className="redeem-subtitle">
                আপনার কাছে কোনো কুপন বা প্রোমো কোড থাকলে নিচে লিখুন এবং তাৎক্ষণিক বোনাস বুঝে নিন!
              </p>
            </div>

            {errorMsg && (
              <div className="redeem-error-banner">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRedeem} className="redeem-form">
              <div className="redeem-input-wrapper">
                <input
                  type="text"
                  className="redeem-input"
                  placeholder="যেমন: WELCOME50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={loading}
                  maxLength={32}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="redeem-modal-action-btn"
                disabled={!code.trim() || loading}
              >
                {loading ? 'যাচাই করা হচ্ছে...' : 'রিডিম করুন'}
              </button>
            </form>

            <div className="redeem-modal-hint">
              <span>💡 ফেসবুক বা টেলিগ্রাম গ্রুপে নিয়মিত নতুন প্রোমো কোড শেয়ার করা হয়।</span>
            </div>
          </>
        )}
      </div>

      <style>{`
        .redeem-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 7, 15, 0.82);
          backdrop-filter: blur(6px);
          z-index: 1250;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: modalFadeIn 0.2s ease-out;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .redeem-modal-dialog {
          position: relative;
          width: 100%;
          max-width: 400px;
          background: radial-gradient(circle at 50% 0%, #152238 0%, #0b101b 85%);
          border: 1px solid rgba(245, 158, 11, 0.35);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.15);
          border-radius: 20px;
          padding: 24px 22px 20px;
          text-align: center;
          color: #f1f5f9;
        }
        .redeem-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: none;
          color: #94a3b8;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        }
        .redeem-modal-close:hover {
          background: rgba(255, 255, 255, 0.18);
          color: #fff;
        }
        .redeem-icon-badge {
          font-size: 38px;
          display: inline-block;
          margin-bottom: 8px;
        }
        .redeem-title {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 4px;
          color: #fef08a;
        }
        .redeem-subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin: 0 0 18px;
          line-height: 1.5;
        }
        .redeem-error-banner {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
          font-size: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          margin-bottom: 14px;
          text-align: left;
        }
        .redeem-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .redeem-input-wrapper {
          position: relative;
        }
        .redeem-input {
          width: 100%;
          height: 48px;
          background: #1e293b;
          border: 2px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
          padding: 0 16px;
          font-family: monospace;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 2px;
          text-align: center;
          color: #fef08a;
          outline: none;
          text-transform: uppercase;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .redeem-input:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.25);
        }
        .redeem-modal-action-btn {
          width: 100%;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
          color: #090d16;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
          transition: transform 0.15s, opacity 0.15s;
        }
        .redeem-modal-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .redeem-modal-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .redeem-modal-hint {
          margin-top: 16px;
          font-size: 11px;
          color: #64748b;
        }
        .redeem-success-view {
          padding: 10px 0;
        }
        .success-icon-bounce {
          font-size: 52px;
          margin-bottom: 10px;
          animation: iconBounce 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }
        @keyframes iconBounce {
          from { transform: scale(0.5); }
          to { transform: scale(1); }
        }
        .success-title {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 10px;
          color: #fef08a;
        }
        .success-reward-pill {
          display: inline-block;
          font-size: 16px;
          font-weight: 800;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #34d399;
          padding: 6px 18px;
          border-radius: 20px;
          margin-bottom: 12px;
        }
        .success-desc {
          font-size: 13px;
          color: #cbd5e1;
          margin: 0 0 20px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
