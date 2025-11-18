import i18n from '../i18n';
import { DEFAULT_LANGUAGE, getLocaleByLanguage } from '../i18n/languages';

type NumericLike = number | string | null | undefined;

const ensureNumber = (value: NumericLike): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const normalized = Number(value.replace(',', '.'));
    return Number.isFinite(normalized) ? normalized : 0;
  }
  return 0;
};

const resolveLocale = (language?: string) => {
  const lang = language || i18n.language || DEFAULT_LANGUAGE;
  return getLocaleByLanguage(lang);
};

export const formatCurrency = (
  value: NumericLike,
  currency = 'USD',
  options?: Intl.NumberFormatOptions,
  language?: string
) => {
  const amount = ensureNumber(value);
  return new Intl.NumberFormat(resolveLocale(language), {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
};

export const formatNumber = (value: NumericLike, language?: string) => {
  const amount = ensureNumber(value);
  return new Intl.NumberFormat(resolveLocale(language)).format(amount);
};

export const formatQuantity = (value: NumericLike, language?: string) => {
  const amount = ensureNumber(value);
  return new Intl.NumberFormat(resolveLocale(language), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (value: string | Date | null | undefined, language?: string) => {
  if (!value) {
    return i18n.t('common.noData');
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return i18n.t('common.noData');
  }
  return new Intl.DateTimeFormat(resolveLocale(language), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};
