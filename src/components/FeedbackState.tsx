import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { BookmarkX, Search, FolderOpen, AlertTriangle } from 'lucide-react-native';
import { Theme } from '../theme';
import { Button } from './Button';

export interface FeedbackStateProps {
  type: 'loading' | 'empty-saved' | 'empty-search' | 'empty-listings' | 'error';
  onRetry?: () => void;
  title?: string;
  subtitle?: string;
}

export const FeedbackState: React.FC<FeedbackStateProps> = ({
  type,
  onRetry,
  title,
  subtitle,
}) => {
  const renderContent = () => {
    switch (type) {
      case 'loading':
        return (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.title}>{title || 'Loading content...'}</Text>
          </View>
        );
      case 'empty-saved':
        return (
          <View style={styles.center}>
            <BookmarkX size={48} color={Theme.colors.primary} />
            <Text style={styles.title}>{title || 'No Saved Homes'}</Text>
            <Text style={styles.subtitle}>
              {subtitle || 'Explore listing walkthroughs on the Feed to save your favorites.'}
            </Text>
          </View>
        );
      case 'empty-search':
        return (
          <View style={styles.center}>
            <Search size={48} color={Theme.colors.primary} />
            <Text style={styles.title}>{title || 'No Search Results'}</Text>
            <Text style={styles.subtitle}>
              {subtitle || "We couldn't find listings matching your search options. Try resetting filters."}
            </Text>
          </View>
        );
      case 'empty-listings':
        return (
          <View style={styles.center}>
            <FolderOpen size={48} color={Theme.colors.primary} />
            <Text style={styles.title}>{title || 'No Uploaded Listings'}</Text>
            <Text style={styles.subtitle}>
              {subtitle || 'Start listing your walkthrough videos to publish property items.'}
            </Text>
          </View>
        );
      case 'error':
        return (
          <View style={styles.center}>
            <AlertTriangle size={48} color={Theme.colors.danger} />
            <Text style={styles.title}>{title || 'Something went wrong'}</Text>
            <Text style={styles.subtitle}>
              {subtitle || 'Failed to sync listing feed. Check connection and retry.'}
            </Text>
            {onRetry && (
              <Button variant="secondary" style={styles.retryBtn} onPress={onRetry}>
                Retry Connection
              </Button>
            )}
          </View>
        );
    }
  };

  return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xxl,
    backgroundColor: 'transparent',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: Theme.spacing.md,
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
  retryBtn: {
    marginTop: Theme.spacing.lg,
  },
});
