import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Result, Typography, Divider, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
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
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OrderVerificationData | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const response = await http.get(`/verify/order/${id}/`);
        setData(response.data);
      } catch (error) {
        setData({ valid: false, error: 'Hujjat topilmadi' });
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
              Hujjat tekshirilmoqda...
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
            title={<span style={{ color: 'var(--text-primary)' }}>Hujjat topilmadi</span>}
            subTitle={
              <span style={{ color: 'var(--text-secondary)' }}>
                {data?.error || 'Bu buyurtma hujjati tizimda mavjud emas yoki o\'chirilgan'}
              </span>
            }
          />
          <div className="verify-footer">
            <Text style={{ color: 'var(--text-secondary)' }}>Lenza ERP tizimi orqali tekshirildi</Text>
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
            Hujjat haqiqiy!
          </Title>
        </div>

        <Divider style={{ borderColor: 'var(--border-base)', margin: '16px 0' }} />

        <div className="verify-content">
          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">Hujjat turi:</div>
            <div className="verify-value">Buyurtma to'lovnomasi (Invoice)</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">Buyurtma raqami:</div>
            <div className="verify-value" style={{ color: 'var(--lenza-gold)' }}>
              {data.order_number || `ORD-${data.id}`}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">Diler:</div>
            <div className="verify-value">
              {data.dealer} ({data.dealer_code})
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">Sana:</div>
            <div className="verify-value">
              {data.date ? new Date(data.date).toLocaleDateString('uz-UZ') : 'N/A'}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">Jami summa:</div>
            <div className="verify-value">
              ${data.total_usd?.toFixed(2)} / {data.total_uzs?.toLocaleString()} UZS
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="verify-label">Holat:</div>
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
            ✓ Документ прошёл проверку подлинности
          </Text>
          <br />
          <Text style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: 8 }}>
            Lenza ERP tizimi orqali tekshirildi
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default VerifyOrderPage;
