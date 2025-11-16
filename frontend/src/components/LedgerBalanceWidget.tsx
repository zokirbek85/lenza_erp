import { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, Space, Badge, Spin, Typography } from 'antd';
import { DollarOutlined, BankOutlined, CreditCardOutlined } from '@ant-design/icons';
import http from '../app/http';

const { Text } = Typography;

interface AccountBalance {
  id: number;
  name: string;
  type: 'cash' | 'bank' | 'card';
  balance_usd: number;
  balance_uzs: number;
  currency: string;
}

interface BalanceData {
  rate: number;
  total_balance: number;
  cash_balance: number;
  bank_balance: number;
  card_balance: number;
  accounts: AccountBalance[];
}

const LedgerBalanceWidget = () => {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/ledger-accounts/balances/');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch ledger balances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
    // Refresh every 60 seconds
    const interval = setInterval(fetchBalances, 60000);
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <DollarOutlined style={{ fontSize: 20, color: '#52c41a' }} />;
      case 'bank':
        return <BankOutlined style={{ fontSize: 20, color: '#1890ff' }} />;
      case 'card':
        return <CreditCardOutlined style={{ fontSize: 20, color: '#722ed1' }} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card variant="borderless" style={{ minHeight: 200 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 150 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card 
      title={
        <Space>
          <span>💼 Kassa balans</span>
          <Badge 
            count={data.accounts.filter(a => a.balance_usd > 0).length} 
            style={{ backgroundColor: '#52c41a' }}
          />
        </Space>
      }
      variant="borderless"
      style={{ height: '100%' }}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Statistic
            title="Umumiy balans"
            value={data.total_balance}
            precision={2}
            prefix="$"
            valueStyle={{ 
              color: data.total_balance >= 0 ? '#3f8600' : '#cf1322',
              fontSize: 32,
              fontWeight: 'bold'
            }}
          />
        </Col>
        
        <Col xs={24} sm={8}>
          <Card size="small" style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Space>
                <DollarOutlined style={{ fontSize: 18, color: '#52c41a' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Naqd pul</Text>
              </Space>
              <Statistic
                value={data.cash_balance}
                precision={2}
                prefix="$"
                valueStyle={{ fontSize: 18, color: '#52c41a' }}
              />
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card size="small" style={{ backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Space>
                <BankOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Bank hisob</Text>
              </Space>
              <Statistic
                value={data.bank_balance}
                precision={2}
                prefix="$"
                valueStyle={{ fontSize: 18, color: '#1890ff' }}
              />
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card size="small" style={{ backgroundColor: '#f9f0ff', border: '1px solid #d3adf7' }}>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Space>
                <CreditCardOutlined style={{ fontSize: 18, color: '#722ed1' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Kartalar</Text>
              </Space>
              <Statistic
                value={data.card_balance}
                precision={2}
                prefix="$"
                valueStyle={{ fontSize: 18, color: '#722ed1' }}
              />
            </Space>
          </Card>
        </Col>

        {data.accounts.filter(acc => acc.balance_usd !== 0).slice(0, 3).map((account) => (
          <Col key={account.id} span={24}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space size="small">
                {getIcon(account.type)}
                <Text style={{ fontSize: 12 }}>{account.name}</Text>
              </Space>
              <Text 
                strong 
                style={{ 
                  color: (account.balance_usd || 0) >= 0 ? '#3f8600' : '#cf1322',
                  fontSize: 12
                }}
              >
                ${Number(account.balance_usd || 0).toFixed(2)}
              </Text>
            </Space>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default LedgerBalanceWidget;
