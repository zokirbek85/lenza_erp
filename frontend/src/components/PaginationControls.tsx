import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Select } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const PaginationControls = ({ 
  page, 
  pageSize, 
  total, 
  setPage, 
  setPageSize, 
  className 
}: PaginationProps) => {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize) || 1);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages && total > 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);
  const pageLabel = t('pagination.pageOf', { 
    page: total === 0 ? 0 : page, 
    total: total === 0 ? 1 : totalPages 
  });
  const rangeLabel = t('pagination.range', { 
    start: rangeStart, 
    end: rangeEnd, 
    total 
  });

  const handlePrev = () => {
    if (canGoPrev) setPage(page - 1);
  };

  const handleNext = () => {
    if (canGoNext) setPage(page + 1);
  };

  const handleFirstPage = () => {
    if (page !== 1) setPage(1);
  };

  const handleLastPage = () => {
    if (page !== totalPages) setPage(totalPages);
  };

  return (
    <div
      className={clsx(
        'flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className
      )}
    >
      {/* Page Size Selector - Hidden on mobile, compact on desktop */}
      <div className="hidden sm:flex flex-wrap items-center gap-2">
        <span className="text-label">{t('pagination.show')}</span>
        <Select
          value={pageSize}
          onChange={(value: number) => {
            setPageSize(Number(value));
            setPage(1);
          }}
          options={PAGE_SIZE_OPTIONS.map((s) => ({ label: String(s), value: s }))}
          size="small"
          style={{ width: 80 }}
          className="transition-all"
        />
        <span>{t('pagination.itemsPerPage')}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          • {rangeLabel}
        </span>
      </div>

      {/* Pagination Buttons - Compact on mobile */}
      <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2">
        {/* First Page - Hidden on mobile */}
        <button
          type="button"
          onClick={handleFirstPage}
          disabled={page === 1}
          className="hidden sm:inline-flex btn btn-ghost btn-sm"
          title={t('pagination.first', 'Birinchi')}
        >
          «
        </button>

        {/* Previous - Icon only on mobile */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev}
          className="btn btn-secondary btn-sm px-2 sm:px-3"
        >
          <LeftOutlined />
          <span className="hidden sm:inline ml-1">{t('pagination.previous')}</span>
        </button>

        {/* Page Info - Compact on mobile */}
        <div className="px-2 py-1 sm:px-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-medium whitespace-nowrap">
          <span className="text-number">{pageLabel}</span>
        </div>

        {/* Next - Icon only on mobile */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className="btn btn-secondary btn-sm px-2 sm:px-3"
        >
          <span className="hidden sm:inline mr-1">{t('pagination.next')}</span>
          <RightOutlined />
        </button>

        {/* Last Page - Hidden on mobile */}
        <button
          type="button"
          onClick={handleLastPage}
          disabled={page === totalPages}
          className="hidden sm:inline-flex btn btn-ghost btn-sm"
          title={t('pagination.last', 'Oxirgi')}
        >
          »
        </button>
      </div>

      {/* Mobile Range Info - More compact */}
      <div className="sm:hidden text-center text-xs text-slate-400 dark:text-slate-500">
        {rangeLabel}
      </div>
    </div>
  );
};

export default PaginationControls;