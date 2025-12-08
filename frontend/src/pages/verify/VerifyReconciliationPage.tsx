import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Result, Typography, Divider, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import http from '../../app/http';
import '../../styles/verify.css';

const { Title, Text } = Typography;

interface ReconciliationVerificationData {
  valid: boolean;
  id?: number;
  dealer?: string;
  dealer_code?: string;
  region?: string;
  opening_balance?: number;
  phone?: string;
  type?: string;
  note?: string;
  error?: string;
}

const VerifyReconciliationPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReconciliationVerificationData | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const response = await http.get(`/verify/reconciliation/${id}/`);
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
                {data?.error || t('verify.reconciliation.notFoundDescription')}
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
            <div className="verify-value">{t('verify.reconciliation.title')}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">{t('verify.reconciliation.dealer')}:</div>
            <div className="verify-value" style={{ color: 'var(--lenza-gold)' }}>
              {data.dealer}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">{t('verify.reconciliation.dealerCode')}:</div>
            <div className="verify-value">{data.dealer_code}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">{t('verify.reconciliation.region')}:</div>
            <div className="verify-value">{data.region}</div>
          </div>

          {data.phone && data.phone !== 'N/A' && (
            <div style={{ marginBottom: 16 }}>
              <div className="verify-label">{t('verify.reconciliation.phone')}:</div>
              <div className="verify-value">{data.phone}</div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">{t('verify.reconciliation.openingBalance')}:</div>
            <div className="verify-value">
              ${data.opening_balance?.toFixed(2)}
            </div>
          </div>

          {data.note && (
            <div style={{ marginBottom: 16 }}>
              <div className="verify-label">{t('verify.reconciliation.note')}:</div>
              <div className="verify-value" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {data.note}
              </div>
            </div>
          )}
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

export default VerifyReconciliationPage;
