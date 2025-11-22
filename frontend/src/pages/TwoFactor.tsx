import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../auth/useAuthStore';
import { getApiBase } from '../app/apiBase';

const TwoFactor = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pendingCredentials, login, needsOtp, clearOtpChallenge } = useAuthStore();
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!needsOtp || !pendingCredentials) {
      navigate('/login', { replace: true });
    }
  }, [needsOtp, pendingCredentials, navigate]);

  const apiBase = `${getApiBase()}/api`;

  const handleGenerate = async () => {
    if (!pendingCredentials) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.post(
        `${apiBase}/2fa/setup/`,
        {
          username: pendingCredentials.username,
          password: pendingCredentials.password,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      setQrImage(`data:image/png;base64,${response.data.qr}`);
      setMessage(t('auth.qrInstructions'));
    } catch (error) {
      console.error(error);
      setMessage(t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (!pendingCredentials) return;
    setLoading(true);
    setMessage(null);
    try {
      await axios.post(
        `${apiBase}/2fa/verify/`,
        {
          username: pendingCredentials.username,
          password: pendingCredentials.password,
          otp,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      await login({ ...pendingCredentials, otp });
      clearOtpChallenge();
      navigate('/');
    } catch (error) {
      console.error(error);
      setMessage(t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-16 text-white">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
        <h1 className="text-2xl font-semibold">{t('auth.setup2fa')}</h1>
        <p className="text-sm text-slate-200">{t('auth.qrInstructions')}</p>
        <button
          onClick={handleGenerate}
          className="rounded-lg bg-amber-400 px-4 py-2 text-slate-900"
          disabled={loading}
        >
          {t('auth.generateQr')}
        </button>
        {qrImage && (
          <div className="flex justify-center">
            <img src={qrImage} alt="QR code" className="h-48 w-48 rounded-lg border border-white/20 bg-white p-2" />
          </div>
        )}
        <form onSubmit={handleVerify} className="space-y-4">
          <label className="block text-sm font-medium text-slate-200">
            {t('auth.otp')}
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
            />
          </label>
          {message && <p className="text-sm text-rose-300">{message}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-900"
            disabled={loading}
          >
            {t('auth.verifyOtp')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TwoFactor;
