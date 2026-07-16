import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '../context/AuthContext';
import { ProfileProvider } from '../context/ProfileContext';
import { PropertyProvider } from '../context/PropertyContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Theme } from '../theme';

import { FeedbackProvider } from '../context/FeedbackContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Geist — Primary UI font (bundled locally)
    GeistRegular: require('../../assets/fonts/Geist_400Regular.ttf'),
    GeistMedium: require('../../assets/fonts/Geist_500Medium.ttf'),
    GeistSemiBold: require('../../assets/fonts/Geist_600SemiBold.ttf'),
    GeistBold: require('../../assets/fonts/Geist_700Bold.ttf'),
    // Lora — Editorial font for titles & headings (bundled locally)
    LoraRegular: require('../../assets/fonts/Lora_400Regular.ttf'),
    LoraSemiBold: require('../../assets/fonts/Lora_600SemiBold.ttf'),
    LoraBold: require('../../assets/fonts/Lora_700Bold.ttf'),
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
          <FeedbackProvider>
            <AuthProvider>
              <ProfileProvider>
                <PropertyProvider>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: {
                        backgroundColor: Theme.colors.background,
                      },
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="onboarding" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="register" />
                    <Stack.Screen name="search" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                      name="owner/upload"
                      options={{ presentation: 'modal' }}
                    />
                    <Stack.Screen
                      name="settings"
                      options={{ presentation: 'card' }}
                    />
                  </Stack>
                </PropertyProvider>
              </ProfileProvider>
            </AuthProvider>
          </FeedbackProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}