import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Theme } from '../theme';

export default function SplashScreen() {
  const router = useRouter();
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Transition to Onboarding
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        router.replace('/onboarding' as any);
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, [fadeAnim, router]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.logo}>60house</Text>
        <Text style={styles.tagline}>One Thumb. One Second.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 44,
    fontWeight: Theme.typography.weights.black,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: Theme.spacing.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
