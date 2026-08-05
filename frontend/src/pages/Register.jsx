import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import '../styles/userTheme.css';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    agencyCode: '',
    referralCode: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name || !form.phone || !form.agencyCode || !form.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: form.name,
        phone: form.phone,
        agencyCode: form.agencyCode.toUpperCase(),
        password: form.password,
        ...(form.referralCode ? { referralCode: form.referralCode.toUpperCase() } : {}),
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="user-shell">
      <div className="user-shell-inner">
        <div className="u-auth-page">
          <div className="u-auth-card">
            <div className="u-auth-header">
              <div className="u-auth-logo">🎮 AVIATOR</div>
              <div className="u-auth-subtitle">Create Your Account</div>
            </div>

            <div className="u-auth-content">
              {error && <div className="u-auth-error">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="u-form-group">
                  <label className="u-label" htmlFor="name">
                    👤 Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="u-input"
                    placeholder="Your name"
                    value={form.name}
                    onChange={update('name')}
                    required
                  />
                </div>

                <div className="u-form-group">
                  <label className="u-label" htmlFor="phone">
                    📱 Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className="u-input"
                    placeholder="+88017XXXXXXXX"
                    value={form.phone}
                    onChange={update('phone')}
                    required
                  />
                  <div className="u-input-hint">Format: +88017XXXXXXXX or 017XXXXXXXX</div>
                </div>

                <div className="u-form-group">
                  <label className="u-label" htmlFor="agencyCode">
                    🏢 Agency Code
                  </label>
                  <input
                    id="agencyCode"
                    type="text"
                    className="u-input"
                    placeholder="Enter agency code"
                    value={form.agencyCode}
                    onChange={update('agencyCode')}
                    required
                  />
                  <div className="u-input-hint">Ask your agency for the unique code</div>
                </div>

                <div className="u-form-group">
                  <label className="u-label" htmlFor="referralCode">
                    💎 Referral Code <span className="u-label-optional">(Optional)</span>
                  </label>
                  <input
                    id="referralCode"
                    type="text"
                    className="u-input"
                    placeholder="Referral code (if you have one)"
                    value={form.referralCode}
                    onChange={update('referralCode')}
                  />
                </div>

                <div className="u-form-group">
                  <label className="u-label" htmlFor="password">
                    🔐 Create Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="u-input"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={update('password')}
                    minLength={8}
                    required
                  />
                </div>

                <div className="u-form-group">
                  <label className="u-label" htmlFor="confirmPassword">
                    🔐 Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="u-input"
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={update('confirmPassword')}
                    required
                  />
                </div>

                <button type="submit" className="u-auth-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account…' : 'Create Account'}
                </button>
              </form>

              <div className="u-auth-switch">
                Already have an account? <Link to="/login">Login</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
