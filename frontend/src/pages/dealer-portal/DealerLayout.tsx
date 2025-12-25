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
  FileTextOutlined,
  AppstoreOutlined,
  ShoppingCartOutlined,
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
      key: '/dealer-portal/products',
      icon: <AppstoreOutlined />,
      label: 'Mahsulotlar',
    },
    {
      key: '/dealer-portal/cart',
      icon: <ShoppingCartOutlined />,
      label: 'Savatcha',
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
    {
      key: '/dealer-portal/reconciliation',
      icon: <FileTextOutlined />,
      label: 'Akt Sverka',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }} className="steam-layout">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="md"
        collapsedWidth={0}
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          borderRight: '1px solid #2a3f5f'
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#66c0f4',
          fontSize: collapsed ? 16 : 18,
          fontWeight: 'bold',
          borderBottom: '1px solid #2a3f5f',
          letterSpacing: '1px'
        }}>
          {collapsed ? 'DP' : 'DILLER PORTAL'}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: 'transparent',
            border: 'none'
          }}
          className="steam-menu"
        />
      </Sider>

      <Layout style={{ background: 'transparent' }}>
        <Header style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #2a3f5f',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          <Title level={4} style={{ margin: 0, color: '#c7d5e0', fontWeight: 500, fontSize: 'clamp(14px, 3vw, 20px)' }}>
            <UserOutlined style={{ color: '#66c0f4', marginRight: 8 }} />
            <span className="dealer-name-text">{dealerName}</span>
          </Title>

          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{
              color: '#e74c3c',
              fontWeight: 600,
              padding: '4px 8px'
            }}
            className="logout-btn"
          >
            <span className="logout-text">Chiqish</span>
          </Button>
        </Header>

        <Content style={{
          margin: 0,
          padding: 0,
          background: 'transparent',
          minHeight: 280,
          overflow: 'auto'
        }}>
          <Outlet />
        </Content>
      </Layout>

      <style>{`
        .steam-layout {
          background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
        }
        .steam-menu .ant-menu-item {
          color: #8f98a0;
          margin: 4px 8px;
          border-radius: 4px;
          font-weight: 500;
        }
        .steam-menu .ant-menu-item:hover {
          background: rgba(102, 192, 244, 0.15);
          color: #66c0f4;
        }
        .steam-menu .ant-menu-item-selected {
          background: linear-gradient(90deg, rgba(102, 192, 244, 0.25) 0%, rgba(102, 192, 244, 0.1) 100%);
          color: #66c0f4;
          border-left: 3px solid #66c0f4;
        }
        .steam-menu .ant-menu-item-icon {
          color: inherit;
        }
        .logout-btn:hover {
          background: rgba(231, 76, 60, 0.1);
          color: #ff6b6b !important;
        }
        .ant-layout-sider-trigger {
          background: #16213e;
          border-top: 1px solid #2a3f5f;
          color: #66c0f4;
        }
        
        @media (max-width: 576px) {
          .dealer-name-text {
            display: inline-block;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .logout-text {
            display: none;
          }
        }
        .ant-layout-sider-trigger:hover {
          background: #1a2a40;
        }
      `}</style>
    </Layout>
  );
}
