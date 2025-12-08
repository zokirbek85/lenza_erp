import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Result, Typography, Divider, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import http from '../../app/http';
import '../../styles/verify.css';

const { Title, Text } = Typography;

interface OrderVerificationData {
  valid: boolean;
  id?: number;
  order_number?: string;
  dealer?: string;
  dealer_code?: string;
  date?: string;
  total_usd?: number;
  total_uzs?: number;
  status?: string;
  status_display?: string;
  created_at?: string;
  error?: string;
}

const VerifyOrderPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OrderVerificationData | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const response = await http.get(`/verify/order/${id}/`);
        setData(response.data);
      } catch (error) {
        setData({ valid: false, error: t('verify.notFound') });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVerification();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="verify-wrapper">
        <Card className="verify-card">
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: 'var(--text-secondary)' }}>
              {t('verify.loading')}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!data || !data.valid) {
    return (
      <div className="verify-wrapper">
        <Card className="verify-card">
          <Result
            status="error"
            icon={<CloseCircleOutlined className="verify-error-icon" />}
            title={<span style={{ color: 'var(--text-primary)' }}>{t('verify.notFound')}</span>}
            subTitle={
              <span style={{ color: 'var(--text-secondary)' }}>
                {data?.error || t('verify.order.notFoundDescription')}
              </span>
            }
          />
          <div className="verify-footer">
            <Text style={{ color: 'var(--text-secondary)' }}>{t('verify.verifiedBy')}</Text>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="verify-wrapper">
      <Card className="verify-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <CheckCircleOutlined className="verify-success-icon" />
          <Title level={3} className="verify-title">
            {t('verify.authentic')}
          </Title>
        </div>

        <Divider style={{ borderColor: 'var(--border-base)', margin: '16px 0' }} />

        <div className="verify-content">
          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">{t('verify.order.documentType')}:</div>
            <div className="verify-value">{t('verify.order.title')}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">{t('verify.order.orderNumber')}:</div>
            <div className="verify-value" style={{ color: 'var(--lenza-gold)' }}>
              {data.order_number || `ORD-${data.id}`}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">{t('verify.order.dealer')}:</div>
            <div className="verify-value">
              {data.dealer} ({data.dealer_code})
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">{t('verify.order.date')}:</div>
            <div className="verify-value">
              {data.date ? new Date(data.date).toLocaleDateString('uz-UZ') : 'N/A'}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">{t('verify.order.totalAmount')}:</div>
            <div className="verify-value">
              ${data.total_usd?.toFixed(2)} / {data.total_uzs?.toLocaleString()} UZS
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">{t('verify.order.status')}:</div>
            <div className="verify-value">
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--success-bg)',
                  color: 'var(--success)',
                  fontSize: '14px',
                }}
              >
                {data.status_display || data.status}
              </span>
            </div>
          </div>
        </div>

        <Divider style={{ borderColor: 'var(--border-base)', margin: '24px 0 16px' }} />

        <div className="verify-footer">
          <Text style={{ color: 'var(--success)', fontWeight: 500 }}>
            {t('verify.verified')}
          </Text>
          <br />
          <Text style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: 8 }}>
            {t('verify.verifiedBy')}
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default VerifyOrderPage;
