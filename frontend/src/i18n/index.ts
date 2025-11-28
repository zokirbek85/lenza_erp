import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import ru from './locales/ru/translation.json';
import uz from './locales/uz/translation.json';
import enCommon from './locales/en/common.json';
import ruCommon from './locales/ru/common.json';
import uzCommon from './locales/uz/common.json';
import enCashbox from './locales/en/cashbox.json';
import ruCashbox from './locales/ru/cashbox.json';
import uzCashbox from './locales/uz/cashbox.json';
import enFinance from './locales/en/finance.json';
import ruFinance from './locales/ru/finance.json';
import uzFinance from './locales/uz/finance.json';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  type SupportedLanguage,
} from './languages';

const resources = {
  en: { translation: en, common: enCommon, cashbox: enCashbox, finance: enFinance },
  ru: { translation: ru, common: ruCommon, cashbox: ruCashbox, finance: ruFinance },
  uz: { translation: uz, common: uzCommon, cashbox: uzCashbox, finance: uzFinance },
};

const supportedLanguages: SupportedLanguage[] = LANGUAGE_OPTIONS.map((option) => option.code);

const storedLanguage = (() => {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
})();

const initialLanguage =
  storedLanguage && supportedLanguages.includes(storedLanguage as SupportedLanguage)
    ? storedLanguage
    : DEFAULT_LANGUAGE;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    lng: initialLanguage,
    supportedLngs: supportedLanguages,
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    returnNull: false,
  });

export default i18n;
