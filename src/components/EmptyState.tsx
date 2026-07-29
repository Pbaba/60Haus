import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Theme } from '../theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {Icon && (
        <View style={styles.iconContainer}>
          <Icon size={32} color={Theme.colors.primary} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.actionsContainer}>
        {actionLabel && onAction && (
          <Button variant="primary" style={styles.actionBtn} onPress={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="secondary" style={styles.secondaryActionBtn} onPress={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xxxl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
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
    lineHeight: 22,
    marginBottom: Theme.spacing.xxl,
  },
  actionsContainer: {
    width: '100%',
    gap: Theme.spacing.md,
  },
  actionBtn: {
    width: '100%',
  },
  secondaryActionBtn: {
    width: '100%',
  },
});
