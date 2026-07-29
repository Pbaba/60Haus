import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Theme } from '../../../theme';

interface SearchChipProps {
  label: string;
  isActive?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export const SearchChip: React.FC<SearchChipProps> = ({
  label,
  isActive = false,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.chip,
        isActive && styles.activeChip,
        style,
      ]}
    >
      <Text style={[styles.label, isActive && styles.activeLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  activeChip: {
    backgroundColor: Theme.colors.primary + '15',
    borderColor: Theme.colors.primary,
  },
  label: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.textSecondary,
  },
  activeLabel: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
});
