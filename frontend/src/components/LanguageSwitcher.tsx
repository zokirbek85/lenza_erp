import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { LANGUAGE_OPTIONS, LANGUAGE_STORAGE_KEY } from '../i18n/languages';

export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored) {
        i18n.changeLanguage(stored);
      }
    } catch {
      // ignore persistence issues
    }
  }, [i18n]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = event.target.value;
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // ignore persistence issues
    }
  };

  return (
    <select
      value={i18n.language}
      onChange={handleChange}
      aria-label={t('app.language')}
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-100"
    >
      {LANGUAGE_OPTIONS.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
