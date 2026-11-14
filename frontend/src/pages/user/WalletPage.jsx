import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../api/client';
import { Icon } from '../../components/Icon';
import '../../styles/wallet.css';

const QUICK_AMOUNTS = [500, 800, 1000, 2000, 5000, 10000, 20000];

const PROVIDER_INFO = {
  bkash: {
    label: 'bKash',
    bangla: 'BKASH',
    bannerClass: 'bkash',
    iconLetter: 'b',
  },
  nagad: {
    label: 'Nagad',
    bangla: 'NAGAD',
    bannerClass: 'nagad',
    iconLetter: 'ন',
  },
  rocket: {
    label: 'Rocket',
    bangla: 'ROCKET',
    bannerClass: 'rocket',
    iconLetter: 'R',
  },
};

const ACCOUNT_TYPE_LABELS = {
  personal: 'সেন্ড মানি',
  agent: 'ক্যাশআউট',
  merchant: 'পেমেন্ট',
};

const STATUS_MAP = {
  pending: { label: 'অপেক্ষমান (Pending)', class: 'pending', icon: '⏳' },
  approved: { label: 'অনুমোদিত (Approved)', class: 'approved', icon: '✓' },
  rejected: { label: 'প্রত্যাখ্যাত (Rejected)', class: 'rejected', icon: '✕' },
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function WalletPage() {
  const { user, accessToken, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState('deposit'); // 'deposit' | 'withdraw' | 'requests'
  const [methods, setMethods] = useState([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Step 1 state
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [amount, setAmount] = useState('500');
  const [step, setStep] = useState(1); // 1 = input, 2 = payment & trxid

  // Step 2 state
  const [trxId, setTrxId] = useState('');
  const [copied, setCopied] = useState(false);
  const [showTrxGuide, setShowTrxGuide] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Requests tab state
  const [userRequests, setUserRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestFilter, setRequestFilter] = useState('all'); // 'all' | 'deposit' | 'withdraw'

  // Withdrawal tab state
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState('bkash'); // 'bkash' | 'nagad' | 'rocket'
  const [withdrawalAccounts, setWithdrawalAccounts] = useState([]);
  const [isLoadingWithdrawalAccounts, setIsLoadingWithdrawalAccounts] = useState(false);

  // Setup form fields
  const [setupAccountGroup, setSetupAccountGroup] = useState('Personal');
  const [setupAccountNumber, setSetupAccountNumber] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [isSubmittingSetup, setIsSubmittingSetup] = useState(false);

  // Withdrawal dashboard form fields
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawTxPassword, setWithdrawTxPassword] = useState('');
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [restrictionModal, setRestrictionModal] = useState({
    isOpen: false,
    message: '',
  });

  useEffect(() => {
    if (!restrictionModal.isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setRestrictionModal({ isOpen: false, message: '' });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [restrictionModal.isOpen]);

  // Timer state (starts at 5 minutes = 300s)
  const [secondsLeft, setSecondsLeft] = useState(300);
  const timerRef = useRef(null);

  const loadDepositMethods = () => {
    setIsLoadingMethods(true);
    api
      .getDepositMethods(accessToken)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setMethods(list);
        if (list.length > 0) {
          setSelectedMethodId(list[0].id);
        }
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load deposit methods');
      })
      .finally(() => {
        setIsLoadingMethods(false);
      });
  };

  const loadUserRequests = () => {
    setIsLoadingRequests(true);
    api
      .getMyWalletRequests(accessToken)
      .then((data) => {
        setUserRequests(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingRequests(false);
      });
  };

  const loadWithdrawalAccounts = () => {
    setIsLoadingWithdrawalAccounts(true);
    api
      .getUserWithdrawalAccounts(accessToken)
      .then((data) => {
        setWithdrawalAccounts(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingWithdrawalAccounts(false);
      });
  };

  useEffect(() => {
    loadDepositMethods();
    loadUserRequests();
    loadWithdrawalAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Timer effect for step 2
  useEffect(() => {
    if (step === 2) {
      setSecondsLeft(300);
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  const selectedMethod = methods.find((m) => String(m.id) === String(selectedMethodId)) || methods[0];

  const handleCopyNumber = () => {
    if (!selectedMethod?.number) return;
    navigator.clipboard.writeText(selectedMethod.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');
    const num = parseFloat(amount);
    if (isNaN(num) || num < 100) {
      setError('নূন্যতম ডিপোজিট পরিমাণ ৳১০০');
      return;
    }
    if (!selectedMethod) {
      setError('অনুগ্রহ করে একটি পেমেন্ট মাধ্যম নির্বাচন করুন');
      return;
    }
    setStep(2);
  };

  const handleConfirmDeposit = async (e) => {
    e.preventDefault();
    setError('');

    if (!trxId.trim()) {
      setError('অনুগ্রহ করে লেনদেন আইডি (TrxID) লিখুন!');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitDeposit(accessToken, {
        provider: selectedMethod.provider,
        walletNumberId: selectedMethod.id,
        amount: parseFloat(amount),
        transactionId: trxId.trim().toUpperCase(),
      });

      // Reset step & fields
      setStep(1);
      setTrxId('');
      setAmount('500');

      // Switch to Requests tab and show success banner
      setActiveTab('requests');
      setSuccessBanner(
        'আপনার ডিপোজিট অনুরোধটি সফলভাবে জমা হয়েছে! এজেন্সি অ্যাডমিন যাচাই করে অনুমোদন করলে অ্যাকাউন্টে ব্যালেন্স যুক্ত হবে।',
      );
      loadUserRequests();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ডিপোজিট প্রক্রিয়া ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetupWithdrawal = async (e) => {
    e.preventDefault();
    setError('');

    if (!setupAccountNumber.trim()) {
      setError('অনুগ্রহ করে আপনার ওয়ালেট নম্বর লিখুন');
      return;
    }
    if (!setupPassword) {
      setError('উত্তোলন পাসওয়ার্ড দিন');
      return;
    }
    if (setupPassword !== setupConfirmPassword) {
      setError('পাসওয়ার্ড দুটি মিলছে না');
      return;
    }

    setIsSubmittingSetup(true);
    try {
      await api.setupWithdrawalAccount(accessToken, {
        provider: selectedWithdrawMethod,
        accountNumber: setupAccountNumber.trim(),
        accountGroup: setupAccountGroup,
        withdrawalPassword: setupPassword,
        confirmPassword: setupConfirmPassword,
      });

      setSuccessBanner(`${selectedWithdrawMethod.toUpperCase()} অ্যাকাউন্ট সফলভাবে সেটআপ করা হয়েছে!`);
      setSetupAccountNumber('');
      setSetupPassword('');
      setSetupConfirmPassword('');
      loadWithdrawalAccounts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'অ্যাকাউন্ট সেটআপ ব্যর্থ হয়েছে');
    } finally {
      setIsSubmittingSetup(false);
    }
  };

  const handleRefreshBalance = async () => {
    setIsRefreshingBalance(true);
    try {
      await refreshUser?.();
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  const handleConfirmWithdrawal = async () => {
    setError('');
    setSuccessBanner('');

    setIsSubmittingWithdrawal(true);
    try {
      // 1. Check user restriction immediately when user tries to confirm withdrawal
      const restriction = await api.getMyRestriction(accessToken);
      if (restriction && restriction.message) {
        setRestrictionModal({
          isOpen: true,
          message: restriction.message,
        });
        setIsSubmittingWithdrawal(false);
        return;
      }

      // 2. Validate current method's configured withdrawal account
      const activeAccount = withdrawalAccounts.find(
        (acc) => acc.provider === selectedWithdrawMethod,
      );
      if (!activeAccount) {
        setError('অনুগ্রহ করে প্রথমে উত্তোলন অ্যাকাউন্ট সেটআপ করুন।');
        setIsSubmittingWithdrawal(false);
        return;
      }

      if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
        setError('অনুগ্রহ করে সঠিক উত্তোলনের পরিমাণ লিখুন।');
        setIsSubmittingWithdrawal(false);
        return;
      }

      if (!withdrawTxPassword) {
        setError('অনুগ্রহ করে আপনার লেনদেন পাসওয়ার্ড লিখুন।');
        setIsSubmittingWithdrawal(false);
        return;
      }

      // 3. Submit withdrawal request to backend
      const res = await api.submitWithdrawal(accessToken, {
        provider: selectedWithdrawMethod,
        accountNumber: activeAccount.accountNumber,
        amount: withdrawAmount,
        withdrawalPassword: withdrawTxPassword,
      });

      setSuccessBanner(res?.message || 'উত্তোলন অনুরোধ সফলভাবে জমা দেওয়া হয়েছে।');
      setWithdrawAmount('');
      setWithdrawTxPassword('');
      handleRefreshBalance();
      loadUserRequests();
    } catch (err) {
      if (err.isRestricted || err.data?.isRestricted) {
        setRestrictionModal({
          isOpen: true,
          message: err.data?.message || err.message,
        });
      } else {
        setError(err instanceof ApiError ? err.message : 'উত্তোলন প্রক্রিয়াকরণে সমস্যা হয়েছে।');
      }
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const formatMaskedNumber = (num) => {
    if (!num) return '*******';
    if (num.length <= 4) return num;
    const last4 = num.slice(-4);
    return `*******${last4}`;
  };

  const currentWithdrawalAccount = withdrawalAccounts.find(
    (acc) => acc.provider === selectedWithdrawMethod,
  );

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const providerMeta = selectedMethod
    ? PROVIDER_INFO[selectedMethod.provider] || PROVIDER_INFO.bkash
    : PROVIDER_INFO.bkash;

  const accountTypeBangla = selectedMethod
    ? ACCOUNT_TYPE_LABELS[selectedMethod.accountType || selectedMethod.account_type] || 'ক্যাশআউট'
    : 'ক্যাশআউট';

  const filteredRequests = userRequests.filter((r) => {
    if (requestFilter === 'deposit') return (r.type || 'deposit') === 'deposit';
    if (requestFilter === 'withdraw') return r.type === 'withdraw';
    return true;
  });

  return (
    <div className="wallet-container">
      <h1 className="u-page-title">Wallet</h1>

      {/* Tabs: Deposit, Withdraw, Requests */}
      <div className="wallet-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'deposit'}
          className={`wallet-tab-btn${activeTab === 'deposit' ? ' active' : ''}`}
          onClick={() => {
            setActiveTab('deposit');
            setSuccessBanner('');
            setError('');
          }}
        >
          ডিপোজিট
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'withdraw'}
          className={`wallet-tab-btn${activeTab === 'withdraw' ? ' active' : ''}`}
          onClick={() => {
            setActiveTab('withdraw');
            setSuccessBanner('');
            setError('');
          }}
        >
          উইথড্র
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'requests'}
          className={`wallet-tab-btn${activeTab === 'requests' ? ' active' : ''}`}
          onClick={() => {
            setActiveTab('requests');
            setSuccessBanner('');
            setError('');
            loadUserRequests();
          }}
        >
          রিকোয়েস্ট
          {userRequests.filter((r) => r.status === 'pending').length > 0 && (
            <span
              style={{
                background: '#ff5c72',
                color: '#ffffff',
                borderRadius: '50%',
                padding: '1px 6px',
                fontSize: 11,
                marginLeft: 6,
              }}
            >
              {userRequests.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {successBanner && (
        <div className="success-message" style={{ marginBottom: 16 }}>
          {successBanner}
        </div>
      )}

      {error && (
        <div className="error-message" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ─── WITHDRAW TAB ─── */}
      {activeTab === 'withdraw' && (
        <div className="withdraw-container">
          {/* 3 Provider Sub-Tabs: bkash, nagad, rocket */}
          <div className="withdraw-subtabs-nav">
            <button
              type="button"
              className={`withdraw-subtab-btn bkash${
                selectedWithdrawMethod === 'bkash' ? ' active' : ''
              }`}
              onClick={() => {
                setSelectedWithdrawMethod('bkash');
                setError('');
                setSuccessBanner('');
              }}
            >
              bKash
            </button>
            <button
              type="button"
              className={`withdraw-subtab-btn nagad${
                selectedWithdrawMethod === 'nagad' ? ' active' : ''
              }`}
              onClick={() => {
                setSelectedWithdrawMethod('nagad');
                setError('');
                setSuccessBanner('');
              }}
            >
              Nagad
            </button>
            <button
              type="button"
              className={`withdraw-subtab-btn rocket${
                selectedWithdrawMethod === 'rocket' ? ' active' : ''
              }`}
              onClick={() => {
                setSelectedWithdrawMethod('rocket');
                setError('');
                setSuccessBanner('');
              }}
            >
              Rocket
            </button>
          </div>

          {isLoadingWithdrawalAccounts ? (
            <div className="u-loading-state">
              <span className="u-loading-spinner" />
              <span>তথ্য লোড হচ্ছে…</span>
            </div>
          ) : !currentWithdrawalAccount ? (
            /* ──── STATE A: Setup Screen ──── */
            <div className="u-card withdraw-setup-card">
              <div className="withdraw-setup-header">
                <h3>{selectedWithdrawMethod.toUpperCase()} অ্যাকাউন্ট সেটআপ</h3>
                <p>
                  আপনার {selectedWithdrawMethod.toUpperCase()} ওয়ালেট নম্বর এবং উত্তোলন পাসওয়ার্ড সেট করুন।
                  একবার জমা দিলে পরবর্তীতে আর সেটআপ করতে হবে না।
                </p>
              </div>

              <form onSubmit={handleSetupWithdrawal} className="withdraw-setup-form">
                <div className="withdraw-form-group">
                  <label className="withdraw-form-label">
                    ই-ওয়ালেট গ্রুপ নির্বাচন করুন
                  </label>
                  <select
                    className="withdraw-select-input"
                    value={setupAccountGroup}
                    onChange={(e) => setSetupAccountGroup(e.target.value)}
                  >
                    <option value="Personal">Personal (ব্যক্তিগত)</option>
                    <option value="Agent">Agent (এজেন্ট)</option>
                    <option value="Merchant">Merchant (মার্চেন্ট)</option>
                  </select>
                </div>

                <div className="withdraw-form-group">
                  <label className="withdraw-form-label">
                    {selectedWithdrawMethod.toUpperCase()} নম্বর
                  </label>
                  <input
                    type="text"
                    className="withdraw-text-input"
                    placeholder="01XXXXXXXXX"
                    value={setupAccountNumber}
                    onChange={(e) => setSetupAccountNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="withdraw-form-group">
                  <label className="withdraw-form-label">উত্তোলন পাসওয়ার্ড দিন</label>
                  <input
                    type="password"
                    className="withdraw-text-input"
                    placeholder="পাসওয়ার্ড দিন (কমপক্ষে ৪ অক্ষর)"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="withdraw-form-group">
                  <label className="withdraw-form-label">পাসওয়ার্ড নিশ্চিত করুন</label>
                  <input
                    type="password"
                    className="withdraw-text-input"
                    placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                    value={setupConfirmPassword}
                    onChange={(e) => setSetupConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="withdraw-submit-btn"
                  disabled={isSubmittingSetup}
                >
                  {isSubmittingSetup ? 'সংরক্ষণ হচ্ছে…' : 'জমা দিন'}
                </button>
              </form>
            </div>
          ) : (
            /* ──── STATE B: Setup Completed Dashboard ──── */
            <div className="withdraw-dashboard-content">
              {/* Branded Card with Watermark */}
              <div
                className={`withdrawal-account-card withdrawal-card-${selectedWithdrawMethod}`}
              >
                <div className="account-card-header">
                  <div className="account-card-badge">
                    <span className="account-card-logo-dot" />
                    <span className="account-card-brand">
                      {selectedWithdrawMethod.toUpperCase()}
                    </span>
                  </div>
                  <span className="account-card-group-pill">
                    {currentWithdrawalAccount.accountGroup || 'E-Wallet'}
                  </span>
                </div>

                <div className="account-card-number">
                  {formatMaskedNumber(currentWithdrawalAccount.accountNumber)}
                </div>

                <div className="account-card-footer">
                  <span className="account-card-date">
                    {currentWithdrawalAccount.createdAt
                      ? new Date(currentWithdrawalAccount.createdAt).toLocaleDateString()
                      : '—'}
                  </span>
                  <span className="account-card-status">সংযুক্ত রয়েছে ✓</span>
                </div>
              </div>

              {/* Selected E-Wallet Label & Add Icon */}
              <div className="selected-ewallet-row">
                <span className="selected-ewallet-text">
                  নির্বাচিত ই-ওয়ালেট (১/১০)
                </span>
                <button
                  type="button"
                  className="add-ewallet-btn"
                  title="নতুন ওয়ালেট যোগ করুন"
                  onClick={() => {
                    setSetupAccountNumber('');
                    setSetupPassword('');
                    setSetupConfirmPassword('');
                  }}
                >
                  +
                </button>
              </div>

              <div className="withdraw-divider-line" />

              {/* 24h Notice */}
              <div className="withdraw-timing-row">
                <span className="timing-bullet">•</span>
                <span>উত্তোলন সময়: 24 ঘণ্টা</span>
              </div>

              {/* Green Checkmark Banking Guidelines Box */}
              <div className="withdrawal-guidelines-box">
                <div className="guidelines-header">
                  <span className="guidelines-check-icon">✓</span>
                  <span className="guidelines-title">ব্যাংকিং নির্দেশিকা</span>
                </div>
                <div className="guidelines-text">
                  দিনিক উত্তোলন 99 বার, অর্থপ্রদান উত্তোলন 99 বার। প্রধান ওয়ালেট: ৳ 0
                </div>
              </div>

              {/* Balance Display with Refresh Button */}
              <div className="withdraw-balance-row">
                <span className="withdraw-balance-label">
                  উপলব্ধ পরিমাণ: ৳{' '}
                  {user?.balance ? parseFloat(user.balance).toLocaleString() : '0.00'}
                </span>
                <button
                  type="button"
                  className="balance-refresh-btn"
                  onClick={handleRefreshBalance}
                  disabled={isRefreshingBalance}
                >
                  🔄 {isRefreshingBalance ? 'রিফ্রেশ হচ্ছে…' : 'আপনার ব্যালেন্স রিফ্রেশ করুন'}
                </button>
              </div>

              {/* Withdrawal Amount Input */}
              <div className="withdraw-form-group">
                <label className="withdraw-form-label">উত্তোলন পরিমাণ</label>
                <div className="withdraw-input-with-symbol">
                  <span className="currency-symbol">৳</span>
                  <input
                    type="number"
                    className="withdraw-amount-input"
                    placeholder="5000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Transaction Password Input */}
              <div className="withdraw-form-group">
                <label className="withdraw-form-label">লেনদেন পাসওয়ার্ড</label>
                <input
                  type="password"
                  className="withdraw-text-input"
                  placeholder="আপনার উত্তোলন পাসওয়ার্ড লিখুন"
                  value={withdrawTxPassword}
                  onChange={(e) => setWithdrawTxPassword(e.target.value)}
                />
              </div>

              {/* Red Confirm Withdrawal Button */}
              <button
                type="button"
                className="confirm-withdrawal-btn"
                disabled={isSubmittingWithdrawal}
                onClick={handleConfirmWithdrawal}
              >
                {isSubmittingWithdrawal ? 'যাচাই করা হচ্ছে…' : 'Confirm Withdrawal'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── REQUESTS TAB (User History) ─── */}
      {activeTab === 'requests' && (
        <div>
          {/* Sub-filter chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              className={`agency-filter-btn${requestFilter === 'all' ? ' active' : ''}`}
              onClick={() => setRequestFilter('all')}
            >
              সকল ({userRequests.length})
            </button>
            <button
              type="button"
              className={`agency-filter-btn${requestFilter === 'deposit' ? ' active' : ''}`}
              onClick={() => setRequestFilter('deposit')}
            >
              ডিপোজিট ({userRequests.filter((r) => (r.type || 'deposit') === 'deposit').length})
            </button>
            <button
              type="button"
              className={`agency-filter-btn${requestFilter === 'withdraw' ? ' active' : ''}`}
              onClick={() => setRequestFilter('withdraw')}
            >
              উইথড্র ({userRequests.filter((r) => r.type === 'withdraw').length})
            </button>
          </div>

          {isLoadingRequests ? (
            <div className="u-card u-empty-state">অনুরোধ তালিকা লোড হচ্ছে…</div>
          ) : filteredRequests.length === 0 ? (
            <div className="u-card u-empty-state">
              <div className="u-empty-state-icon">
                <Icon name="receipt" weight="fill" size={36} />
              </div>
              <div className="u-empty-state-title">কোনো অনুরোধ পাওয়া যায়নি</div>
              আপনি এখনও কোনো ডিপোজিট বা উইথড্র অনুরোধ করেননি।
              <button
                type="button"
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 20px', marginTop: 12 }}
                onClick={() => setActiveTab('deposit')}
              >
                ডিপোজিট করুন ➔
              </button>
            </div>
          ) : (
            <div className="requests-list">
              {filteredRequests.map((req) => {
                const statusMeta = STATUS_MAP[req.status] || STATUS_MAP.pending;
                const reqType = req.type || 'deposit';
                return (
                  <div key={req.id} className="request-card">
                    <div className="request-card-header">
                      <div className="request-tag-group">
                        <span className={`tag-badge ${reqType}`}>
                          {reqType === 'deposit' ? 'ডিপোজিট' : 'উইথড্র'}
                        </span>
                        <span
                          className={`request-provider-badge badge-${req.provider || 'bkash'}`}
                        >
                          {req.provider || 'bKash'}
                        </span>
                      </div>
                      <span className={`status-badge ${statusMeta.class}`}>
                        {statusMeta.icon} {statusMeta.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontSize: 12, color: 'var(--t3)' }}>পরিমাণ</span>
                        <div className="request-amount-large">৳{parseFloat(req.amount).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--t3)' }}>
                        {formatDate(req.createdAt)}
                      </div>
                    </div>

                    <div className="request-details-grid">
                      <div className="request-detail-item">
                        <strong>TrxID / রেফারেন্স</strong>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {req.transactionId || '—'}
                        </span>
                      </div>
                      <div className="request-detail-item">
                        <strong>স্ট্যাটাস নোট</strong>
                        <span>
                          {req.status === 'approved'
                            ? 'অ্যাকাউন্টে ব্যালেন্স যুক্ত হয়েছে'
                            : req.status === 'rejected'
                              ? 'অনুরোধটি বাতিল করা হয়েছে'
                              : 'অ্যাডমিন অনুমোদনের অপেক্ষায়'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── DEPOSIT TAB ─── */}
      {activeTab === 'deposit' && (
        <>
          {isLoadingMethods ? (
            <div className="u-card u-empty-state">পেমেন্ট মাধ্যম লোড হচ্ছে…</div>
          ) : methods.length === 0 ? (
            <div className="u-card u-empty-state">
              <div className="u-empty-state-icon">
                <Icon name="warning-circle" weight="fill" size={36} />
              </div>
              <div className="u-empty-state-title">পেমেন্ট মাধ্যম অনুপস্থিত</div>
              আপনার এজেন্সির কোনো সক্রিয় পেমেন্ট মাধ্যম পাওয়া যায়নি। অনুগ্রহ করে আপনার এজেন্সির
              সাথে যোগাযোগ করুন।
            </div>
          ) : (
            <>
              {/* ═════════ STEP 1: METHOD & AMOUNT SELECTION ═════════ */}
              {step === 1 && (
                <div className="u-card">
                  <div className="section-subtitle">পেমেন্ট মাধ্যম নির্বাচন করুন</div>
                  <div className="method-selector-grid">
                    {methods.map((method) => {
                      const meta = PROVIDER_INFO[method.provider] || PROVIDER_INFO.bkash;
                      const isSelected = String(method.id) === String(selectedMethodId);
                      return (
                        <button
                          key={method.id}
                          type="button"
                          className={`method-card-btn${isSelected ? ' selected' : ''}`}
                          onClick={() => setSelectedMethodId(method.id)}
                        >
                          <div className={`method-icon-circle ${meta.bannerClass}`}>
                            {meta.iconLetter}
                          </div>
                          <div className="method-name">{meta.label}</div>
                          <div className="method-type-badge">
                            {ACCOUNT_TYPE_LABELS[method.accountType || method.account_type] ||
                              method.accountType}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="section-subtitle">ডিপোজিট পরিমাণ</div>
                  <div className="amount-input-wrapper">
                    <span className="amount-currency-symbol">৳</span>
                    <input
                      type="number"
                      min="100"
                      step="50"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="amount-input-box"
                      placeholder="500"
                      required
                    />
                  </div>

                  <div className="section-subtitle">দ্রুত নির্বাচন</div>
                  <div className="quick-amounts-grid">
                    {QUICK_AMOUNTS.map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`quick-amount-chip${String(amount) === String(val) ? ' active' : ''}`}
                        onClick={() => setAmount(String(val))}
                      >
                        ৳{val.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    style={{ marginTop: 8 }}
                    onClick={handleNextStep}
                  >
                    পরবর্তী (Next) ➔
                  </button>
                </div>
              )}

              {/* ═════════ STEP 2: PAYMENT & CONFIRMATION (MATCHES SCREENSHOT) ═════════ */}
              {step === 2 && selectedMethod && (
                <div className="screenshot-card">
                  {/* ওয়ালেট নম্বর * */}
                  <div className="screenshot-header-title">
                    ওয়ালেট নম্বর <span className="star">*</span>
                  </div>
                  <div className="screenshot-header-sub">
                    এই {providerMeta.bangla} নম্বরটি শুধুমাত্র {accountTypeBangla} গ্রহণ করে।
                  </div>

                  {/* Wallet Number Box with Copy Icon */}
                  <div className="wallet-number-display-box">
                    <span className="wallet-number-text">{selectedMethod.number}</span>
                    <button
                      type="button"
                      className="wallet-copy-btn"
                      title="Copy Number"
                      onClick={handleCopyNumber}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      {copied && <span className="copied-badge">কপি করা হয়েছে!</span>}
                    </button>
                  </div>

                  {/* ওয়ালেট প্রদানকারী */}
                  <div className="provider-banner-label">ওয়ালেট প্রদানকারী</div>
                  <div className={`provider-banner ${providerMeta.bannerClass}`}>
                    <div className="provider-banner-logo">{providerMeta.iconLetter}</div>
                    <span>{providerMeta.bangla} ডিপোজিট</span>
                  </div>

                  {/* লেনদেন আইডি লিখুন(TrxID প্রয়োজন!) */}
                  <div className="trxid-section-title">
                    লেনদেন আইডি লিখুন<span className="trxid-req">(TrxID প্রয়োজন!)</span>
                  </div>

                  <span
                    className="trxid-guide-link"
                    onClick={() => setShowTrxGuide((prev) => !prev)}
                  >
                    TrxID কিভাবে পাবেন তা দেখতে ক্লিক করুন
                  </span>

                  {showTrxGuide && (
                    <div
                      style={{
                        background: '#f8f9fa',
                        border: '1px solid #e0e0e0',
                        borderRadius: 8,
                        padding: '12px 14px',
                        fontSize: 12,
                        color: '#444',
                        marginBottom: 16,
                      }}
                    >
                      <strong>কিভাবে TrxID পাবেন:</strong>
                      <ol style={{ paddingLeft: 18, marginTop: 6, lineHeight: 1.6 }}>
                        <li>
                          আপনার {providerMeta.label} অ্যাপ বা *247# / *167# দিয়ে উপরের নম্বরে ৳
                          {parseFloat(amount || 0).toLocaleString()} {accountTypeBangla} করুন।
                        </li>
                        <li>লেনদেন সম্পন্ন হওয়ার পর প্রাপ্ত SMS বা স্টেটমেন্ট থেকে TrxID কপি করুন।</li>
                        <li>নিচের বক্সে TrxID লিখে "নিশ্চিত করুন" বাটনে চাপ দিন।</li>
                      </ol>
                    </div>
                  )}

                  {/* TrxID Input Container with Floating Tag and পরিবর্তন Button */}
                  <div className="trxid-input-container">
                    <span className="floating-tag">TrxID প্রয়োজন!</span>
                    <input
                      type="text"
                      className="trxid-text-input"
                      placeholder="TrxID লিখুন"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="trxid-change-btn"
                      onClick={() => setStep(1)}
                      title="পদ্ধতি বা পরিমাণ পরিবর্তন করুন"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                      পরিবর্তন
                    </button>
                  </div>

                  {/* নিশ্চিত করুন Button */}
                  <button
                    type="button"
                    className="confirm-deposit-btn"
                    disabled={isSubmitting || !trxId.trim()}
                    onClick={handleConfirmDeposit}
                  >
                    {isSubmitting ? 'যাচাই করা হচ্ছে…' : 'নিশ্চিত করুন'}
                  </button>

                  {/* 4-Item Method Types Bar */}
                  <div className="method-types-bar">
                    <div
                      className={`method-type-item${
                        selectedMethod.accountType === 'personal' ? ' active' : ''
                      }`}
                    >
                      <span className="method-type-icon">✈️</span>
                      <span>সেন্ড মানি</span>
                    </div>

                    <div className="method-type-item">
                      <span className="method-type-icon">📱</span>
                      <span>মোবাইল রিচার্জ</span>
                    </div>

                    <div
                      className={`method-type-item${
                        selectedMethod.accountType === 'agent' ? ' active' : ''
                      }`}
                    >
                      <span className="method-type-icon">💵</span>
                      <span>ক্যাশ আউট</span>
                    </div>

                    <div
                      className={`method-type-item${
                        selectedMethod.accountType === 'merchant' ? ' active' : ''
                      }`}
                    >
                      <span className="method-type-icon">🛍️</span>
                      <span>পেমেন্ট</span>
                    </div>
                  </div>

                  {/* Countdown Timer */}
                  <div className="cashout-timer-section">
                    <div className="cashout-timer-label">{accountTypeBangla}</div>
                    <div className="cashout-timer-clock">বাকি সময় {formatTimer(secondsLeft)}</div>
                  </div>

                  {/* সতর্কতা Section */}
                  <div className="warning-notice-box">
                    <div className="warning-title">সতর্কতাঃ</div>
                    <div className="warning-highlight">
                      লেনদেন আইডি সঠিকভাবে পূরণ করতে হবে, অন্যথায় স্কোর ব্যর্থ হবে!
                    </div>
                    <div>
                      অনুগ্রহ করে নিশ্চিত হয়ে নিন যে আপনি {providerMeta.bangla} deposit ওয়ালেট
                      নাম্বারে {accountTypeBangla} করছেন। এই নাম্বারে অন্য কোনো ওয়ালেট থেকে{' '}
                      {accountTypeBangla} করলে সেই টাকা পাওয়ার কোনো সম্ভাবনা নাই।
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── RESTRICTION WARNING POPUP MODAL ─── */}
      {restrictionModal.isOpen && (
        <div
          className="restriction-modal-overlay"
          onClick={() => setRestrictionModal({ isOpen: false, message: '' })}
        >
          <div
            className="restriction-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restriction-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="restriction-modal-close"
              onClick={() => setRestrictionModal({ isOpen: false, message: '' })}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="restriction-modal-icon-wrap">
              <div className="restriction-modal-icon-glow" />
              <div className="restriction-modal-icon">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>

            <h3 className="restriction-modal-title" id="restriction-modal-title">
              উত্তোলন সীমাবদ্ধ
            </h3>

            <div className="restriction-modal-message-box">
              <div className="restriction-modal-badge">
                <span>⚠️</span> সতর্কতা নোটিশ
              </div>
              <p className="restriction-modal-message-text">
                {restrictionModal.message}
              </p>
            </div>

            <p className="restriction-modal-hint">
              আপনার অ্যাকাউন্টে উত্তোলনের সাময়িক সীমাবদ্ধতা রয়েছে। বিস্তারিত জানতে এজেন্সির সাথে যোগাযোগ করুন।
            </p>

            <button
              type="button"
              className="restriction-modal-btn"
              onClick={() => setRestrictionModal({ isOpen: false, message: '' })}
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
