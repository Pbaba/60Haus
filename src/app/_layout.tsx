import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { TouchableOpacity } from 'react-native';
import { Bug } from 'lucide-react-native';

import { AuthProvider } from '../context/AuthContext';
import { ProfileProvider } from '../context/ProfileContext';
import { PropertyProvider } from '../context/PropertyContext';
import { ErrorBoundary } from '../features/platform/components/ErrorBoundary';
import { OfflineBanner } from '../features/platform/components/OfflineBanner';
import { connectivityService } from '../features/platform/services/connectivityService';
import { retryQueueService } from '../features/platform/services/retryQueueService';
import { Theme } from '../theme';

import { FeedbackProvider } from '../context/FeedbackContext';
import { ListingVerificationModal } from '../components/ListingVerificationModal';
import { PermissionProvider } from '../features/permissions/providers/PermissionProvider';
import { FeatureFlagProvider } from '../features/beta/providers/FeatureFlagProvider';
import { BetaFeedbackSheet } from '../features/beta/components/BetaFeedbackSheet';

SplashScreen.preventAutoHideAsync();

function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (!url) return;

      try {
        const parsed = Linking.parse(url);
        const path = parsed.path || '';

        if (path.startsWith('property/')) {
          const id = path.split('/')[1];
          if (id) router.push(`/property/${id}` as any);
        } else if (path.startsWith('collection/')) {
          const id = path.split('/')[1];
          if (id) router.push(`/collection/${id}` as any);
        } else if (path.startsWith('search/')) {
          const id = path.split('/')[1];
          if (id) router.push(`/search?searchId=${id}` as any);
        } else if (path.startsWith('compare/')) {
          const ids = path.split('/')[1];
          if (ids) router.push(`/compare?ids=${ids}` as any);
        }
      } catch (e) {
        console.warn('Failed to parse incoming deep link:', url, e);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    GeistRegular: require('../../assets/fonts/Geist_400Regular.ttf'),
    GeistMedium: require('../../assets/fonts/Geist_500Medium.ttf'),
    GeistSemiBold: require('../../assets/fonts/Geist_600SemiBold.ttf'),
    GeistBold: require('../../assets/fonts/Geist_700Bold.ttf'),
    LoraRegular: require('../../assets/fonts/Lora_400Regular.ttf'),
    LoraSemiBold: require('../../assets/fonts/Lora_600SemiBold.ttf'),
    LoraBold: require('../../assets/fonts/Lora_700Bold.ttf'),
  });

  const [showBetaFeedback, setShowBetaFeedback] = React.useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      
      // Initialize Platform Services
      connectivityService.init();
      retryQueueService.loadQueue();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <FeatureFlagProvider>
            <PermissionProvider>
              <FeedbackProvider>
                <AuthProvider>
                  <ProfileProvider>
                    <PropertyProvider>
                      <DeepLinkHandler />
                      <OfflineBanner />
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
                        <Stack.Screen name="collection/[id]" options={{ presentation: 'card' }} />
                        <Stack.Screen name="compare/index" options={{ presentation: 'card' }} />
                        <Stack.Screen name="owner/upload" options={{ presentation: 'modal' }} />
                        <Stack.Screen name="owner/success" options={{ presentation: 'card' }} />
                        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
                      </Stack>
                      <ListingVerificationModal />
                      
                      {/* Beta In-App Reporting */}
                      <BetaFeedbackSheet isVisible={showBetaFeedback} onClose={() => setShowBetaFeedback(false)} />
                      <TouchableOpacity 
                        style={{ position: 'absolute', bottom: 100, right: 20, backgroundColor: Theme.colors.primary, padding: 12, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }} 
                        onPress={() => setShowBetaFeedback(true)}
                      >
                        <Bug color="#fff" size={24} />
                      </TouchableOpacity>
                      
                    </PropertyProvider>
                  </ProfileProvider>
                </AuthProvider>
              </FeedbackProvider>
            </PermissionProvider>
          </FeatureFlagProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
