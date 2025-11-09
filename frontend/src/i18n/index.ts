import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import ru from './locales/ru/translation.json';
import uz from './locales/uz/translation.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  uz: { translation: uz },
};

const storedLanguage = (() => {
  try {
    return localStorage.getItem('lenza_lang') || undefined;
  } catch {
    return undefined;
  }
})();

const initialLanguage = storedLanguage ?? 'uz';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'uz',
    lng: initialLanguage,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lenza_lang',
    },
  });

export default i18n;
