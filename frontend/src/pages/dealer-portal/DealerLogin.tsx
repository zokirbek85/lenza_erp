import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

export default function DealerLogin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/dealer-portal/login/', values, {
        withCredentials: true,
      });

      // Store dealer info
      localStorage.setItem('dealer', JSON.stringify(response.data.dealer));

      message.success('Xush kelibsiz!');
      navigate('/dealer-portal/dashboard');
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Login yoki parol noto\'g\'ri'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(102, 192, 244, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(102, 192, 244, 0.15) 0%, transparent 50%)',
        pointerEvents: 'none'
      }}></div>

      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid #2a3f5f',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#66c0f4', marginBottom: 8 }}>Diller Portal</Title>
          <Text style={{ color: '#8f98a0', fontSize: 15 }}>Hisobingizga kiring</Text>
        </div>

        <Form
          name="dealer_login"
          onFinish={onFinish}
          size="large"
          layout="vertical"
          className="steam-form"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Loginni kiriting!' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#66c0f4' }} />}
              placeholder="Login"
              style={{
                background: '#0e1621',
                border: '1px solid #2a3f5f',
                color: '#c7d5e0'
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Parolni kiriting!' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#66c0f4' }} />}
              placeholder="Parol"
              style={{
                background: '#0e1621',
                border: '1px solid #2a3f5f',
                color: '#c7d5e0'
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{
                background: 'linear-gradient(135deg, #66c0f4 0%, #4a9fd8 100%)',
                border: 'none',
                fontWeight: 600,
                height: 48,
                boxShadow: '0 4px 12px rgba(102, 192, 244, 0.3)',
                fontSize: 16
              }}
            >
              Kirish
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ fontSize: 13, color: '#8f98a0' }}>
            Login yoki parol yo'qmi? Administrator bilan bog'laning
          </Text>
        </div>
      </Card>

      <style>{`
        .steam-form .ant-input::placeholder,
        .steam-form .ant-input-password input::placeholder {
          color: #5c7287;
        }
        .steam-form .ant-input:focus,
        .steam-form .ant-input-password input:focus,
        .steam-form .ant-input-focused,
        .steam-form .ant-input-password-focused {
          border-color: #66c0f4;
          box-shadow: 0 0 0 2px rgba(102, 192, 244, 0.2);
        }
        .steam-form .ant-input-password-icon {
          color: #66c0f4;
        }
      `}</style>
    </div>
  );
}
