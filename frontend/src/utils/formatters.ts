export const formatCurrency = (value: number | string | null | undefined, currency = 'USD') => {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (value: number | string | null | undefined) => {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  return new Intl.NumberFormat('uz-UZ').format(amount);
};

export const formatDate = (value: string | Date | null | undefined) => {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
};

