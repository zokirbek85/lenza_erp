import { Card, Collapse } from 'antd';

export interface ManualFaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  faq: ManualFaqItem[];
  title: string;
}

const FaqSection = ({ faq, title }: FaqSectionProps) => {
  if (!faq.length) {
    return null;
  }

  return (
    <Card title={title} className="shadow-sm">
      <Collapse
        bordered={false}
        items={faq.map((item, index) => ({
          key: String(index),
          label: item.question,
          children: <p className="text-slate-600 dark:text-slate-200">{item.answer}</p>,
        }))}
      />
    </Card>
  );
};

export default FaqSection;
