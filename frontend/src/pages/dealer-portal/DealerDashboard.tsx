import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  DollarOutlined,
  ShoppingOutlined,
  RollbackOutlined,
  MoneyCollectOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;

interface DealerProfile {
  id: number;
  code: string;
  name: string;
  balance_usd: string;
  balance_uzs: string;
  region_name: string;
  manager_name: string;
}

interface Statistics {
  orders_count: number;
  payments_count: number;
  returns_count: number;
}

export default function DealerDashboard() {
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [stats, setStats] = useState<Statistics>({ orders_count: 0, payments_count: 0, returns_count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadStatistics();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await axios.get('/api/dealer-portal/profile/', {
        withCredentials: true,
      });
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const [ordersRes, paymentsRes, returnsRes] = await Promise.all([
        axios.get('/api/dealer-portal/orders/', { withCredentials: true }),
        axios.get('/api/dealer-portal/payments/', { withCredentials: true }),
        axios.get('/api/dealer-portal/returns/', { withCredentials: true }),
      ]);

      setStats({
        orders_count: ordersRes.data.count || ordersRes.data.length || 0,
        payments_count: paymentsRes.data.count || paymentsRes.data.length || 0,
        returns_count: returnsRes.data.count || returnsRes.data.length || 0,
      });
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  return (
    <div style={{
      padding: 24,
      background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
      minHeight: '100vh'
    }}>
      <Title level={2} style={{ color: '#fff', marginBottom: 24 }}>Dashboard</Title>

      {profile && (
        <>
          <Card
            style={{
              marginBottom: 24,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid #2a3f5f',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <Title level={4} style={{ color: '#66c0f4', marginBottom: 16 }}>Umumiy Ma'lumot</Title>
            <p style={{ color: '#c7d5e0', fontSize: 15, marginBottom: 8 }}>
              <strong style={{ color: '#8f98a0' }}>Kod:</strong> {profile.code}
            </p>
            <p style={{ color: '#c7d5e0', fontSize: 15, marginBottom: 8 }}>
              <strong style={{ color: '#8f98a0' }}>Nom:</strong> {profile.name}
            </p>
            <p style={{ color: '#c7d5e0', fontSize: 15, marginBottom: 8 }}>
              <strong style={{ color: '#8f98a0' }}>Hudud:</strong> {profile.region_name || '-'}
            </p>
            <p style={{ color: '#c7d5e0', fontSize: 15, marginBottom: 0 }}>
              <strong style={{ color: '#8f98a0' }}>Menejer:</strong> {profile.manager_name || '-'}
            </p>
          </Card>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Card
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  border: '1px solid #2a3f5f',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#8f98a0' }}>Balans (USD)</span>}
                  value={parseFloat(profile.balance_usd)}
                  precision={2}
                  prefix={<DollarOutlined />}
                  valueStyle={{
                    color: parseFloat(profile.balance_usd) > 0 ? '#e74c3c' : '#66c0f4',
                    fontSize: 32,
                    fontWeight: 'bold'
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  border: '1px solid #2a3f5f',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#8f98a0' }}>Balans (UZS)</span>}
                  value={parseFloat(profile.balance_uzs)}
                  precision={2}
                  prefix={<MoneyCollectOutlined />}
                  valueStyle={{
                    color: parseFloat(profile.balance_uzs) > 0 ? '#e74c3c' : '#66c0f4',
                    fontSize: 32,
                    fontWeight: 'bold'
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col xs={24} sm={8}>
              <Card
                loading={loading}
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  border: '1px solid #2a3f5f',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                hoverable
              >
                <Statistic
                  title={<span style={{ color: '#8f98a0' }}>Buyurtmalar</span>}
                  value={stats.orders_count}
                  prefix={<ShoppingOutlined style={{ color: '#66c0f4' }} />}
                  valueStyle={{ color: '#c7d5e0', fontSize: 28, fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                loading={loading}
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  border: '1px solid #2a3f5f',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                hoverable
              >
                <Statistic
                  title={<span style={{ color: '#8f98a0' }}>To'lovlar</span>}
                  value={stats.payments_count}
                  prefix={<DollarOutlined style={{ color: '#66c0f4' }} />}
                  valueStyle={{ color: '#c7d5e0', fontSize: 28, fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                loading={loading}
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  border: '1px solid #2a3f5f',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                hoverable
              >
                <Statistic
                  title={<span style={{ color: '#8f98a0' }}>Qaytarishlar</span>}
                  value={stats.returns_count}
                  prefix={<RollbackOutlined style={{ color: '#66c0f4' }} />}
                  valueStyle={{ color: '#c7d5e0', fontSize: 28, fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
