import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../api/client';
import '../../styles/userTheme.css';

export function ReferralsPage() {
  const { accessToken } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.getMyReferrals(accessToken);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'রেফারেল তথ্য লোড করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const referralLink = data?.referralCode
    ? `${window.location.origin}/register?ref=${data.referralCode}`
    : '';

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateLink = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setStatusMsg('');
    try {
      const res = await api.regenerateReferralCode(accessToken);
      setData((prev) => (prev ? { ...prev, referralCode: res.referralCode } : prev));
      setStatusMsg('✓ নতুন রেফারেল লিংক সফলভাবে তৈরি হয়েছে!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'লিংক জেনারেট করতে ব্যর্থ হয়েছে');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!referralLink) return;
    const text = encodeURIComponent(
      `🔥 CkasH Gaming প্ল্যাটফর্মে যোগ দিন এবং জিতুন দুর্দান্ত সব বোনাস! আমার রেফারেল লিংক থেকে রেজিস্ট্রেশন করুন: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const formatResetTime = (iso) => {
    if (!iso) return null;
    const diffMs = new Date(iso).getTime() - Date.now();
    if (diffMs <= 0) return 'এখনই রিসেট হচ্ছে';
    const hours = Math.floor(diffMs / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    return `${hours} ঘণ্টা ${mins} মিনিট পর`;
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🎁</div>
        <p>রেফারেল ড্যাশবোর্ড লোড হচ্ছে...</p>
      </div>
    );
  }

  const hasCode = Boolean(data?.referralCode);
  const remainingQuota = data?.remainingQuota ?? 0;
  const bonusAmount = data?.bonusAmount ?? '10';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 50, paddingLeft: 12, paddingRight: 12 }}>
      {/* Header Banner */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="u-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
          <span>🎁</span> রেফার ও আয় (Refer & Earn)
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
          বন্ধুদের ইনভাইট করুন এবং প্রতি রেজিস্ট্রেশনে সরাসরি ওয়ালেটে নগদ ক্যাশ বোনাস জিতুন!
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: 10,
            padding: 12,
            color: '#f87171',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* 1. Invitation Link / Code Box */}
      <div className="u-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', letterSpacing: 0.5 }}>
            আপনার ইনভাইটেশন লিংক (INVITATION LINK)
          </div>
          {hasCode && (
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={isGenerating}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>{isGenerating ? 'জেনারেট হচ্ছে...' : '🔄 নতুন কোড নিন'}</span>
            </button>
          )}
        </div>

        {!hasCode ? (
          /* Generate Link CTA if code is not generated yet */
          <div
            style={{
              backgroundColor: '#090d16',
              border: '1.5px dashed rgba(245, 158, 11, 0.4)',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>
              আপনার রেফারেল লিংক তৈরি করুন
            </div>
            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 16, maxWidth: 360, margin: '0 auto 16px' }}>
              নিচের বাটনে চাপ দিয়ে এখনই আপনার ব্যক্তিগত রেফারেল লিংক তৈরি করে বন্ধুদের ইনভাইট করা শুরু করুন!
            </p>
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={isGenerating}
              style={{
                backgroundColor: '#f59e0b',
                color: '#090d16',
                border: 'none',
                borderRadius: 10,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)',
              }}
            >
              {isGenerating ? 'লিংক তৈরি হচ্ছে...' : '✨ রেফারেল লিংক তৈরি করুন (Generate Link)'}
            </button>
          </div>
        ) : (
          /* Link input & copy button */
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: 10,
                padding: '8px 10px',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <input
                type="text"
                readOnly
                value={referralLink}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#f8fafc',
                  fontSize: 13,
                  outline: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  backgroundColor: copied ? '#22c55e' : '#f59e0b',
                  color: '#090d16',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? '✓ কপি হয়েছে!' : 'Copy'}
              </button>
            </div>

            {/* Quick Share Buttons */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>রেফারেল কোড:</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    color: '#fde047',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  {data?.referralCode}
                </span>
              </div>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                style={{
                  marginLeft: 'auto',
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>💬 হোয়াটসঅ্যাপে শেয়ার</span>
              </button>
            </div>
          </>
        )}

        {statusMsg && (
          <div style={{ color: '#4ade80', fontSize: 12, marginTop: 10, fontWeight: 700 }}>
            {statusMsg}
          </div>
        )}
      </div>

      {/* 2. Quota & Bonus Metrics Card */}
      <div className="u-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div
            style={{
              backgroundColor: '#090d16',
              padding: 14,
              borderRadius: 12,
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              বাকি কোটা (Remaining Quota)
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#38bdf8', marginTop: 4 }}>
              {remainingQuota}
              <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>
                {' '}/ {data?.maxReferrals}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              {data?.mode === 'window'
                ? `প্রতি ${data?.resetWindowHours} ঘণ্টায় রিসেট (${formatResetTime(data?.nextResetAt) ?? 'সক্রিয়'})`
                : 'সর্বোচ্চ মোট লাইফটাইম লিমিট'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#090d16',
              padding: 14,
              borderRadius: 12,
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              প্রতি রেফারে ক্যাশ বোনাস
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#4ade80', marginTop: 4 }}>
              ৳{bonusAmount}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              রেজিস্ট্রেশনের সাথে সাথে ব্যালেন্সে জমা
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
          }}
        >
          <span style={{ color: '#94a3b8' }}>মোট সফল রেফারেল:</span>
          <span style={{ color: '#f8fafc', fontWeight: 800 }}>{data?.totalLifetimeCount ?? 0} জন</span>
        </div>
      </div>

      {/* 3. Detailed Bengali Instructions Card */}
      <div className="u-card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>📖</span> রেফার করার সহজ নিয়মাবলী ও নির্দেশিকা
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              ১
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 13 }}>
                লিংক কপি করুন (Copy Your Link)
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>
                উপরের বক্স থেকে &quot;Copy&quot; বাটনে ক্লিক করে আপনার ইউনিক রেফারেল লিংকটি কপি করে নিন।
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              ২
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 13 }}>
                বন্ধুদের সাথে শেয়ার করুন (Share With Friends)
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>
                হোয়াটসঅ্যাপ, ফেসবুক, মেসেঞ্জার বা টেলিগ্রামে বন্ধুদের সাথে লিংকটি শেয়ার করুন।
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              ৩
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 13 }}>
                বন্ধু রেজিস্ট্রেশন করলেই ইনস্ট্যান্ট ক্যাশ!
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>
                আপনার বন্ধু সফলভাবে রেজিস্ট্রেশন সম্পন্ন করলেই স্বয়ংক্রিয়ভাবে আপনার ওয়ালেটে <strong style={{ color: '#4ade80' }}>৳{bonusAmount}</strong> জমা হবে।
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'rgba(168, 85, 247, 0.2)',
                color: '#c084fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              ৪
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 13 }}>
                কোটা ও অটো রিসেট
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>
                নির্ধারিত কোটা শেষ হলে নতুন রেজিস্ট্রেশন সাময়িকভাবে বন্ধ থাকবে। টাইম উইন্ডো পার হলে কোটা আবার স্বয়ংক্রিয়ভাবে রিসেট হয়ে যাবে।
              </div>
            </div>
          </div>
        </div>

        {/* Warning Policy Note */}
        <div
          style={{
            marginTop: 16,
            backgroundColor: 'rgba(234, 179, 8, 0.08)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: 8,
            padding: 10,
            fontSize: 12,
            color: '#fde047',
            lineHeight: 1.4,
          }}
        >
          ⚠️ <strong>সতর্কতা:</strong> একই ডিভাইসে বা একই নম্বরে ফেক একাউন্ট খুলে রেফার বোনাস নেওয়ার চেষ্টা করলে এজেন্সি অ্যাডমিন একাউন্ট ও বোনাস বাতিল করতে পারে।
        </div>
      </div>

      {/* 4. Invited Friends History */}
      <div className="u-card">
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', marginBottom: 12 }}>
          আমন্ত্রিত বন্ধুদের তালিকা ({data?.referredUsers?.length ?? 0} জন)
        </h2>

        {data?.referredUsers && data.referredUsers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.referredUsers.map((friend) => (
              <div
                key={friend.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#090d16',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid #1e293b',
                }}
              >
                <div>
                  <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: 14 }}>
                    {friend.name}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                    {friend.phone} • {new Date(friend.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div
                  style={{
                    color: '#4ade80',
                    fontWeight: 800,
                    fontSize: 14,
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    padding: '4px 10px',
                    borderRadius: 6,
                  }}
                >
                  +৳{friend.bonusAmount}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748b', fontSize: 13 }}>
            <p>এখনও কোনো বন্ধুকে রেফার করা হয়নি।</p>
            <p style={{ marginTop: 4, color: '#94a3b8' }}>উপরের লিংকটি কপি করে বন্ধুদের সাথে শেয়ার করুন!</p>
          </div>
        )}
      </div>
    </div>
  );
}
