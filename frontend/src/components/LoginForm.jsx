import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { FormAlert, FormField } from './FormField';
import { Icon } from './Icon';
import { firstInvalid, validateLogin } from '../lib/validation';
import '../styles/userTheme.css';

const LOGIN_FIELDS = ['phone', 'password'];

/**
 * User-panel login (variant="light"): design-system form — inline field
 * errors on blur/submit, focus to the first invalid field, server errors
 * announced in an alert, password show/hide, autofill hints.
 */
function UserLoginForm({ logo, title, allowedRoles, homePath, registerLink }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ phone: '', password: '' });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);
  const refs = { phone: phoneRef, password: passwordRef };

  const errors = validateLogin(values);
  const errorFor = (field) => (touched[field] || submitted ? errors[field] : undefined);

  const bind = (field) => ({
    value: values[field],
    onChange: (e) => setValues((prev) => ({ ...prev, [field]: e.target.value })),
    onBlur: () => setTouched((prev) => ({ ...prev, [field]: true })),
    inputRef: refs[field],
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setServerError('');

    const invalid = firstInvalid(errors, LOGIN_FIELDS);
    if (invalid) {
      refs[invalid].current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await login(values.phone.trim(), values.password, allowedRoles);
      navigate(homePath, { replace: true });
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
                {logo}
              </h1>
              <div className="u-auth-subtitle">{title}</div>
            </div>

            <div className="u-auth-content">
              <FormAlert>{serverError}</FormAlert>

              <form onSubmit={handleSubmit} noValidate>
                <FormField
                  id="phone"
                  label="Phone number"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+8801712345678"
                  error={errorFor('phone')}
                  {...bind('phone')}
                />
                <FormField
                  id="password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  error={errorFor('password')}
                  {...bind('password')}
                />

                <button type="submit" className="u-auth-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Logging in…' : 'Log in'}
                </button>
              </form>

              {registerLink && (
                <div className="u-auth-switch">
                  Don't have an account? <Link to={registerLink}>Register now</Link>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function LoginForm({ logo, title, allowedRoles, homePath, registerLink, variant = 'dark' }) {
  if (variant === 'light') {
    return (
      <UserLoginForm
        logo={logo}
        title={title}
        allowedRoles={allowedRoles}
        homePath={homePath}
        registerLink={registerLink}
      />
    );
  }
  return (
    <AdminLoginForm
      logo={logo}
      title={title}
      allowedRoles={allowedRoles}
      homePath={homePath}
      registerLink={registerLink}
    />
  );
}

/* Admin / agency login (dark admin theme, theme.css) — unchanged. */
function AdminLoginForm({ logo, title, allowedRoles, homePath, registerLink }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cls = {
    page: 'auth-page',
    card: 'auth-card',
    header: 'auth-header',
    logo: 'auth-logo',
    subtitle: 'auth-subtitle',
    content: 'auth-content',
    error: 'error-message',
    formGroup: 'form-group',
    label: 'label',
    input: undefined,
    btn: 'btn-primary',
    switchRow: 'auth-switch',
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!phone || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(phone, password, allowedRoles);
      navigate(homePath, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const card = (
    <div className={cls.card}>
      <div className={cls.header}>
        <div className={cls.logo}>{logo}</div>
        <div className={cls.subtitle}>{title}</div>
      </div>

      <div className={cls.content}>
        {error && <div className={cls.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={cls.formGroup}>
            <label className={cls.label} htmlFor="phone">
              📱 Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              className={cls.input}
              placeholder="+88017XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className={cls.formGroup}>
            <label className={cls.label} htmlFor="password">
              🔐 Password
            </label>
            <input
              id="password"
              type="password"
              className={cls.input}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className={cls.formGroup}>
            <button type="submit" className={cls.btn} disabled={isSubmitting}>
              {isSubmitting ? 'Logging in…' : 'Login'}
            </button>
          </div>
        </form>

        {registerLink && (
          <div className={cls.switchRow}>
            Don't have an account? <Link to={registerLink}>Register Now</Link>
          </div>
        )}
      </div>
    </div>
  );

  return <div className={cls.page}>{card}</div>;
}
