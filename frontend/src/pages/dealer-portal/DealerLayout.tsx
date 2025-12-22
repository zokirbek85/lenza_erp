import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, message } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  DollarOutlined,
  RollbackOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

export default function DealerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [dealerName, setDealerName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const dealerData = localStorage.getItem('dealer');
    if (dealerData) {
      const dealer = JSON.parse(dealerData);
      setDealerName(dealer.name);
    } else {
      navigate('/dealer-portal/login');
    }
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await axios.post('/api/dealer-portal/logout/', {}, {
        withCredentials: true,
      });
      localStorage.removeItem('dealer');
      message.success('Tizimdan chiqdingiz');
      navigate('/dealer-portal/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, clear local data
      localStorage.removeItem('dealer');
      navigate('/dealer-portal/login');
    }
  };

  const menuItems = [
    {
      key: '/dealer-portal/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/dealer-portal/orders',
      icon: <ShoppingOutlined />,
      label: 'Buyurtmalar',
    },
    {
      key: '/dealer-portal/payments',
      icon: <DollarOutlined />,
      label: 'To\'lovlar',
    },
    {
      key: '/dealer-portal/returns',
      icon: <RollbackOutlined />,
      label: 'Qaytarishlar',
    },
    {
      key: '/dealer-portal/refunds',
      icon: <DollarOutlined />,
      label: 'Refundlar',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={80}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 16 : 20,
          fontWeight: 'bold',
        }}>
          {collapsed ? 'DP' : 'Diller Portal'}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <Title level={4} style={{ margin: 0 }}>
            <UserOutlined /> {dealerName}
          </Title>

          <Button
            type="text"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Chiqish
          </Button>
        </Header>

        <Content style={{
          margin: '24px 16px',
          padding: 24,
          background: '#fff',
          minHeight: 280,
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
