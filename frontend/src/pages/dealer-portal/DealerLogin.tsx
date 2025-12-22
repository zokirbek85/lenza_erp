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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>Diller Portal</Title>
          <Text type="secondary">Hisobingizga kiring</Text>
        </div>

        <Form
          name="dealer_login"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Loginni kiriting!' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Login"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Parolni kiriting!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Parol"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              Kirish
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Login yoki parol yo'qmi? Administrator bilan bog'laning
          </Text>
        </div>
      </Card>
    </div>
  );
}
