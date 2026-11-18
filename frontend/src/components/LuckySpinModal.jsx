import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Icon } from './Icon';

const DEFAULT_SLICES = [
  { index: 0, label: '৳৫', amount: 5, type: 'cash', color: '#f59e0b', textColor: '#090d16' },
  { index: 1, label: 'Try Again', amount: 0, type: 'nothing', color: '#334155', textColor: '#cbd5e1' },
  { index: 2, label: '৳১০', amount: 10, type: 'cash', color: '#10b981', textColor: '#090d16' },
  { index: 3, label: 'Better Luck', amount: 0, type: 'nothing', color: '#1e293b', textColor: '#94a3b8' },
  { index: 4, label: '৳২০', amount: 20, type: 'cash', color: '#8b5cf6', textColor: '#ffffff' },
  { index: 5, label: 'Try Again', amount: 0, type: 'nothing', color: '#334155', textColor: '#cbd5e1' },
  { index: 6, label: '৳৫০', amount: 50, type: 'cash', color: '#ec4899', textColor: '#ffffff' },
  { index: 7, label: '৳৫', amount: 5, type: 'cash', color: '#eab308', textColor: '#090d16' },
];

function formatRemainingTime(ms) {
  if (ms <= 0) return 'এখনই স্পিন করতে পারবেন!';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function LuckySpinModal({ isOpen, onClose }) {
  const { accessToken, refreshUser } = useAuth();
  const [slices, setSlices] = useState(DEFAULT_SLICES);
  const [canSpin, setCanSpin] = useState(false);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [wonPrize, setWonPrize] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPrizeAlert, setShowPrizeAlert] = useState(false);

  const currentRotationRef = useRef(0);

  // Fetch spin status
  useEffect(() => {
    if (!isOpen || !accessToken) return;

    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await api.getDailySpinStatus(accessToken);
        if (!isMounted) return;
        setCanSpin(res.canSpin);
        setCooldownRemainingMs(res.cooldownRemainingMs || 0);
        if (res.slices?.length) {
          setSlices(res.slices);
        }
      } catch (err) {
        console.error('Failed to load spin status', err);
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [isOpen, accessToken]);

  // Countdown timer when on cooldown
  useEffect(() => {
    if (!isOpen || canSpin || cooldownRemainingMs <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemainingMs((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          setCanSpin(true);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, canSpin, cooldownRemainingMs]);

  if (!isOpen) return null;

  const handleSpin = async () => {
    if (isSpinning || !canSpin || !accessToken) return;

    setIsSpinning(true);
    setErrorMessage('');
    setShowPrizeAlert(false);

    try {
      const result = await api.executeDailySpin(accessToken);
      const targetIndex = result.selectedSliceIndex ?? 0;

      // 8 slices => 45 degrees per slice.
      // Slices centered at i * 45 deg.
      // Target alignment to top (0 deg): (8 - targetIndex) * 45 deg.
      const sliceAngle = 360 / slices.length;
      const targetOffset = (slices.length - targetIndex) * sliceAngle;

      // Keep accumulating rotations so the wheel always spins forward smoothly
      const spins = 5;
      const currentFullSpins = Math.floor(currentRotationRef.current / 360);
      const nextRotation = (currentFullSpins + spins) * 360 + targetOffset;

      currentRotationRef.current = nextRotation;
      setRotationDeg(nextRotation);

      // Wait for wheel animation (4.5s)
      setTimeout(async () => {
        setIsSpinning(false);
        setCanSpin(false);
        setCooldownRemainingMs(24 * 60 * 60 * 1000);
        setWonPrize(result.prize);
        setShowPrizeAlert(true);
        if (refreshUser) {
          await refreshUser();
        }
      }, 4500);
    } catch (err) {
      setIsSpinning(false);
      setErrorMessage(err.message || 'স্পিন করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };

  const numSlices = slices.length;
  const sliceAngle = 360 / numSlices;
  const radius = 140;
  const center = 150;

  return (
    <div className="lucky-spin-overlay" onClick={isSpinning ? undefined : onClose}>
      <div
        className="lucky-spin-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="lucky-spin-close"
          onClick={onClose}
          disabled={isSpinning}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="lucky-spin-header">
          <span className="lucky-spin-badge">প্রতিদিন ১টি ফ্রি স্পিন</span>
          <h2 className="lucky-spin-title">🎡 লাকি স্পিন ও উইন</h2>
          <p className="lucky-spin-subtitle">
            চাকা ঘুরিয়ে জিতে নিন তাৎক্ষণিক ৳৫০ পর্যন্ত ক্যাশ বোনাস!
          </p>
        </div>

        {errorMessage && (
          <div className="lucky-spin-error">{errorMessage}</div>
        )}

        {/* Wheel Container */}
        <div className="lucky-spin-stage">
          {/* Top Indicator Arrow */}
          <div className="lucky-spin-pointer" />

          {/* Wheel Graphic */}
          <div
            className="lucky-spin-wheel"
            style={{
              transform: `rotate(${rotationDeg}deg)`,
              transition: isSpinning ? 'transform 4.5s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
            }}
          >
            <svg viewBox="0 0 300 300" className="wheel-svg">
              <defs>
                <filter id="wheel-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f59e0b" floodOpacity="0.4" />
                </filter>
              </defs>

              <circle cx={center} cy={center} r={radius + 8} fill="#0d1527" stroke="#f59e0b" strokeWidth="4" filter="url(#wheel-glow)" />

              {/* Slices */}
              {slices.map((slice, i) => {
                const startAngle = (i * sliceAngle - sliceAngle / 2) * (Math.PI / 180);
                const endAngle = ((i + 1) * sliceAngle - sliceAngle / 2) * (Math.PI / 180);

                const x1 = center + radius * Math.sin(startAngle);
                const y1 = center - radius * Math.cos(startAngle);
                const x2 = center + radius * Math.sin(endAngle);
                const y2 = center - radius * Math.cos(endAngle);

                const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
                const textAngle = i * sliceAngle;

                return (
                  <g key={slice.index}>
                    <path d={d} fill={slice.color} stroke="#0b101b" strokeWidth="2" />
                    <g
                      transform={`rotate(${textAngle}, ${center}, ${center}) translate(${center}, ${center - radius + 35})`}
                    >
                      <text
                        x="0"
                        y="0"
                        fill={slice.textColor}
                        fontWeight="800"
                        fontSize={slice.label.length > 5 ? '13' : '16'}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {slice.label}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Outer decorative dots */}
              {Array.from({ length: 16 }).map((_, i) => {
                const angle = (i * (360 / 16)) * (Math.PI / 180);
                const dotR = radius + 4;
                const cx = center + dotR * Math.sin(angle);
                const cy = center - dotR * Math.cos(angle);
                return <circle key={i} cx={cx} cy={cy} r="2.5" fill="#fef08a" />;
              })}

              {/* Wheel Center Button Graphic */}
              <circle cx={center} cy={center} r={32} fill="#0b101b" stroke="#f59e0b" strokeWidth="3" />
              <circle cx={center} cy={center} r={24} fill="#1e293b" />
            </svg>
          </div>

          {/* Center Play Button Overlay */}
          <button
            type="button"
            className={`lucky-spin-center-btn ${canSpin && !isSpinning ? 'pulse' : 'disabled'}`}
            onClick={handleSpin}
            disabled={!canSpin || isSpinning}
          >
            {isSpinning ? '...' : 'SPIN'}
          </button>
        </div>

        {/* Action & Status Footer */}
        <div className="lucky-spin-footer">
          {canSpin ? (
            <button
              type="button"
              className="lucky-spin-action-btn"
              onClick={handleSpin}
              disabled={isSpinning}
            >
              <Icon name="sparkle" weight="fill" size={20} />
              <span>{isSpinning ? 'হুইল ঘুরছে...' : 'ফ্রি স্পিন করুন!'}</span>
            </button>
          ) : (
            <div className="lucky-spin-cooldown-box">
              <div className="cooldown-label">পরবর্তী ফ্রি স্পিন আনলক হবে:</div>
              <div className="cooldown-timer">
                ⏳ {formatRemainingTime(cooldownRemainingMs)}
              </div>
            </div>
          )}
        </div>

        {/* Prize Notification Overlay */}
        {showPrizeAlert && wonPrize && (
          <div className="spin-prize-overlay">
            <div className="spin-prize-card">
              <div className="spin-prize-emoji">
                {wonPrize.type === 'cash' ? '🎉' : '🍀'}
              </div>
              <h3 className="spin-prize-title">
                {wonPrize.type === 'cash'
                  ? `অভিনন্দন! আপনি ${wonPrize.label} জিতেছেন!`
                  : 'পরের বার শুভকামনা!'}
              </h3>
              <p className="spin-prize-desc">
                {wonPrize.type === 'cash'
                  ? 'আপনার ওয়ালেটে ক্যাশ যোগ করা হয়েছে। এখনই Aviator বা অন্য যেকোনো গেমে খেলুন।'
                  : 'আজকের ফ্রি স্পিন শেষ। আগামী ২৪ ঘণ্টা পর আবার ফ্রি স্পিন করতে পারবেন।'}
              </p>
              <button
                type="button"
                className="spin-prize-btn"
                onClick={() => setShowPrizeAlert(false)}
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .lucky-spin-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 7, 15, 0.82);
          backdrop-filter: blur(8px);
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: spinFadeIn 0.25s ease-out;
        }
        @keyframes spinFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .lucky-spin-dialog {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: radial-gradient(circle at 50% 0%, #17243c 0%, #0b101b 85%);
          border: 1px solid rgba(245, 158, 11, 0.35);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.15);
          border-radius: 20px;
          padding: 24px 20px 20px;
          text-align: center;
          color: #f1f5f9;
        }
        .lucky-spin-close {
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
        .lucky-spin-close:hover {
          background: rgba(255, 255, 255, 0.18);
          color: #fff;
        }
        .lucky-spin-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          background: rgba(245, 158, 11, 0.18);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.4);
          padding: 3px 10px;
          border-radius: 20px;
          margin-bottom: 8px;
          letter-spacing: 0.3px;
        }
        .lucky-spin-title {
          font-size: 22px;
          font-weight: 800;
          margin: 0 0 4px;
          background: linear-gradient(135deg, #fef08a, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .lucky-spin-subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin: 0 0 16px;
        }
        .lucky-spin-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
          font-size: 13px;
          padding: 8px 12px;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .lucky-spin-stage {
          position: relative;
          width: 290px;
          height: 290px;
          margin: 0 auto 20px;
        }
        .lucky-spin-pointer {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 14px solid transparent;
          border-right: 14px solid transparent;
          border-top: 24px solid #f59e0b;
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.6));
          z-index: 10;
        }
        .lucky-spin-wheel {
          width: 100%;
          height: 100%;
          transform-origin: center center;
          will-change: transform;
        }
        .wheel-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .lucky-spin-center-btn {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: radial-gradient(circle, #f59e0b 0%, #b45309 100%);
          border: 3px solid #fef08a;
          color: #090d16;
          font-weight: 900;
          font-size: 14px;
          letter-spacing: 0.5px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .lucky-spin-center-btn.pulse {
          animation: spinBtnPulse 1.8s infinite;
        }
        @keyframes spinBtnPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6); }
          50% { transform: translate(-50%, -50%) scale(1.06); box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
        }
        .lucky-spin-center-btn.disabled {
          background: #334155;
          border-color: #64748b;
          color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }
        .lucky-spin-footer {
          margin-top: 8px;
        }
        .lucky-spin-action-btn {
          width: 100%;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
          color: #090d16;
          font-size: 16px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
          transition: transform 0.15s, opacity 0.15s;
        }
        .lucky-spin-action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .lucky-spin-cooldown-box {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 10px 14px;
        }
        .cooldown-label {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .cooldown-timer {
          font-family: monospace;
          font-size: 18px;
          font-weight: 800;
          color: #38bdf8;
          letter-spacing: 1px;
        }
        .spin-prize-overlay {
          position: absolute;
          inset: 0;
          background: rgba(5, 10, 20, 0.88);
          backdrop-filter: blur(4px);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: spinPrizePop 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
          z-index: 20;
        }
        @keyframes spinPrizePop {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .spin-prize-card {
          text-align: center;
        }
        .spin-prize-emoji {
          font-size: 48px;
          margin-bottom: 8px;
        }
        .spin-prize-title {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 8px;
          color: #fef08a;
        }
        .spin-prize-desc {
          font-size: 13px;
          color: #cbd5e1;
          margin: 0 0 18px;
          line-height: 1.5;
        }
        .spin-prize-btn {
          padding: 10px 24px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
