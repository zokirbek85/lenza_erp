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

export default function DealerDashboard() {
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
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

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Dashboard</Title>

      {profile && (
        <>
          <Card style={{ marginBottom: 24 }}>
            <Title level={4}>Umumiy Ma'lumot</Title>
            <p><strong>Kod:</strong> {profile.code}</p>
            <p><strong>Nom:</strong> {profile.name}</p>
            <p><strong>Hudud:</strong> {profile.region_name || '-'}</p>
            <p><strong>Menejer:</strong> {profile.manager_name || '-'}</p>
          </Card>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="Balans (USD)"
                  value={parseFloat(profile.balance_usd)}
                  precision={2}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: parseFloat(profile.balance_usd) > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="Balans (UZS)"
                  value={parseFloat(profile.balance_uzs)}
                  precision={2}
                  prefix={<MoneyCollectOutlined />}
                  valueStyle={{ color: parseFloat(profile.balance_uzs) > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col xs={24} sm={8}>
              <Card loading={loading}>
                <Statistic
                  title="Buyurtmalar"
                  value={0}
                  prefix={<ShoppingOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card loading={loading}>
                <Statistic
                  title="To'lovlar"
                  value={0}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card loading={loading}>
                <Statistic
                  title="Qaytarishlar"
                  value={0}
                  prefix={<RollbackOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
