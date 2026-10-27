import { create } from 'axios';
import { getAccessToken } from './tokenService';

const api = create({
  baseURL: 'http://192.168.1.159:8000/api/',
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;