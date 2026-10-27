import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { isAxiosError } from 'axios';

import {
  getMe,
  login as loginRequest,
  refreshAccessToken,
} from '../services/authService';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveTokens,
} from '../services/tokenService';

type User = {
  id: number;
  full_name: string;
  phone_number: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (
    phoneNumber: string,
    password: string
  ) => Promise<void>;

  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;

  const getCurrentUser = useCallback(async () => {
    try {
      return await getMe();
    } catch (error) {
      if (!isAxiosError(error) || error.response?.status !== 401) {
        throw error;
      }

      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        await clearTokens();
        throw error;
      }

      try {
        const accessToken = await refreshAccessToken(refreshToken);
        await saveAccessToken(accessToken);
        return await getMe();
      } catch (refreshError) {
        if (
          isAxiosError(refreshError) &&
          refreshError.response?.status === 401
        ) {
          await clearTokens();
        }

        throw refreshError;
      }
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      try {
        const token = await getAccessToken();

        if (!token) {
          return;
        }

        const currentUser = await getCurrentUser();

        if (isActive) {
          setUser(currentUser);
        }
      } catch (error) {
        if (isAxiosError(error)) {
          console.warn('Impossible de restaurer la session', {
            status: error.response?.status,
            message: error.message,
          });
        } else {
          console.warn('Impossible de restaurer la session', error);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, [getCurrentUser]);

  const login = async (
    phoneNumber: string,
    password: string
  ) => {
    const data = await loginRequest(phoneNumber, password);

    await saveTokens(data.access, data.refresh);

    const currentUser = await getCurrentUser();

    setUser(currentUser);
  };

  const logout = async () => {
    await clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth doit être utilisé à l’intérieur de AuthProvider'
    );
  }

  return context;
}
