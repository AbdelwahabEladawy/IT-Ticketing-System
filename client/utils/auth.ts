import Cookies from 'js-cookie';
import api from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'TECHNICIAN' | 'IT_ADMIN' | 'IT_MANAGER' | 'SUPER_ADMIN';
  specialization?: {
    id: string;
    name: string;
  };
  status?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  isOnline?: boolean;
  mustChangePassword?: boolean;
}

export const setToken = (token: string) => {
  Cookies.set('token', token, { expires: 7 });
};

export const getToken = () => {
  return Cookies.get('token');
};

export const removeToken = () => {
  Cookies.remove('token');
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = getToken();
    if (!token) return null;

    const response = await api.get('/auth/me');
    return response.data.user;
  } catch (error) {
    removeToken();
    return null;
  }
};

