import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../components/ScreenContainer';
import { Theme } from '../theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft } from 'lucide-react-native';
import { useFeedback } from '../context/FeedbackContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { showTransactionFeedback, showToast } = useFeedback();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      showToast('Please complete all form fields.', 'warning');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, name);
      await showTransactionFeedback('success', 'Registration Successful', 'Welcome to 60Haus! Your account has been created successfully, and you are now signed in.');
      router.replace('/(tabs)' as any);
    } catch (error: any) {
      showTransactionFeedback('error', 'Registration Failed', error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer style={styles.container} scrollable>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/onboarding' as any)}>
        <ArrowLeft size={24} color={Theme.colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join 60Haus to discover properties immediately.</Text>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="e.g. Alex Mercer"
            value={name}
            onChangeText={setName}
          />
          <Input
            label="Email Address"
            placeholder="e.g. alex@60haus.app"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            placeholder="Min 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button variant="primary" style={styles.btn} loading={loading} onPress={handleRegister}>
            Create Account
          </Button>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  backBtn: {
    padding: Theme.spacing.lg,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xs,
  },
  title: {
    fontSize: Theme.typography.sizes.display,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    letterSpacing: Theme.typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.xl,
  },
  form: {
    width: '100%',
  },
  roleLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
    fontFamily: Theme.typography.fontFamilyMedium,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  roleBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  roleBtnActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '15',
  },
  roleText: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  roleTextActive: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyMedium,
  },
  btn: {
    marginTop: Theme.spacing.md,
    width: '100%',
  },
});
