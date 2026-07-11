import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { Theme } from '../../theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      if (!url) return;

      try {
        const getSingleParam = (param: string | string[] | undefined): string => {
          if (!param) return '';
          return Array.isArray(param) ? param[0] : param;
        };

        const parsed = Linking.parse(url);
        const tokenHash = getSingleParam(parsed.queryParams?.token_hash);
        const type = getSingleParam(parsed.queryParams?.type);
        let accessToken = getSingleParam(parsed.queryParams?.access_token);
        let refreshToken = getSingleParam(parsed.queryParams?.refresh_token);

        // Fallback: Check hash segments for access/refresh tokens
        if (!accessToken && url.includes('#')) {
          const hashSegment = url.split('#')[1];
          const hashParams = new URLSearchParams(hashSegment);
          accessToken = hashParams.get('access_token') || '';
          refreshToken = hashParams.get('refresh_token') || '';
        }

        // 1. Process OTP token verification (standard signup/invite confirmation links)
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (error) throw error;
        }
        // 2. Process OAuth/Magic Link session exchange
        else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        // Verify if session was established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          setStatus('success');
          // Auto route to Feed tabs after 1.5 seconds to show visual success confirmation
          setTimeout(() => {
            router.replace('/(tabs)' as any);
          }, 1500);
        } else {
          throw new Error('No active authentication session could be verified.');
        }
      } catch (err: any) {
        console.error('Email verification callback failed:', err);
        setStatus('error');
        setErrorMsg(err?.message || 'Verification link is expired or invalid.');
      }
    };

    processCallback();
  }, [url, router]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <View style={styles.content}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.title}>Verifying Account</Text>
            <Text style={styles.subtitle}>Securing credentials and mapping user session parameters...</Text>
          </View>
        );
      case 'success':
        return (
          <View style={styles.content}>
            <CheckCircle size={64} color={Theme.colors.primary} />
            <Text style={styles.title}>Email Verified!</Text>
            <Text style={styles.subtitle}>Your account has been authenticated. Redirecting to feed...</Text>
          </View>
        );
      case 'error':
        return (
          <View style={styles.content}>
            <XCircle size={64} color={Theme.colors.danger} />
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.subtitle}>{errorMsg}</Text>
            <Button
              variant="primary"
              style={styles.btn}
              onPress={() => router.replace('/login' as any)}
            >
              Back to Sign In
            </Button>
          </View>
        );
    }
  };

  return <ScreenContainer style={styles.container}>{renderContent()}</ScreenContainer>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xxl,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
    width: '100%',
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: Theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Theme.spacing.lg,
  },
  btn: {
    marginTop: Theme.spacing.lg,
    width: '80%',
    maxWidth: 240,
  },
});
