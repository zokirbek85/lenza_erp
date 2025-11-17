import { Result, Button } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Result
        status="404"
        title="404"
        subTitle={t('errors.notFound')}
        extra={
          <Button type="primary">
            <Link to="/">{t('errors.backHome')}</Link>
          </Button>
        }
      />
    </div>
  );
}
