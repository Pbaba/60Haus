import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheet } from '../BottomSheet';
import { Theme } from '../../theme';
import { Button } from '../Button';
import { CITIES } from '../../constants';

export interface SearchFilters {
  city: string;
  bhk: number | null;
  furnishing: string | null;
  petFriendly: boolean;
  listingType: 'rent' | 'buy';
  minPrice?: number;
  maxPrice?: number;
}

export interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onApplyFilters: (filters: SearchFilters) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
}) => {
  const [selectedCity, setSelectedCity] = useState(filters.city);
  const [selectedBhk, setSelectedBhk] = useState<number | null>(filters.bhk);
  const [selectedFurnishing, setSelectedFurnishing] = useState<string | null>(filters.furnishing);
  const [petFriendly, setPetFriendly] = useState(filters.petFriendly);
  const [listingType, setListingType] = useState<'rent' | 'buy'>(filters.listingType);

  const handleApply = () => {
    onApplyFilters({
      city: selectedCity,
      bhk: selectedBhk,
      furnishing: selectedFurnishing,
      petFriendly,
      listingType,
    });
  };

  const handleReset = () => {
    setSelectedCity(CITIES[0]);
    setSelectedBhk(null);
    setSelectedFurnishing(null);
    setPetFriendly(false);
    setListingType('rent');
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Filter Listings">
      <View style={styles.innerContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Transaction Type (Rent/Buy) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Type</Text>
            <View style={styles.chipContainer}>
              {(['rent', 'buy'] as const).map((type) => {
                const isActive = listingType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={Theme.motion.presets.press.scale}
                    style={[styles.chip, isActive && styles.activeChip]}
                    onPress={() => setListingType(type)}
                  >
                    <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                      For {type === 'rent' ? 'Rent' : 'Buy'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* City Select */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select City</Text>
            <View style={styles.chipContainer}>
              {CITIES.map((city) => {
                const isActive = selectedCity === city;
                return (
                  <TouchableOpacity
                    key={city}
                    activeOpacity={Theme.motion.presets.press.scale}
                    style={[styles.chip, isActive && styles.activeChip]}
                    onPress={() => setSelectedCity(city)}
                  >
                    <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                      {city}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* BHK Config */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BHK Configuration</Text>
            <View style={styles.chipContainer}>
              {[1, 2, 3, 4].map((bhkVal) => {
                const isActive = selectedBhk === bhkVal;
                return (
                  <TouchableOpacity
                    key={bhkVal}
                    activeOpacity={Theme.motion.presets.press.scale}
                    style={[styles.chip, isActive && styles.activeChip]}
                    onPress={() => setSelectedBhk(isActive ? null : bhkVal)}
                  >
                    <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                      {bhkVal} BHK
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Furnishing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Furnishing Status</Text>
            <View style={styles.chipContainer}>
              {['unfurnished', 'semi-furnished', 'fully-furnished'].map((status) => {
                const isActive = selectedFurnishing === status;
                return (
                  <TouchableOpacity
                    key={status}
                    activeOpacity={Theme.motion.presets.press.scale}
                    style={[styles.chip, isActive && styles.activeChip]}
                    onPress={() => setSelectedFurnishing(isActive ? null : status)}
                  >
                    <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                      {status.replace('-', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Additional Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.chipContainer}>
              <TouchableOpacity
                activeOpacity={Theme.motion.presets.press.scale}
                style={[styles.chip, petFriendly && styles.activeChip]}
                onPress={() => setPetFriendly(!petFriendly)}
              >
                <Text style={[styles.chipText, petFriendly && styles.activeChipText]}>
                  Pet Friendly
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Footer controls */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset All</Text>
          </TouchableOpacity>
          <Button style={styles.applyBtn} onPress={handleApply}>
            Apply Filters
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingVertical: Theme.spacing.md,
    gap: Theme.spacing.lg,
  },
  section: {
    gap: Theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  chip: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  activeChip: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '15',
  },
  chipText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'capitalize',
  },
  activeChipText: {
    color: Theme.colors.primary,
    fontWeight: Theme.typography.weights.bold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  resetBtn: {
    paddingVertical: Theme.spacing.sm,
  },
  resetText: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  applyBtn: {
    flex: 1,
    marginLeft: Theme.spacing.xl,
  },
});
