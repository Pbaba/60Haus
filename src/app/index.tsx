import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Theme } from '../theme';
import { useAuth } from '../hooks/useAuth';

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Fade in logo
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (loading) return; // Keep rendering splash until initial session check finishes

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        if (user) {
          router.replace('/(tabs)' as any);
        } else {
          router.replace('/onboarding' as any);
        }
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [loading, user, fadeAnim, router]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.logo}>60Haus</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    fontSize: Theme.typography.sizes.splash,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    letterSpacing: Theme.typography.letterSpacing.tighter,
  },
});
