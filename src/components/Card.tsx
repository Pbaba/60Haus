import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { Theme } from '../theme';

export interface CardProps extends ViewProps {
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  style,
  ...props
}) => {
  return (
    <View
      style={[
        styles.card,
        elevated ? styles.elevatedCard : styles.flatCard,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    overflow: 'hidden',
  },
  flatCard: {
    backgroundColor: Theme.colors.surface,
    borderColor: Theme.colors.border,
    borderWidth: 1,
  },
  elevatedCard: {
    backgroundColor: Theme.colors.surfaceElevated,
    ...Theme.shadows.md,
  },
});
