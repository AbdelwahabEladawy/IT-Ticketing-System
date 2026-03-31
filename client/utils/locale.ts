import i18n from '../i18n';
import api from './api';
import { getToken } from './auth';
import { LOCALE_STORAGE_KEY } from '../i18n';

export type AppLocale = 'en' | 'ar';

export function applyDocumentLanguage(lng: AppLocale) {
  if (typeof document === 'undefined') return;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
}

/** Call after login or when user switches language */
export async function setAppLanguage(lng: AppLocale) {
  await i18n.changeLanguage(lng);
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCALE_STORAGE_KEY, lng);
    applyDocumentLanguage(lng);
  }
  const token = getToken();
  if (token) {
    try {
      await api.patch('/auth/locale', { locale: lng });
    } catch {
      // offline / session — UI still updated
    }
  }
}

/** Apply dir/lang from localStorage (before React paints) */
export function hydrateDirFromStorage() {
  if (typeof window === 'undefined') return;
  const lng = (localStorage.getItem(LOCALE_STORAGE_KEY) as AppLocale) || 'en';
  applyDocumentLanguage(lng === 'ar' ? 'ar' : 'en');
}
