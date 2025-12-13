import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../auth/useAuthStore';
import './LoginPremium.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { login, loading, error, isAuthenticated, needsOtp } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    try {
      await login({ username, password });
      const currentRole = useAuthStore.getState().role;
      if (currentRole === 'warehouse' || currentRole === 'sales') {
        navigate('/orders', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (submitError) {
      console.error(submitError);
      setFormError('auth.loginFailed');
    }
  };

  useEffect(() => {
    if (needsOtp) {
      navigate('/2fa');
    }
  }, [needsOtp, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      const currentRole = useAuthStore.getState().role;
      if (currentRole === 'warehouse' || currentRole === 'sales') {
        navigate('/orders', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, navigate]);

  const resolveStoreErrorKey = () => {
    if (!error) return null;
    const lower = error.toLowerCase();
    if (lower.includes('otp code is required')) return 'auth.otpRequired';
    if (lower.includes('invalid otp')) return 'auth.invalidOtp';
    if (lower.includes('2fa setup')) return 'auth.setup2faRequired';
    if (lower.includes('invalid username') || lower.includes('parol')) {
      return 'auth.invalidCredentials';
    }
    if (lower.includes('login failed')) {
      return 'auth.loginFailed';
    }
    return 'auth.unexpectedError';
  };

  const activeErrorKey = formError ?? resolveStoreErrorKey();

  return (
    <div className="login-premium">
      {/* Gold Particles Background */}
      <div className="login-particles">
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
      </div>

      {/* Login Card */}
      <div className="login-card">
        {/* Logo & Header */}
        <div className="login-logo">
          <div className="login-logo-shine">
            <img src="https://erp.lenza.uz/logo-lenza.svg" alt="Lenza Logo" className="login-logo-img" />
          </div>
          <div className="login-divider"></div>
          <h1 className="login-title">{t('auth.signIn')}</h1>
          <p className="login-description">{t('auth.continue')}</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label" htmlFor="username">
              {t('auth.username')}
            </label>
            <input
              id="username"
              type="text"
              className="login-input"
              placeholder={t('auth.username')}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              className="login-input"
              placeholder={t('auth.password')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {activeErrorKey && (
            <div role="alert" className="login-error">
              {t(activeErrorKey)}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-btn"
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div className="login-spinner" />
                <span>{t('common.loading')}</span>
              </div>
            ) : (
              t('auth.signIn')
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;