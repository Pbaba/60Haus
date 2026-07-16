import React from 'react';
import { StyleSheet, Text, View, ImageBackground, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Theme } from '../theme';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';

export default function OnboardingScreen() {
  const router = useRouter();
  const { enterAsGuest } = useAuth();

  const handleGuestEntry = () => {
    enterAsGuest();
    router.replace('/(tabs)' as any);
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' }}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.logo}>60Haus</Text>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.title}>Discover your next home in 60 seconds.</Text>
            <Text style={styles.subtitle}>Full-screen vertical videos that bring properties to life.</Text>
            
            <View style={styles.btnContainer}>
              <Button style={styles.btn} variant="primary" onPress={handleGuestEntry}>
                Explore as Guest
              </Button>
              <Button style={styles.btn} variant="secondary" onPress={() => router.replace('/login' as any)}>
                Sign In
              </Button>
              <TouchableOpacity onPress={() => router.replace('/register' as any)} style={styles.registerLink}>
                <Text style={styles.registerText}>Don't have an account? Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 11, 0.7)',
    justifyContent: 'space-between',
    padding: Theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: Theme.spacing.xxl,
  },
  logo: {
    fontSize: Theme.typography.sizes.h1,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
    letterSpacing: Theme.typography.letterSpacing.tight,
  },
  footer: {
    marginBottom: Theme.spacing.xxl,
    gap: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.sizes.display,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    lineHeight: Theme.typography.lineHeights.hero,
    letterSpacing: Theme.typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    lineHeight: Theme.typography.lineHeights.xl,
    marginBottom: Theme.spacing.md,
  },
  btnContainer: {
    gap: Theme.spacing.md,
  },
  btn: {
    width: '100%',
  },
  registerLink: {
    alignSelf: 'center',
    marginTop: Theme.spacing.sm,
  },
  registerText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
  },
});
