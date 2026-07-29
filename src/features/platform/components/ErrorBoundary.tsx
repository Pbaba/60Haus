import React, { ErrorInfo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from '../../../components/Button';
import { Theme } from '../../../theme';
import { loggingService } from '../services/loggingService';
import { AlertOctagon } from 'lucide-react-native';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    loggingService.error('React Render Error', error, { errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <AlertOctagon size={48} color={Theme.colors.danger} style={styles.icon} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.description}>
            We encountered an unexpected error. Our team has been notified.
          </Text>
          
          <Button variant="primary" onPress={this.handleReset} style={styles.btn}>
            Try Again
          </Button>
          
          {__DEV__ && (
            <ScrollView style={styles.devError}>
              <Text style={styles.devErrorText}>{this.state.error?.toString()}</Text>
            </ScrollView>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  icon: {
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.sizes.h3,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  btn: {
    minWidth: 200,
  },
  devError: {
    marginTop: Theme.spacing.xl,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    maxHeight: 200,
    width: '100%',
  },
  devErrorText: {
    color: Theme.colors.danger,
    fontSize: 10,
    fontFamily: 'monospace',
  }
});
