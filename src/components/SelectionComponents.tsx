import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Theme } from '../theme';

export interface SelectorOption<T> {
  id: T;
  label: string;
}

interface SegmentedSelectorProps<T> {
  options: SelectorOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
}

/**
 * Premium Segmented Control for mutually exclusive options.
 * Equal-width responsive buttons, center-aligned, single line, no scrolling.
 */
export function SegmentedSelector<T>({
  options,
  selectedValue,
  onSelect,
  disabled = false,
}: SegmentedSelectorProps<T>) {
  return (
    <View style={styles.segmentedContainer}>
      {options.map((option) => {
        const isActive = selectedValue === option.id;
        return (
          <TouchableOpacity
            key={String(option.id)}
            style={[
              styles.segmentBtn,
              isActive && styles.segmentBtnActive,
            ]}
            onPress={() => onSelect(option.id)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive, disabled }}
            accessibilityLabel={option.label}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.segmentText,
                isActive && styles.segmentTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface TagCarouselProps<T> {
  options: SelectorOption<T>[];
  selectedValues: T[];
  onToggle: (value: T) => void;
  disabled?: boolean;
}

/**
 * Horizontally scrollable carousel list for multi-select categories.
 * Uniform chip heights, hidden scrollbars, single-line labels.
 */
export function TagCarousel<T>({
  options,
  selectedValues,
  onToggle,
  disabled = false,
}: TagCarouselProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContainer}
      style={styles.carouselScrollView}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((option) => {
        const isActive = selectedValues.includes(option.id);
        return (
          <TouchableOpacity
            key={String(option.id)}
            style={[
              styles.tagChip,
              isActive && styles.tagChipActive,
            ]}
            onPress={() => onToggle(option.id)}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isActive, disabled }}
            accessibilityLabel={option.label}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.tagText,
                isActive && styles.tagTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segmentedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Theme.colors.backgroundSecondary || '#1C1C1E',
    borderRadius: Theme.borderRadius.md,
    padding: 4,
    gap: 4,
    width: '100%',
  },
  segmentBtn: {
    flex: 1,
    flexGrow: 1,
    minWidth: 80,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.md - 2,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
  },
  segmentBtnActive: {
    backgroundColor: Theme.colors.surface || '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.5,
    elevation: 2,
    borderColor: Theme.colors.primary,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilyMedium,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  carouselScrollView: {
    flexGrow: 0,
    width: '100%',
  },
  carouselContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 32, // safe trailing boundary padding
    gap: Theme.spacing.sm,
    paddingVertical: 2, // minor padding buffer to avoid shadow clip
  },
  tagChip: {
    height: 38,
    minWidth: 90,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surface || '#1C1C1E',
    borderColor: Theme.colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagChipActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '15',
  },
  tagText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
  },
  tagTextActive: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
});
