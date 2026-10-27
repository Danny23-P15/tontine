import api from './api';

type LoginResponse = {
  access: string;
  refresh: string;
};

export const login = async (
  phoneNumber: string,
  password: string
) => {
  const response = await api.post<LoginResponse>('auth/token/', {
    phone_number: phoneNumber,
    password,
  });

  return response.data;
};

export const getMe = async () => {
  const response = await api.get('me/');
  return response.data;
};

export const refreshAccessToken = async (
  refreshToken: string
): Promise<string> => {
  const response = await api.post<{ access: string }>(
    'auth/token/refresh/',
    { refresh: refreshToken }
  );

  return response.data.access;
};