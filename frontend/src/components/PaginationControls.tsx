import clsx from 'clsx';

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
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize) || 1);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages && total > 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);

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
        <span>Ko&apos;rsat:</span>
        <select
          value={pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>ta yozuv / sahifa</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {rangeStart} – {rangeEnd} / {total}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev}
          className="rounded-md bg-slate-200 px-3 py-1 font-semibold text-slate-700 transition disabled:opacity-40 dark:bg-slate-700 dark:text-white"
        >
          ← Oldingi
        </button>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Sahifa {total === 0 ? 0 : page} / {total === 0 ? 1 : totalPages}
        </span>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className="rounded-md bg-slate-200 px-3 py-1 font-semibold text-slate-700 transition disabled:opacity-40 dark:bg-slate-700 dark:text-white"
        >
          Keyingi →
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
