import {
  Typography,
  Collapse,
  Card,
  Space,
  Divider,
  Alert,
  Empty,
  Tag,
} from 'antd';
import { FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { theme as antdTheme } from 'antd';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

const manuals = [
  {
    id: 1,
    role: 'admin',
    title: "Admin uchun qo'llanma",
    content: "# Admin Panel\n## Foydalanuvchilarni boshqarish\n- Yangi foydalanuvchi qo'shish\n- Foydalanuvchini o'chirish\n- Foydalanuvchi rolini o'zgartirish",
  },
  {
    id: 2,
    role: 'user',
    title: "Foydalanuvchi uchun qo'llanma",
    content: "# Asosiy bo'limlar\n## Buyurtmalarni ko'rish\n- Buyurtma yaratish\n- Buyurtmani tahrirlash\n- Buyurtmani bekor qilish",
  },
];

export default function UserManualPage() {
  const { token } = antdTheme.useToken();
  if (!manuals.length) {
    return <Empty description="Qo'llanmalar topilmadi" />;
  }
  return (
    <div
      style={{
        padding: 24,
        background: token.colorBgContainer,
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
      }}
    >
      <Title level={3} style={{ marginBottom: 12 }}>
        <FileTextOutlined /> Foydalanuvchi qo‘llanmasi
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Tizimdan foydalanish bo‘yicha to‘liq yo‘riqnoma. Rolingizga mos bo‘limlar ko‘rsatiladi.
      </Paragraph>

      <Collapse
        accordion
        bordered={false}
        expandIconPosition="end"
        style={{
          background: 'transparent',
        }}
      >
        {manuals.map((m) => (
          <Panel
            key={m.id}
            header={
              <Space>
                <Tag color="blue">{m.role.toUpperCase()}</Tag>
                <Text strong>{m.title}</Text>
              </Space>
            }
            style={{
              background: token.colorFillAlter,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <Card
              bordered={false}
              style={{
                background: token.colorBgElevated,
                borderRadius: 8,
              }}
            >
              <ReactMarkdown
                children={m.content}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: (props: any) => (
                    <Title level={3} style={{ marginTop: 16 }} {...props} />
                  ),
                  h2: (props: any) => (
                    <Title level={4} style={{ color: token.colorPrimary }} {...props} />
                  ),
                  h3: (props: any) => (
                    <Title
                      level={5}
                      style={{
                        color: token.colorTextSecondary,
                        marginTop: 12,
                      }}
                      {...props}
                    />
                  ),
                  p: (props: any) => <Paragraph {...props} />,
                  li: (props: any) => (
                    <Paragraph style={{ marginBottom: 4 }}>
                      <CheckCircleOutlined style={{ color: token.colorSuccess, marginRight: 6 }} />
                      {props.children}
                    </Paragraph>
                  ),
                  strong: (props: any) => (
                    <Text strong style={{ color: token.colorTextHeading }} {...props} />
                  ),
                }}
              />
              <Divider />
              <Alert
                message="Eslatma"
                description="Ushbu bo‘limda ko‘rsatilgan amallar sizning tizimdagi rolingiz doirasida bajariladi."
                type="info"
                showIcon
                style={{ borderRadius: 8 }}
              />
            </Card>
          </Panel>
        ))}
      </Collapse>
    </div>
  );
}
