export const getAccessToken = () => {
  return localStorage.getItem("access_token");
};

export const isAuthenticated = () => {
  return !!getAccessToken();
};

export const logout = () => {
  localStorage.removeItem("access_token");
};

export const getToken = () => {
  return localStorage.getItem("access_token");
};

