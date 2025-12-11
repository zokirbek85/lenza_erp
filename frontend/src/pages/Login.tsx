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
      <div className="glass-card w-full max-w-md p-8 text-white animate-scaleIn">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.5em] text-slate-300">{t('app.title')}</p>
          <h1 className="text-3xl font-semibold gradient-text">{t('auth.signIn')}</h1>
          <p className="text-sm text-slate-200">{t('auth.continue')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-label text-slate-200" htmlFor="username">
              {t('auth.username')}
            </label>
            <input
              id="username"
              type="text"
              className="input-field mt-2 w-full border-white/20 bg-white/10 text-white placeholder:text-slate-300 focus:border-amber-400"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoComplete="username"
            />
          </div>
          
          <div>
            <label className="text-label text-slate-200" htmlFor="password">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              className="input-field mt-2 w-full border-white/20 bg-white/10 text-white placeholder:text-slate-300 focus:border-amber-400"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          
          {activeErrorKey && (
            <div
              role="alert"
              className="card border-rose-400/60 bg-rose-500/10 text-sm font-medium text-rose-100 animate-fadeInUp"
            >
              {t(activeErrorKey)}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full bg-amber-400 text-slate-900 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="spinner" />
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