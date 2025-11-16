import { Button, Drawer } from 'antd';
import type { ReactNode } from 'react';

type FilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  onApply?: () => void;
  onReset?: () => void;
  title?: string;
  children: ReactNode;
};

const FilterDrawer = ({
  open,
  onClose,
  onApply,
  onReset,
  title = 'Filters',
  children,
}: FilterDrawerProps) => (
  <Drawer
    open={open}
    onClose={onClose}
    placement="bottom"
    height="70%"
    closable={false}
    bodyStyle={{ padding: '1.25rem' }}
    className="shadow-2xl"
  >
    <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <button
        type="button"
        onClick={onClose}
        className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
      >
        Close
      </button>
    </div>
    <div className="mt-4 space-y-4">{children}</div>
    <div className="mt-6 flex gap-2">
      <Button block onClick={onReset} type="default">
        Reset
      </Button>
      <Button block type="primary" onClick={onApply}>
        Apply
      </Button>
    </div>
  </Drawer>
);

export default FilterDrawer;
