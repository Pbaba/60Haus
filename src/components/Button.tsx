import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Theme } from '../theme';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...props
}) => {
  const buttonStyles = [
    styles.baseButton,
    styles[`${variant}Button`],
    styles[`${size}Button`],
    (disabled || loading) && styles.disabledButton,
    style,
  ] as ViewStyle[];

  const textStyles = [
    styles.baseText,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ] as TextStyle[];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={buttonStyles}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Theme.colors.textOnPrimary : Theme.colors.primary}
          size="small"
        />
      ) : typeof children === 'string' ? (
        <Text style={textStyles}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  baseText: {
    fontFamily: Theme.typography.fontFamily,
    fontWeight: Theme.typography.weights.semiBold,
    textAlign: 'center',
  },
  
  // Variants
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    ...Theme.shadows.sm,
  },
  primaryText: {
    color: Theme.colors.textOnPrimary,
  },
  
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: Theme.colors.border,
  },
  secondaryText: {
    color: Theme.colors.textPrimary,
  },
  
  textButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  textText: {
    color: Theme.colors.primary,
  },
  
  // Sizes
  smButton: {
    height: 36,
    paddingHorizontal: Theme.spacing.md,
  },
  smText: {
    fontSize: Theme.typography.sizes.sm,
  },
  
  mdButton: {
    height: 48,
    paddingHorizontal: Theme.spacing.lg,
  },
  mdText: {
    fontSize: Theme.typography.sizes.md,
  },
  
  lgButton: {
    height: 56,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.lg,
  },
  lgText: {
    fontSize: Theme.typography.sizes.lg,
  },
  
  // States
  disabledButton: {
    opacity: Theme.opacity.muted,
  },
  disabledText: {
    opacity: Theme.opacity.muted,
  },
});
