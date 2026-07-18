import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Theme } from '../../theme';
import { useProperties } from '../../hooks/useProperties';
import { SavedSearchPanel } from '../../components/SavedSearchPanel';
import { SegmentedSelector } from '../../components/SelectionComponents';
import { Button } from '../../components/Button';
import { Search, History } from 'lucide-react-native';
import { CITIES } from '../../constants';

export default function DiscoverScreen() {
  const router = useRouter();
  const { filters, setFilters, filteredProperties, fetchFeed, loading } = useProperties();

  const [selectedCity, setSelectedCity] = useState(filters.city);
  const [selectedBhk, setSelectedBhk] = useState<number | null>(filters.bhk);
  const [selectedFurnishing, setSelectedFurnishing] = useState<string | null>(filters.furnishing);
  const [petFriendly, setPetFriendly] = useState(filters.petFriendly);
  const [listingType, setListingType] = useState<'rent' | 'buy'>(filters.listingType);

  useEffect(() => {
    setSelectedCity(filters.city);
    setSelectedBhk(filters.bhk);
    setSelectedFurnishing(filters.furnishing);
    setPetFriendly(filters.petFriendly);
    setListingType(filters.listingType);
  }, [filters]);

  const handleApply = (updatedFilters?: typeof filters) => {
    const target = updatedFilters || {
      city: selectedCity,
      bhk: selectedBhk,
      furnishing: selectedFurnishing,
      petFriendly,
      listingType,
    };
    setFilters(target);
    fetchFeed();
    router.replace('/(tabs)' as any);
  };

  const handleReset = () => {
    const defaults = {
      city: CITIES[0],
      bhk: null,
      furnishing: null,
      petFriendly: false,
      listingType: 'rent' as const,
    };
    setSelectedCity(defaults.city);
    setSelectedBhk(defaults.bhk);
    setSelectedFurnishing(defaults.furnishing);
    setPetFriendly(defaults.petFriendly);
    setListingType(defaults.listingType);
    setFilters(defaults);
    fetchFeed();
  };

  const getWelcomeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const matchCount = filteredProperties.length;

  return (
    <ScreenContainer style={styles.container} safeAreaBottom={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>{getWelcomeGreeting()}</Text>
          <Text style={styles.title}>Discover Properties</Text>
        </View>
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchBarWrapper}>
          <Search size={18} color={Theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search city, locality, properties..."
            placeholderTextColor={Theme.colors.textMuted}
            editable={false}
          />
        </View>

        <SavedSearchPanel
          currentFilters={filters}
          onApplyFilters={(f) => {
            setFilters(f);
            fetchFeed();
          }}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <View style={styles.recentSearchesPlaceholder}>
            <History size={16} color={Theme.colors.textMuted} />
            <Text style={styles.placeholderText}>Your recent searches will appear here</Text>
          </View>
        </View>

        <Text style={styles.sectionTitleMain}>Quick Filters</Text>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Transaction Type</Text>
          <SegmentedSelector
            options={[
              { id: 'rent', label: 'For Rent' },
              { id: 'buy', label: 'For Sale' },
            ]}
            selectedValue={listingType}
            onSelect={(val) => {
              setListingType(val as any);
              const next = { ...filters, listingType: val as any };
              setFilters(next);
            }}
          />
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Select City</Text>
          <SegmentedSelector
            options={CITIES.map(c => ({ id: c, label: c }))}
            selectedValue={selectedCity}
            onSelect={(c) => {
              setSelectedCity(c);
              const next = { ...filters, city: c };
              setFilters(next);
            }}
          />
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>BHK Configuration</Text>
          <SegmentedSelector
            options={[
              { id: null as any, label: 'Any BHK' },
              { id: 1, label: '1 BHK' },
              { id: 2, label: '2 BHK' },
              { id: 3, label: '3 BHK' },
              { id: 4, label: '4 BHK' },
            ]}
            selectedValue={selectedBhk}
            onSelect={(b) => {
              setSelectedBhk(b);
              const next = { ...filters, bhk: b };
              setFilters(next);
            }}
          />
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Furnishing Status</Text>
          <SegmentedSelector
            options={[
              { id: null as any, label: 'Any Furnishing' },
              { id: 'unfurnished', label: 'unfurnished' },
              { id: 'semi-furnished', label: 'semi-furnished' },
              { id: 'fully-furnished', label: 'fully-furnished' },
            ]}
            selectedValue={selectedFurnishing}
            onSelect={(f) => {
              setSelectedFurnishing(f);
              const next = { ...filters, furnishing: f };
              setFilters(next);
            }}
          />
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Additional Preferences</Text>
          <SegmentedSelector
            options={[
              { id: false, label: 'No Restrictions' },
              { id: true, label: 'Pet Friendly 🐾' },
            ]}
            selectedValue={petFriendly}
            onSelect={(p) => {
              setPetFriendly(p);
              const next = { ...filters, petFriendly: p };
              setFilters(next);
            }}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 100 }]}>
        <Button
          variant="primary"
          style={styles.applyBtn}
          onPress={() => handleApply()}
        >
          {loading ? 'Updating Feed...' : `View ${matchCount} properties`}
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
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: 54,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  greetingText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: Theme.typography.sizes.h2,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    color: Theme.colors.textPrimary,
    marginTop: 2,
  },
  resetBtn: {
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
    paddingVertical: Theme.spacing.lg,
    gap: Theme.spacing.xl,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.backgroundSecondary || '#1C1C1E',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    height: 48,
    paddingHorizontal: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamily,
  },
  section: {
    gap: Theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
  },
  sectionTitleMain: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
    marginTop: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: 6,
  },
  recentSearchesPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderColor: Theme.colors.border,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  placeholderText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textMuted,
  },
  filterSection: {
    gap: Theme.spacing.xs,
  },
  filterLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.textSecondary,
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
  },
  applyBtn: {
    width: '100%',
  },
});
