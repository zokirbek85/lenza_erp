import { Alert, Card, List, Space, Typography } from 'antd';
import { CheckCircleTwoTone, WarningTwoTone } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

export interface ManualBlock {
  title: string;
  items: string[];
}

export interface ManualSectionContent {
  title: string;
  description: string;
  blocks: ManualBlock[];
  checklist?: string[];
  warnings?: string[];
}

interface ManualSectionProps {
  section?: ManualSectionContent;
}

const ManualSection = ({ section }: ManualSectionProps) => {
  if (!section) {
    return null;
  }

  return (
    <Space direction="vertical" size={16} className="w-full">
      <Card>
        <Title level={3} className="mb-2">
          {section.title}
        </Title>
        <Paragraph className="text-base text-slate-600 dark:text-slate-300">{section.description}</Paragraph>
      </Card>

      {section.blocks.map((block) => (
        <Card key={block.title} title={block.title} className="shadow-sm">
          <List
            dataSource={block.items}
            renderItem={(item) => (
              <List.Item className="border-0 px-0">
                <Text className="text-slate-700 dark:text-slate-200">{item}</Text>
              </List.Item>
            )}
          />
        </Card>
      ))}

      {section.checklist && section.checklist.length > 0 && (
        <Card
          title={
            <Space>
              <CheckCircleTwoTone twoToneColor={getComputedStyle(document.documentElement).getPropertyValue('--success').trim()} />
              <span>Checklist</span>
            </Space>
          }
        >
          <List
            dataSource={section.checklist}
            renderItem={(item) => (
              <List.Item className="border-0 px-0">
                <Text className="text-slate-700 dark:text-slate-200">{item}</Text>
              </List.Item>
            )}
          />
        </Card>
      )}

      {section.warnings && section.warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          className="rounded-xl"
          message={
            <Space direction="vertical">
              <Space>
                <WarningTwoTone twoToneColor={getComputedStyle(document.documentElement).getPropertyValue('--warning').trim()} />
                <Text strong>Ogohlantirish</Text>
              </Space>
              <ul className="list-disc pl-5 text-slate-700 dark:text-slate-200">
                {section.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </Space>
          }
        />
      )}
    </Space>
  );
};

export default ManualSection;
