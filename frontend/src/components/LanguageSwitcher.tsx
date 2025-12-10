import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';

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

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // ignore persistence issues
    }
  };

  return (
    <Select
      value={i18n.language}
      onChange={handleChange}
      aria-label={t('app.language')}
      size="small"
      style={{ minWidth: 90 }}
      options={LANGUAGE_OPTIONS.map((lang) => ({ label: lang.label, value: lang.code }))}
    />
  );
};

export default LanguageSwitcher;
