export type SupportedLanguage = 'uz' | 'ru' | 'en';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  locale: string;
}

export const LANGUAGE_STORAGE_KEY = 'lenza_lang';
export const DEFAULT_LANGUAGE: SupportedLanguage = 'uz';

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'uz', label: 'Oʻz', locale: 'uz-UZ' },
  { code: 'ru', label: 'Ru', locale: 'ru-RU' },
  { code: 'en', label: 'En', locale: 'en-US' },
];

export const getLocaleByLanguage = (language?: string): string => {
  if (!language) return LANGUAGE_OPTIONS[0]!.locale;
  const normalized = language.split('-')[0] as SupportedLanguage;
  return LANGUAGE_OPTIONS.find((option) => option.code === normalized)?.locale ?? LANGUAGE_OPTIONS[0]!.locale;
};
