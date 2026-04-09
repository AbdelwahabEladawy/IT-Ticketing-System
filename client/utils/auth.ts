import Cookies from 'js-cookie';
import api from './api';

const TOKEN_COOKIE_DAYS = 3650;
const CACHED_USER_STORAGE_KEY = 'auth:user';
const LOGIN_CREDENTIALS_STORAGE_KEY = 'auth:login-credentials';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'BASIC_USER' | 'HELP_DESK' | 'TECHNICIAN' | 'IT_ADMIN' | 'IT_MANAGER' | 'SUPER_ADMIN' | 'SOFTWARE_ENGINEER';
  preferredLocale?: 'en' | 'ar';
  specialization?: {
    id: string;
    name: string;
  };
  status?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  isOnline?: boolean;
  mustChangePassword?: boolean;
}

export interface SavedLoginCredentials {
  email: string;
  password: string;
}

const isBrowser = () => typeof window !== 'undefined';

const readStorage = <T>(key: string): T | null => {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: unknown) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const removeStorage = (key: string) => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
};

export const setToken = (token: string) => {
  Cookies.set('token', token, { expires: TOKEN_COOKIE_DAYS, sameSite: 'lax' });
};

export const getToken = () => {
  return Cookies.get('token');
};

export const removeToken = () => {
  Cookies.remove('token');
};

export const setCachedUser = (user: User | null) => {
  if (!user) {
    removeStorage(CACHED_USER_STORAGE_KEY);
    return;
  }

  writeStorage(CACHED_USER_STORAGE_KEY, user);
};

export const getCachedUser = (): User | null => {
  return readStorage<User>(CACHED_USER_STORAGE_KEY);
};

export const saveLoginCredentials = (credentials: SavedLoginCredentials) => {
  writeStorage(LOGIN_CREDENTIALS_STORAGE_KEY, credentials);
};

export const getSavedLoginCredentials = (): SavedLoginCredentials | null => {
  return readStorage<SavedLoginCredentials>(LOGIN_CREDENTIALS_STORAGE_KEY);
};

export const clearSavedLoginCredentials = () => {
  removeStorage(LOGIN_CREDENTIALS_STORAGE_KEY);
};

export const persistAuthSession = (token: string, user?: User | null) => {
  setToken(token);
  if (user) {
    setCachedUser(user);
  }
};

export const clearAuthState = (options: { clearSavedCredentials?: boolean } = {}) => {
  removeToken();
  setCachedUser(null);

  if (options.clearSavedCredentials) {
    clearSavedLoginCredentials();
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const token = getToken();
  if (!token) {
    setCachedUser(null);
    return null;
  }

  try {
    const response = await api.get('/auth/me');
    const user = response.data.user as User;
    setCachedUser(user);
    return user;
  } catch {
    return getCachedUser();
  }
};

