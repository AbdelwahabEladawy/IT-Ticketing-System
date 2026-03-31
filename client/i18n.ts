import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en/translation.json';
import ar from './locales/ar/translation.json';

const STORAGE_KEY = 'app_locale';

function applyDir(lng: string) {
  if (typeof document === 'undefined') return;
  const code = lng?.startsWith('ar') ? 'ar' : 'en';
  document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = code;
}

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        ar: { translation: ar }
      },
      fallbackLng: 'en',
      supportedLngs: ['en', 'ar'],
      nonExplicitSupportedLngs: true,
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: STORAGE_KEY,
        caches: ['localStorage']
      },
      interpolation: { escapeValue: false },
      react: { useSuspense: false }
    });

  i18n.on('languageChanged', (lng) => applyDir(lng));
  applyDir(i18n.language || 'en');
}

export const LOCALE_STORAGE_KEY = STORAGE_KEY;
export default i18n;
