import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuthStore, type UserRole } from '../auth/useAuthStore';

const ROLE_ROUTES: Partial<Record<UserRole, string>> = {
  admin: '/kpi/owner',
  owner: '/kpi/owner',
  accountant: '/kpi/owner',
  sales: '/kpi/manager',
  warehouse: '/kpi/warehouse',
};

const KpiPage = () => {
  const { t } = useTranslation(['kpi', 'common']);
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.role);

  useEffect(() => {
    if (!role) return;
    const target = ROLE_ROUTES[role];
    if (target) {
      navigate(target, { replace: true });
    }
  }, [role, navigate]);

  if (!role) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t('kpi.messages.pleaseLogin')}</p>;
  }

  if (!ROLE_ROUTES[role]) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t('kpi.messages.noAccessPage')}</p>;
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:text-slate-400">
      {t('common:messages.loading')}
    </div>
  );
};

export default KpiPage;
