import { Card, Select, Typography } from 'antd';
import clsx from 'clsx';
import { useIsMobile } from '../../../hooks/useIsMobile';

const { Text } = Typography;

export interface ManualNavItem {
  key: string;
  label: string;
}

interface ManualSidebarProps {
  items: ManualNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  compact?: boolean;
}

const ManualSidebar = ({ items, activeKey, onChange, compact }: ManualSidebarProps) => {
  const { isMobile, isTablet } = useIsMobile();
  const isCompact = compact || isMobile || isTablet;

  if (isCompact) {
    return (
      <Select
        className="w-full"
        value={activeKey}
        onChange={onChange}
        options={items.map((item) => ({ label: item.label, value: item.key }))}
        dropdownMatchSelectWidth={false}
      />
    );
  }

  return (
    <Card className="sticky top-4 hidden w-full max-w-[240px] flex-shrink-0 lg:block" variant="borderless">
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={clsx(
              'w-full rounded-lg px-4 py-2 text-left transition',
              item.key === activeKey
                ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-900'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            )}
          >
            <Text strong className="text-sm">
              {item.label}
            </Text>
          </button>
        ))}
      </div>
    </Card>
  );
};

export default ManualSidebar;
