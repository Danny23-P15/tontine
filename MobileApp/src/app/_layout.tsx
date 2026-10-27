import { Stack, router, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '../context/AuthContext';

function RootNavigation() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inLoginScreen = segments[0] === 'login';

    if (!isAuthenticated && !inLoginScreen) {
      router.replace('/login');
    }

    if (isAuthenticated && inLoginScreen) {
      router.replace('/groups');
    }
  }, [isAuthenticated, isLoading, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}