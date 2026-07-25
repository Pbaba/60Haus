import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Theme } from '../../../theme';
import { LeadStatus } from '../../../types';
import { ChevronDown } from 'lucide-react-native';

interface LeadStatusChipProps {
  status: LeadStatus;
  onPress: () => void;
  disabled?: boolean;
}

export const LeadStatusChip: React.FC<LeadStatusChipProps> = ({ status, onPress, disabled }) => {
  return (
    <TouchableOpacity 
      style={[styles.container, disabled && styles.disabled]} 
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>
        {status.replace('_', ' ').toUpperCase()}
      </Text>
      {!disabled && <ChevronDown size={14} color={Theme.colors.primary} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    backgroundColor: Theme.colors.primary + '15',
    borderRadius: Theme.borderRadius.full,
    gap: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontFamily: Theme.typography.fontFamilyBold,
    fontSize: 10,
    color: Theme.colors.primary,
  }
});
