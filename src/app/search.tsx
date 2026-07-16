import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../components/ScreenContainer';
import { Theme } from '../theme';
import { Button } from '../components/Button';
import { CITIES } from '../constants';
import { useProperties } from '../hooks/useProperties';
import { ArrowLeft } from 'lucide-react-native';

export default function SearchScreen() {
  const router = useRouter();
  const { filters, setFilters } = useProperties();

  const [selectedCity, setSelectedCity] = useState(filters.city);
  const [selectedBhk, setSelectedBhk] = useState<number | null>(filters.bhk);
  const [selectedFurnishing, setSelectedFurnishing] = useState<string | null>(filters.furnishing);
  const [petFriendly, setPetFriendly] = useState(filters.petFriendly);
  const [listingType, setListingType] = useState<'rent' | 'buy'>(filters.listingType);

  const handleApply = () => {
    setFilters({
      city: selectedCity,
      bhk: selectedBhk,
      furnishing: selectedFurnishing,
      petFriendly,
      listingType,
    });
    router.replace('/(tabs)' as any);
  };

  const handleReset = () => {
    setSelectedCity(CITIES[0]);
    setSelectedBhk(null);
    setSelectedFurnishing(null);
    setPetFriendly(false);
    setListingType('rent');
  };

  const handleBack = () => {
    router.replace('/(tabs)' as any);
  };

  return (
    <ScreenContainer style={styles.container}>
      {/* Header controls */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <ArrowLeft size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Search Filters</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetTextBtn}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Main scrolling filter container */}
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

        {/* City Selection */}
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
                Pet Friendly 🐾
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Footer controls */}
      <View style={styles.footer}>
        <Button style={styles.applyBtn} onPress={handleApply}>
          Apply Filters
        </Button>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: 54,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surface,
  },
  backBtn: {
    padding: Theme.spacing.xs,
  },
  title: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  resetTextBtn: {
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
  },
  resetText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.xl,
    gap: Theme.spacing.xxl,
  },
  section: {
    gap: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wider,
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
    backgroundColor: Theme.colors.surface,
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
    fontFamily: Theme.typography.fontFamilyBold,
  },
  footer: {
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  applyBtn: {
    width: '100%',
  },
});
