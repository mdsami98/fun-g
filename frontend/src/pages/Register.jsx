import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../api/client';
import { FormAlert, FormField } from '../components/FormField';
import { Icon } from '../components/Icon';
import { firstInvalid, PASSWORD_MIN, validateRegister } from '../lib/validation';
import '../styles/userTheme.css';

/* Visual order = focus order for "first invalid field". */
const FIELDS = ['name', 'phone', 'agencyCode', 'password', 'confirmPassword'];

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRef = (searchParams.get('ref') || searchParams.get('code') || '').trim().toUpperCase();

  const [values, setValues] = useState({
    name: '',
    phone: '',
    agencyCode: '',
    referralCode: initialRef,
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralMeta, setReferralMeta] = useState(null);
  const [referralError, setReferralError] = useState('');

  const refs = {
    name: useRef(null),
    phone: useRef(null),
    agencyCode: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null),
  };

  useEffect(() => {
    if (!initialRef) return;

    api
      .validateReferralCode(initialRef)
      .then((data) => {
        setReferralMeta(data);
        setReferralError('');
        setValues((prev) => ({
          ...prev,
          agencyCode: data.agencyCode || prev.agencyCode,
          referralCode: initialRef,
        }));
      })
      .catch((err) => {
        setReferralMeta(null);
        setReferralError(err.message || 'Invalid or expired referral link');
      });
  }, [initialRef]);

  const errors = validateRegister(values);
  const errorFor = (field) => (touched[field] || submitted ? errors[field] : undefined);

  const bind = (field) => ({
    value: values[field],
    onChange: (e) => setValues((prev) => ({ ...prev, [field]: e.target.value })),
    onBlur: () => setTouched((prev) => ({ ...prev, [field]: true })),
    inputRef: refs[field],
    error: errorFor(field),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setServerError('');

    const invalid = firstInvalid(errors, FIELDS);
    if (invalid) {
      refs[invalid].current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: values.name.trim(),
        phone: values.phone.trim(),
        agencyCode: values.agencyCode.trim().toUpperCase(),
        password: values.password,
        ...(values.referralCode.trim() ? { referralCode: values.referralCode.trim().toUpperCase() } : {}),
      });
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="user-shell">
      <div className="user-shell-inner">
        <main className="u-auth-page">
          <div className="u-auth-card">
            <div className="u-auth-header">
              <h1 className="u-auth-logo">
                <Icon name="game-controller" weight="fill" size={30} />
                AVIATOR
              </h1>
              <div className="u-auth-subtitle">Create your account</div>
            </div>

            <div className="u-auth-content">
              <FormAlert>{serverError}</FormAlert>

              {referralMeta && (
                <div
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid #22c55e',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 16,
                    color: '#4ade80',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Icon name="check-circle" size={18} />
                  <span>
                    Referred by a friend! Auto-linked to <strong>{referralMeta.agencyName}</strong>
                  </span>
                </div>
              )}

              {referralError && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid #ef4444',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 16,
                    color: '#f87171',
                    fontSize: 13,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Icon name="warning" size={18} />
                  <span>{referralError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <FormField
                  id="name"
                  label="Full name"
                  autoComplete="name"
                  autoCapitalize="words"
                  placeholder="Your name"
                  {...bind('name')}
                />
                <FormField
                  id="phone"
                  label="Phone number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+8801712345678"
                  hint="10–15 digits, optionally starting with +"
                  {...bind('phone')}
                />
                <FormField
                  id="agencyCode"
                  label="Agency code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder="e.g. SUN-01"
                  hint="Ask your agency for this code"
                  {...bind('agencyCode')}
                />
                <FormField
                  id="referralCode"
                  label="Referral code"
                  optional
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder="If you have one"
                  value={values.referralCode}
                  onChange={(e) => setValues((prev) => ({ ...prev, referralCode: e.target.value }))}
                />
                <FormField
                  id="password"
                  label="Create password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={`At least ${PASSWORD_MIN} characters`}
                  {...bind('password')}
                />
                <FormField
                  id="confirmPassword"
                  label="Confirm password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  {...bind('confirmPassword')}
                />

                <button type="submit" className="u-auth-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account…' : 'Create account'}
                </button>
              </form>

              <div className="u-auth-switch">
                Already have an account? <Link to="/login">Log in</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
