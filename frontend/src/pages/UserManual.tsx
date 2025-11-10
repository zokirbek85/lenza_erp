import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Collapse, Typography } from 'antd';
import { getUserManuals, type UserManual } from '../services/userManuals';

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

const UserManualPage = () => {
  const { t } = useTranslation();
  const [manuals, setManuals] = useState<UserManual[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getUserManuals()
      .then(setManuals)
      .catch(() => setManuals([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('nav.userManual')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('userManual.subtitle', 'Tizimdan foydalanish bo\'yicha ko\'rsatmalar')}</p>
        </div>
      </header>

      <Card className="rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900" bodyStyle={{ background: 'transparent' }}>
        {loading ? (
          <div className="py-6 text-center text-slate-500 dark:text-slate-300">{t('common.loading', 'Yuklanmoqda...')}</div>
        ) : manuals.length === 0 ? (
          <div className="py-6 text-center text-slate-500 dark:text-slate-300">{t('userManual.empty', 'Hozircha yo\'riqnomalar mavjud emas')}</div>
        ) : (
          <Collapse bordered={false} className="bg-transparent">
            {manuals.map((m) => (
              <Panel
                header={<span className="font-semibold text-slate-800 dark:text-slate-100">{m.title}</span>}
                key={m.id}
                className="rounded-lg border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="prose max-w-none whitespace-pre-wrap dark:prose-invert">
                  <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{m.content}</Paragraph>
                  <Text type="secondary" className="text-xs">{new Date(m.created_at).toLocaleString()}</Text>
                </div>
              </Panel>
            ))}
          </Collapse>
        )}
      </Card>
    </section>
  );
};

export default UserManualPage;
