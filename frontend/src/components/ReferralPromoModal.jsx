import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import planeImg from '../images/plane.png';

export function ReferralPromoModal() {
  const { isAuthenticated, user, accessToken } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [referralData, setReferralData] = useState(null);

  useEffect(() => {
    // Only check if user is logged in
    if (!isAuthenticated || user?.role !== 'user' || !accessToken) return;

    const shouldShow = sessionStorage.getItem('show_referral_promo_modal');
    if (shouldShow === 'true') {
      // Consume the flag immediately so refresh never re-triggers the modal
      sessionStorage.removeItem('show_referral_promo_modal');

      api
        .getMyReferrals(accessToken)
        .then((res) => {
          setReferralData(res);
          setIsOpen(true);
        })
        .catch(() => {
          // If fetch fails, still show default quota
          setReferralData({ remainingQuota: 5, maxReferrals: 5, bonusAmount: '10' });
          setIsOpen(true);
        });
    }
  }, [isAuthenticated, user?.role, accessToken]);

  if (!isOpen) return null;

  const remaining = referralData?.remainingQuota ?? 5;
  const bonus = referralData?.bonusAmount ?? '10';

  const handleGoToReferrals = () => {
    setIsOpen(false);
    navigate('/referrals');
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 380,
          background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 45%, #090d16 100%)',
          borderRadius: 20,
          border: '1.5px solid rgba(245, 158, 11, 0.45)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.8), 0 0 25px rgba(245, 158, 11, 0.25)',
          overflow: 'hidden',
          animation: 'referralPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          color: '#f8fafc',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#cbd5e1',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'background 0.2s',
          }}
        >
          ✕
        </button>

        {/* Top Decorative Graphic Area */}
        <div
          style={{
            position: 'relative',
            height: 150,
            background: 'radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.35) 0%, rgba(30, 27, 75, 0) 70%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 10,
          }}
        >
          {/* Badge */}
          <div
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.6)',
              color: '#fde047',
              fontSize: 11,
              fontWeight: 800,
              padding: '3px 12px',
              borderRadius: 20,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            ✨ বিশেষ অফার • REFER & EARN ✨
          </div>

          {/* Plane & Coins Artwork */}
          <div style={{ position: 'relative', width: 140, height: 75, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={planeImg}
              alt="Aviator Jet"
              style={{
                width: 100,
                height: 'auto',
                filter: 'drop-shadow(0 6px 12px rgba(239, 68, 68, 0.6))',
                transform: 'rotate(-5deg)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: 0,
                right: 5,
                fontSize: 26,
                filter: 'drop-shadow(0 0 8px #f59e0b)',
              }}
            >
              💰
            </span>
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                left: 10,
                fontSize: 20,
                filter: 'drop-shadow(0 0 8px #10b981)',
              }}
            >
              🎁
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '0 22px 24px 22px' }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: '#ffffff',
              marginBottom: 6,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            বন্ধু রেফার করে আয় করুন!
          </h2>

          <p
            style={{
              fontSize: 13,
              color: '#94a3b8',
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            আপনার বন্ধুদের ইনভাইট করুন এবং প্রতি রেজিস্ট্রেশনে সরাসরি ওয়ালেটে জিতে নিন ফ্রি ক্যাশ বোনাস!
          </p>

          {/* Remaining Quota Highlight Box */}
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 14,
              padding: '14px 16px',
              marginBottom: 18,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, marginBottom: 4 }}>
              🎯 আপনার বাকি রেফারেল কোটা:
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b' }}>
              {remaining}{' '}
              <span style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>
                টি রেফার বাকি
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#4ade80',
                fontWeight: 700,
                marginTop: 6,
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                padding: '4px 8px',
                borderRadius: 6,
                display: 'inline-block',
              }}
            >
              প্রতি সফল রেফারে পাবেন ৳{bonus} বোনাস!
            </div>
          </div>

          {/* Main Action Button */}
          <button
            type="button"
            onClick={handleGoToReferrals}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              border: 'none',
              borderRadius: 12,
              padding: '14px 20px',
              color: '#090d16',
              fontSize: 16,
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(245, 158, 11, 0.4)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span>🎁 এখনই রেফার করুন (Refer Now)</span>
          </button>

          {/* Later / Dismiss Link */}
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: 13,
              cursor: 'pointer',
              padding: '6px 12px',
            }}
          >
            পরে করব (Later)
          </button>
        </div>
      </div>

      <style>{`
        @keyframes referralPopIn {
          0% {
            opacity: 0;
            transform: scale(0.85) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
