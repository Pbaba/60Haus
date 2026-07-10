import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../context/AuthContext';
import { ProfileProvider } from '../context/ProfileContext';
import { PropertyProvider } from '../context/PropertyContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Theme } from '../theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <ProfileProvider>
              <PropertyProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Theme.colors.background },
                  }}
                >
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="owner/upload" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="settings" options={{ presentation: 'card' }} />
                </Stack>
              </PropertyProvider>
            </ProfileProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
