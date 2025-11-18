import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import ru from './locales/ru/translation.json';
import uz from './locales/uz/translation.json';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  type SupportedLanguage,
} from './languages';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  uz: { translation: uz },
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
