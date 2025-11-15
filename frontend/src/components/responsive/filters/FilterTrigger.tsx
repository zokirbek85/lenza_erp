import { Button } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import clsx from 'clsx';

type FilterTriggerProps = {
  openLabel?: string;
  className?: string;
  onClick: () => void;
};

const FilterTrigger = ({ openLabel = 'Filters', className, onClick }: FilterTriggerProps) => (
  <Button
    className={clsx('flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold', className)}
    onClick={onClick}
    icon={<FilterOutlined />}
  >
    {openLabel}
  </Button>
);

export default FilterTrigger;
