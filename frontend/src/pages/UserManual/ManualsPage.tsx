import { Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../../hooks/useIsMobile';
import ManualSidebar from './components/ManualSidebar';
import type { ManualNavItem } from './components/ManualSidebar';
import ManualSection from './components/ManualSection';
import type { ManualSectionContent } from './components/ManualSection';
import FaqSection from './components/FaqSection';
import type { ManualFaqItem } from './components/FaqSection';
import OrdersManual from './components/OrdersManual';
import FinanceManual from './components/FinanceManual';
import './UserManual.css';

const { Paragraph } = Typography;

type ManualSections = Record<string, ManualSectionContent>;

const ManualsPage = () => {
  const { t } = useTranslation();
  const { isMobile, isTablet } = useIsMobile();

  const navItems: ManualNavItem[] = useMemo(
    () => [
      { key: 'gettingStarted', label: t('manuals.nav.gettingStarted') },
      { key: 'concepts', label: t('manuals.nav.concepts') },
      { key: 'orders', label: '📦 ' + t('manuals.nav.orders', 'Buyurtmalar (Orders)') },
      { key: 'finance', label: '💰 ' + t('manuals.nav.finance', 'Moliya (Finance)') },
      { key: 'admin', label: t('manuals.nav.admin') },
      { key: 'director', label: t('manuals.nav.director') },
      { key: 'accountant', label: t('manuals.nav.accountant') },
      { key: 'sales', label: t('manuals.nav.sales') },
      { key: 'warehouse', label: t('manuals.nav.warehouse') },
      { key: 'faq', label: t('manuals.nav.faq') },
    ],
    [t]
  );

  const sections = t('manuals.sections', { returnObjects: true }) as ManualSections;
  const faq = t('manuals.faq', { returnObjects: true }) as ManualFaqItem[];

  const defaultKey = navItems[0]?.key ?? 'gettingStarted';
  const [activeKey, setActiveKey] = useState(defaultKey);
  const isDesktop = !isMobile && !isTablet;

  const activeSection =
    activeKey === 'faq' ? undefined : sections?.[activeKey as keyof ManualSections] ?? sections?.[defaultKey];

  // Render content based on active key
  const renderContent = () => {
    switch (activeKey) {
      case 'orders':
        return <OrdersManual />;
      case 'finance':
        return <FinanceManual />;
      case 'faq':
        return <FaqSection faq={faq} title={t('manuals.nav.faq')} />;
      default:
        return <ManualSection section={activeSection} />;
    }
  };

  return (
    <section className="page-wrapper space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
        <Typography.Title level={2} className="text-slate-900 dark:text-white">
          {t('manuals.title')}
        </Typography.Title>
        <Paragraph className="text-base text-slate-500 dark:text-slate-300">{t('manuals.subtitle')}</Paragraph>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        {isDesktop && <ManualSidebar items={navItems} activeKey={activeKey} onChange={setActiveKey} />}

        <div className="flex-1 space-y-6">
          {!isDesktop && (
            <ManualSidebar items={navItems} activeKey={activeKey} onChange={setActiveKey} compact />
          )}

          {renderContent()}
        </div>
      </div>
    </section>
  );
};

export default ManualsPage;
