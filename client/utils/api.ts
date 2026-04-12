import axios from 'axios';
import Cookies from 'js-cookie';
import { getPublicApiBaseUrl } from './publicApiUrl';

const api = axios.create();

api.interceptors.request.use((config) => {
  config.baseURL = getPublicApiBaseUrl();
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;

