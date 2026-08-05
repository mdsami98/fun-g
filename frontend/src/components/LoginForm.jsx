import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import '../styles/userTheme.css';

export function LoginForm({ logo, title, allowedRoles, homePath, registerLink, variant = 'dark' }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLight = variant === 'light';
  const cls = {
    page: isLight ? 'u-auth-page' : 'auth-page',
    card: isLight ? 'u-auth-card' : 'auth-card',
    header: isLight ? 'u-auth-header' : 'auth-header',
    logo: isLight ? 'u-auth-logo' : 'auth-logo',
    subtitle: isLight ? 'u-auth-subtitle' : 'auth-subtitle',
    content: isLight ? 'u-auth-content' : 'auth-content',
    error: isLight ? 'u-auth-error' : 'error-message',
    formGroup: isLight ? 'u-form-group' : 'form-group',
    label: isLight ? 'u-label' : 'label',
    input: isLight ? 'u-input' : undefined,
    btn: isLight ? 'u-auth-btn-primary' : 'btn-primary',
    switchRow: isLight ? 'u-auth-switch' : 'auth-switch',
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

  if (!isLight) {
    return <div className={cls.page}>{card}</div>;
  }

  return (
    <div className="user-shell">
      <div className="user-shell-inner">
        <div className={cls.page}>{card}</div>
      </div>
    </div>
  );
}
