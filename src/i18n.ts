import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import mrCommon from './locales/mr/common.json';

const resources = {
  en: {
    common: enCommon,
  },
  mr: {
    common: mrCommon,
  },
};

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') || 'mr' : 'mr';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS: 'common',
    lng: savedLang,
    fallbackLng: 'en',
    supportedLngs: ['mr', 'en'],
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
      bindI18nStore: '',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

// Keep html tag lang attribute in sync
if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language || 'mr';
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
  });
}

export default i18n;
