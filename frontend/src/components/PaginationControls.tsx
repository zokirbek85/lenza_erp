import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Select } from 'antd';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const PaginationControls = ({ page, pageSize, total, setPage, setPageSize, className }: PaginationProps) => {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize) || 1);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages && total > 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);
  const pageLabel = t('pagination.pageOf', { page: total === 0 ? 0 : page, total: total === 0 ? 1 : totalPages });
  const rangeLabel = t('pagination.range', { start: rangeStart, end: rangeEnd, total });

  const handlePrev = () => {
    if (canGoPrev) setPage(page - 1);
  };

  const handleNext = () => {
    if (canGoNext) setPage(page + 1);
  };

  return (
    <div
      className={clsx(
        'flex flex-col gap-3 text-sm text-slate-500 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span>{t('pagination.show')}</span>
        <Select
          value={pageSize}
          onChange={(value: number) => {
            setPageSize(Number(value));
            setPage(1);
          }}
          options={PAGE_SIZE_OPTIONS.map((s) => ({ label: String(s), value: s }))}
          size="small"
          style={{ width: 96 }}
        />
        <span>{t('pagination.itemsPerPage')}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">{rangeLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev}
          className="rounded-md bg-slate-200 px-3 py-1 font-semibold text-slate-700 transition disabled:opacity-40 dark:bg-slate-700 dark:text-white"
        >
          {t('pagination.previous')}
        </button>
        <span className="text-xs text-slate-400 dark:text-slate-500">{pageLabel}</span>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className="rounded-md bg-slate-200 px-3 py-1 font-semibold text-slate-700 transition disabled:opacity-40 dark:bg-slate-700 dark:text-white"
        >
          {t('pagination.next')}
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
