import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Theme } from '../theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focusedInput,
          !!error && styles.errorInput,
        ]}
      >
        <TextInput
          placeholderTextColor={Theme.colors.textMuted}
          style={[styles.input, inputStyle]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Theme.spacing.md,
  },
  label: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: Theme.typography.weights.medium,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
    fontFamily: Theme.typography.fontFamily,
  },
  inputWrapper: {
    width: '100%',
    height: 48,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderColor: Theme.colors.border,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.md,
  },
  input: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamily,
    padding: 0,
  },
  focusedInput: {
    borderColor: Theme.colors.primary,
  },
  errorInput: {
    borderColor: Theme.colors.danger,
  },
  errorText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.danger,
    marginTop: Theme.spacing.xs,
    fontFamily: Theme.typography.fontFamily,
  },
});
