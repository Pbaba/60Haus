import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheet } from '../../../components/BottomSheet';
import { Theme } from '../../../theme';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { CITIES } from '../../../constants';
// Remove unused imports
import { ChevronDown, ChevronUp } from 'lucide-react-native';

export interface SearchFilters {
  query?: string;
  city: string;
  bhk: number | null;
  furnishing: string | null;
  petFriendly: boolean;
  listingType: 'rent' | 'buy';
  minPrice?: number;
  maxPrice?: number;
  localities?: string[];
  maxMetroDist?: number;
  maxHospitalDist?: number;
  maxSchoolDist?: number;
  maxParkDist?: number;
  maxMallDist?: number;
  lifestyleFriendly?: string[];
  maxCommuteAirport?: number;
  maxCommuteMetro?: number;
  maxCommuteBusiness?: number;
  propertyType?: string | null;
  bathrooms?: number | null;
  propertyAge?: number | null;
  ownershipType?: string | null;
  minCarpetArea?: number | null;
  maxCarpetArea?: number | null;
  maxDeposit?: number | null;
  maxMaintenance?: number | null;
  amenities?: string[];
  trustFilters?: string[];
  sortBy?: string;
  minHealthScore?: number;
}

export interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onApplyFilters: (filters: SearchFilters) => void;
}

