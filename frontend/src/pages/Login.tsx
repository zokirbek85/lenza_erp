import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../auth/useAuthStore';

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
      // Redirect warehouse/sales users to /orders after successful login
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 text-white shadow-2xl backdrop-blur">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.5em] text-slate-300">{t('app.title')}</p>
          <h1 className="text-3xl font-semibold">{t('auth.signIn')}</h1>
          <p className="text-sm text-slate-200">{t('auth.continue')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-200" htmlFor="username">
              {t('auth.username')}
            </label>
            <input
              id="username"
              type="text"
              className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-slate-300 focus:border-amber-400 focus:outline-none"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-200" htmlFor="password">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-slate-300 focus:border-amber-400 focus:outline-none"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {activeErrorKey && (
            <div
              role="alert"
              className="rounded-lg border border-rose-400/60 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100"
            >
              {t(activeErrorKey)}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '...' : t('auth.signIn')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
