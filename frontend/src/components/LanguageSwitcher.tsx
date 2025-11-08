import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const SUPPORTED_LANGS = [
  { code: 'uz', label: 'Uz' },
  { code: 'ru', label: 'Ru' },
  { code: 'en', label: 'En' },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lenza_lang');
      if (stored) {
        i18n.changeLanguage(stored);
      }
    } catch {
      // ignore
    }
  }, [i18n]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = event.target.value;
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem('lenza_lang', lang);
    } catch {
      // ignore
    }
  };

  return (
    <select
      value={i18n.language}
      onChange={handleChange}
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-100"
    >
      {SUPPORTED_LANGS.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