const AccordionSection: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onReset?: () => void;
  children: React.ReactNode;
}> = ({ title, isOpen, onToggle, onReset, children }) => {
  return (
    <View style={styles.accordionContainer}>
      <View style={styles.accordionHeader}>
        <TouchableOpacity style={styles.accordionTitleBtn} onPress={onToggle} activeOpacity={0.7}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {isOpen ? (
            <ChevronUp size={16} color={Theme.colors.primary} />
          ) : (
            <ChevronDown size={16} color={Theme.colors.textSecondary} />
          )}
        </TouchableOpacity>
        {onReset && (
          <TouchableOpacity onPress={onReset} style={styles.sectionResetBtn} activeOpacity={0.7}>
            <Text style={styles.sectionResetText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
      {isOpen && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
};

export const FilterSheet: React.FC<FilterSheetProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
}) => {
  const [selectedCity, setSelectedCity] = useState(filters.city || CITIES[0]);
  const [listingType, setListingType] = useState<'rent' | 'buy'>(filters.listingType || 'rent');
  const [sortBy, setSortBy] = useState<string>(filters.sortBy || 'newest');

  // Pricing
  const [minPrice, setMinPrice] = useState<string>(filters.minPrice ? String(filters.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState<string>(filters.maxPrice ? String(filters.maxPrice) : '');
  const [maxDeposit, setMaxDeposit] = useState<string>(filters.maxDeposit ? String(filters.maxDeposit) : '');

  // Specs
  const [propertyType, setPropertyType] = useState<string | null>(filters.propertyType || null);
  const [selectedBhk, setSelectedBhk] = useState<number | null>(filters.bhk || null);
  const [bathrooms, setBathrooms] = useState<number | null>(filters.bathrooms || null);
  const [furnishing, setFurnishing] = useState<string | null>(filters.furnishing || null);

  // Area
  const [minCarpetArea, setMinCarpetArea] = useState<string>(filters.minCarpetArea ? String(filters.minCarpetArea) : '');
  const [maxCarpetArea, setMaxCarpetArea] = useState<string>(filters.maxCarpetArea ? String(filters.maxCarpetArea) : '');

  // Amenities & Trust
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(filters.amenities || []);
  const [trustFilters, setTrustFilters] = useState<string[]>(filters.trustFilters || []);
  const [minHealthScore, setMinHealthScore] = useState<number>(filters.minHealthScore || 0);

  const [openSection, setOpenSection] = useState<string | null>('pricing');

  const toggleSection = (sectionName: string) => {
    setOpenSection(prev => (prev === sectionName ? null : sectionName));
  };

  const handleApply = () => {
    onApplyFilters({
      ...filters, // preserve query/localities
      city: selectedCity,
      listingType,
      sortBy,
      bhk: selectedBhk,
      furnishing,
      petFriendly: selectedAmenities.includes('pet-friendly'),
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      propertyType,
      bathrooms,
      minCarpetArea: minCarpetArea ? parseFloat(minCarpetArea) : null,
      maxCarpetArea: maxCarpetArea ? parseFloat(maxCarpetArea) : null,
      maxDeposit: maxDeposit ? parseFloat(maxDeposit) : null,
      amenities: selectedAmenities,
      trustFilters,
      minHealthScore: minHealthScore > 0 ? minHealthScore : undefined,
    });
  };

  const handleResetAll = () => {
    setSelectedCity(CITIES[0]);
    setListingType('rent');
    setSortBy('newest');
    setMinPrice('');
    setMaxPrice('');
    setMaxDeposit('');
    setPropertyType(null);
    setSelectedBhk(null);
    setBathrooms(null);
    setFurnishing(null);
    setMinCarpetArea('');
    setMaxCarpetArea('');
    setSelectedAmenities([]);
    setTrustFilters([]);
    setMinHealthScore(0);
  };



  const toggleTrustFilter = (id: string) => {
    setTrustFilters(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Advanced Filters">
      <View style={styles.innerContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Sort By</Text>
            <View style={styles.chipContainer}>
              {[
                { id: 'newest', label: 'Newest' },
                { id: 'price-low-high', label: 'Price: Low → High' },
                { id: 'price-high-low', label: 'Price: High → Low' },
                { id: 'most-trusted', label: 'Most Trusted' },
                { id: 'recently-verified', label: 'Recently Verified' },
                { id: 'area', label: 'Largest Area' },
              ].map(opt => {
                const active = sortBy === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={0.7}
                    style={[styles.chip, active && styles.activeChip]}
                    onPress={() => setSortBy(opt.id)}
                  >
                    <Text style={[styles.chipText, active && styles.activeChipText]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Listing Type</Text>
            <View style={styles.chipContainer}>
              {[
                { id: 'rent', label: 'For Rent' },
                { id: 'buy', label: 'For Sale' },
              ].map(type => {
                const isActive = listingType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    activeOpacity={0.7}
                    style={[styles.chip, isActive && styles.activeChip]}
                    onPress={() => setListingType(type.id as any)}
                  >
                    <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />

          <AccordionSection
            title="Pricing Range"
            isOpen={openSection === 'pricing'}
            onToggle={() => toggleSection('pricing')}
          >
            <View style={styles.inputsRow}>
              <Input
                label={listingType === 'rent' ? 'Min Rent' : 'Min Price'}
                placeholder="e.g. 10000"
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
                style={{ flex: 1 }}
              />
              <Input
                label={listingType === 'rent' ? 'Max Rent' : 'Max Price'}
                placeholder="e.g. 50000"
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
                style={{ flex: 1 }}
              />
            </View>
          </AccordionSection>

          <AccordionSection
            title="Property Specifications"
            isOpen={openSection === 'specs'}
            onToggle={() => toggleSection('specs')}
          >
            <Text style={styles.subLabel}>BHK Configurations</Text>
            <View style={[styles.chipContainer, { marginBottom: Theme.spacing.md }]}>
              {[1, 2, 3, 4].map(b => {
                const active = selectedBhk === b;
                return (
                  <TouchableOpacity
                    key={b}
                    style={[styles.chip, active && styles.activeChip]}
                    onPress={() => setSelectedBhk(active ? null : b)}
                  >
                    <Text style={[styles.chipText, active && styles.activeChipText]}>
                      {b} BHK
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.subLabel}>Property Type</Text>
            <View style={[styles.chipContainer, { marginBottom: Theme.spacing.md }]}>
              {['apartment', 'house', 'villa'].map(t => {
                const active = propertyType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, active && styles.activeChip]}
                    onPress={() => setPropertyType(active ? null : t)}
                  >
                    <Text style={[styles.chipText, active && styles.activeChipText]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <Text style={styles.subLabel}>Furnishing Status</Text>
            <View style={[styles.chipContainer, { marginBottom: Theme.spacing.md }]}>
              {['unfurnished', 'semi-furnished', 'fully-furnished'].map(f => {
                const active = furnishing === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, active && styles.activeChip]}
                    onPress={() => setFurnishing(active ? null : f)}
                  >
                    <Text style={[styles.chipText, active && styles.activeChipText]}>
                      {f.replace('-', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </AccordionSection>

          <AccordionSection
            title="Area Limits (Sq.ft)"
            isOpen={openSection === 'area'}
            onToggle={() => toggleSection('area')}
          >
            <View style={styles.inputsRow}>
              <Input
                label="Min Area"
                placeholder="e.g. 500"
                keyboardType="numeric"
                value={minCarpetArea}
                onChangeText={setMinCarpetArea}
                style={{ flex: 1 }}
              />
              <Input
                label="Max Area"
                placeholder="e.g. 2000"
                keyboardType="numeric"
                value={maxCarpetArea}
                onChangeText={setMaxCarpetArea}
                style={{ flex: 1 }}
              />
            </View>
          </AccordionSection>

          <AccordionSection
            title="Trust & Integrity"
            isOpen={openSection === 'trust'}
            onToggle={() => toggleSection('trust')}
          >
            <View style={styles.chipContainer}>
              {[
                { id: 'verified', label: 'Verified Owner' },
                { id: 'walkthrough', label: 'Walkthrough Video Available' },
                { id: 'top-rated', label: 'Top Rated Reliability' }
              ].map(badge => {
                const active = trustFilters.includes(badge.id);
                return (
                  <TouchableOpacity
                    key={badge.id}
                    activeOpacity={0.7}
                    style={[styles.chip, active && styles.activeChip]}
                    onPress={() => toggleTrustFilter(badge.id)}
                  >
                    <Text style={[styles.chipText, active && styles.activeChipText]}>
                      {badge.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.subLabel, { marginTop: Theme.spacing.md }]}>Minimum Health Score</Text>
            <View style={styles.chipContainer}>
              {[
                { value: 0, label: 'Any' },
                { value: 50, label: 'Fair (50+)' },
                { value: 80, label: 'Excellent (80+)' }
              ].map(hs => {
                const active = minHealthScore === hs.value;
                return (
                  <TouchableOpacity
                    key={hs.value}
                    activeOpacity={0.7}
                    style={[styles.chip, active && styles.activeChip]}
                    onPress={() => setMinHealthScore(hs.value)}
                  >
                    <Text style={[styles.chipText, active && styles.activeChipText]}>
                      {hs.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </AccordionSection>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleResetAll} style={styles.resetBtn}>
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
    paddingHorizontal: Theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: Theme.spacing.sm,
  },
  sectionHeaderTitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wider,
  },
  subLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilySemiBold,
    marginBottom: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  chip: {
    paddingVertical: Theme.spacing.sm - 2,
    paddingHorizontal: Theme.spacing.md,
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
    fontSize: Theme.typography.sizes.sm - 1,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  activeChipText: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  accordionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.sm,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingRight: Theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  sectionResetBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sectionResetText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  accordionBody: {
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    gap: Theme.spacing.md,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  resetBtn: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    marginRight: Theme.spacing.md,
  },
  resetText: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  applyBtn: {
    flex: 1,
  },
});
