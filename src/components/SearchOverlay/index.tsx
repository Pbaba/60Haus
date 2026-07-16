import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheet } from '../BottomSheet';
import { Theme } from '../../theme';
import { Button } from '../Button';
import { Input } from '../Input';
import { CITIES } from '../../constants';
import { AMENITIES, AMENITY_CATEGORIES } from '../../constants/property';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

export interface SearchFilters {
  city: string;
  bhk: number | null;
  furnishing: string | null;
  petFriendly: boolean;
  listingType: 'rent' | 'buy';
  minPrice?: number;
  maxPrice?: number;
  localities?: string[];
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
  maxMetroDist?: number;
  maxHospitalDist?: number;
  maxSchoolDist?: number;
  maxParkDist?: number;
  maxMallDist?: number;
  lifestyleFriendly?: string[];
  maxCommuteAirport?: number;
  maxCommuteMetro?: number;
  maxCommuteBusiness?: number;
}

export interface SearchOverlayProps {
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

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
}) => {
  const [selectedCity, setSelectedCity] = useState(filters.city);
  const [listingType, setListingType] = useState<'rent' | 'buy'>(filters.listingType);
  const [sortBy, setSortBy] = useState<string>(filters.sortBy || 'newest');

  // Pricing
  const [minPrice, setMinPrice] = useState<string>(filters.minPrice ? String(filters.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState<string>(filters.maxPrice ? String(filters.maxPrice) : '');
  const [maxDeposit, setMaxDeposit] = useState<string>(filters.maxDeposit ? String(filters.maxDeposit) : '');
  const [maxMaintenance, setMaxMaintenance] = useState<string>(filters.maxMaintenance ? String(filters.maxMaintenance) : '');

  // Specs
  const [propertyType, setPropertyType] = useState<string | null>(filters.propertyType || null);
  const [selectedBhk, setSelectedBhk] = useState<number | null>(filters.bhk);
  const [bathrooms, setBathrooms] = useState<number | null>(filters.bathrooms || null);
  const [furnishing, setFurnishing] = useState<string | null>(filters.furnishing || null);
  const [propertyAge, setPropertyAge] = useState<string>(filters.propertyAge ? String(filters.propertyAge) : '');
  const [ownershipType, setOwnershipType] = useState<string | null>(filters.ownershipType || null);

  // Area
  const [minCarpetArea, setMinCarpetArea] = useState<string>(filters.minCarpetArea ? String(filters.minCarpetArea) : '');
  const [maxCarpetArea, setMaxCarpetArea] = useState<string>(filters.maxCarpetArea ? String(filters.maxCarpetArea) : '');

  // Amenities & Trust
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(filters.amenities || []);
  const [trustFilters, setTrustFilters] = useState<string[]>(filters.trustFilters || []);

  // Neighborhood & Commute Range Limits
  const [maxMetroDist, setMaxMetroDist] = useState<string>(filters.maxMetroDist ? String(filters.maxMetroDist) : '');
  const [maxHospitalDist, setMaxHospitalDist] = useState<string>(filters.maxHospitalDist ? String(filters.maxHospitalDist) : '');
  const [maxSchoolDist, setMaxSchoolDist] = useState<string>(filters.maxSchoolDist ? String(filters.maxSchoolDist) : '');
  const [maxParkDist, setMaxParkDist] = useState<string>(filters.maxParkDist ? String(filters.maxParkDist) : '');
  const [maxMallDist, setMaxMallDist] = useState<string>(filters.maxMallDist ? String(filters.maxMallDist) : '');

  // Lifestyle tags
  const [lifestyleFriendly, setLifestyleFriendly] = useState<string[]>(filters.lifestyleFriendly || []);

  // Commute constraints
  const [maxCommuteAirport, setMaxCommuteAirport] = useState<string>(filters.maxCommuteAirport ? String(filters.maxCommuteAirport) : '');
  const [maxCommuteMetro, setMaxCommuteMetro] = useState<string>(filters.maxCommuteMetro ? String(filters.maxCommuteMetro) : '');
  const [maxCommuteBusiness, setMaxCommuteBusiness] = useState<string>(filters.maxCommuteBusiness ? String(filters.maxCommuteBusiness) : '');

  // Accordion Sections State
  const [openSection, setOpenSection] = useState<string | null>('pricing');

  const toggleSection = (sectionName: string) => {
    setOpenSection(prev => (prev === sectionName ? null : sectionName));
  };

  const handleApply = () => {
    onApplyFilters({
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
      propertyAge: propertyAge ? parseInt(propertyAge) : null,
      ownershipType,
      minCarpetArea: minCarpetArea ? parseFloat(minCarpetArea) : null,
      maxCarpetArea: maxCarpetArea ? parseFloat(maxCarpetArea) : null,
      maxDeposit: maxDeposit ? parseFloat(maxDeposit) : null,
      maxMaintenance: maxMaintenance ? parseFloat(maxMaintenance) : null,
      amenities: selectedAmenities,
      trustFilters,
      maxMetroDist: maxMetroDist ? parseFloat(maxMetroDist) : undefined,
      maxHospitalDist: maxHospitalDist ? parseFloat(maxHospitalDist) : undefined,
      maxSchoolDist: maxSchoolDist ? parseFloat(maxSchoolDist) : undefined,
      maxParkDist: maxParkDist ? parseFloat(maxParkDist) : undefined,
      maxMallDist: maxMallDist ? parseFloat(maxMallDist) : undefined,
      lifestyleFriendly,
      maxCommuteAirport: maxCommuteAirport ? parseInt(maxCommuteAirport) : undefined,
      maxCommuteMetro: maxCommuteMetro ? parseInt(maxCommuteMetro) : undefined,
      maxCommuteBusiness: maxCommuteBusiness ? parseInt(maxCommuteBusiness) : undefined,
    });
  };

  const handleResetAll = () => {
    setSelectedCity(CITIES[0]);
    setListingType('rent');
    setSortBy('newest');
    resetPricing();
    resetSpecs();
    resetArea();
    resetAmenities();
    resetTrust();
    resetNeighborhood();
  };

  // Section Resets
  const resetPricing = () => {
    setMinPrice('');
    setMaxPrice('');
    setMaxDeposit('');
    setMaxMaintenance('');
  };

  const resetSpecs = () => {
    setPropertyType(null);
    setSelectedBhk(null);
    setBathrooms(null);
    setFurnishing(null);
    setPropertyAge('');
    setOwnershipType(null);
  };

  const resetArea = () => {
    setMinCarpetArea('');
    setMaxCarpetArea('');
  };

  const resetNeighborhood = () => {
    setMaxMetroDist('');
    setMaxHospitalDist('');
    setMaxSchoolDist('');
    setMaxParkDist('');
    setMaxMallDist('');
    setLifestyleFriendly([]);
    setMaxCommuteAirport('');
    setMaxCommuteMetro('');
    setMaxCommuteBusiness('');
  };

  const resetAmenities = () => {
    setSelectedAmenities([]);
  };

  const resetTrust = () => {
    setTrustFilters([]);
  };

  const toggleAmenity = (id: string) => {
    setSelectedAmenities(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleTrustFilter = (id: string) => {
    setTrustFilters(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Filter Listings">
      <View style={styles.innerContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Sorting Option */}
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Sort Listings By</Text>
            <View style={styles.chipContainer}>
              {[
                { id: 'newest', label: 'Newest' },
                { id: 'price-low-high', label: 'Price: Low → High' },
                { id: 'price-high-low', label: 'Price: High → Low' },
                { id: 'area', label: 'Area Size' },
                { id: 'price-per-sqft', label: 'Price per Sq.ft' },
                { id: 'most-popular', label: 'Most Popular' },
              ].map(opt => {
                const active = sortBy === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={Theme.motion.presets.press.scale}
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

          {/* City Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Select City</Text>
            <View style={styles.chipContainer}>
              {CITIES.map(city => {
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

          {/* Transaction Type */}
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
                    activeOpacity={Theme.motion.presets.press.scale}
                    style={[styles.chip, isActive && styles.activeChip]}
                    onPress={() => {
                      setListingType(type.id as any);
                      resetPricing();
                    }}
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

          {/* Pricing Accordion */}
          <AccordionSection
            title="Pricing Range"
            isOpen={openSection === 'pricing'}
            onToggle={() => toggleSection('pricing')}
            onReset={resetPricing}
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
            {listingType === 'rent' && (
              <View style={styles.inputsRow}>
                <Input
                  label="Max Deposit"
                  placeholder="e.g. 100000"
                  keyboardType="numeric"
                  value={maxDeposit}
                  onChangeText={setMaxDeposit}
                  style={{ flex: 1 }}
                />
                <Input
                  label="Max Maintenance"
                  placeholder="e.g. 5000"
                  keyboardType="numeric"
                  value={maxMaintenance}
                  onChangeText={setMaxMaintenance}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </AccordionSection>

          {/* Property Specifications Accordion */}
          <AccordionSection
            title="Property Specifications"
            isOpen={openSection === 'specs'}
            onToggle={() => toggleSection('specs')}
            onReset={resetSpecs}
          >
            {/* Property Type */}
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

            {/* BHK options */}
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

            {/* Bathrooms options */}
            <Text style={styles.subLabel}>Bathrooms</Text>
            <View style={[styles.chipContainer, { marginBottom: Theme.spacing.md }]}>
              {[1, 2, 3, 4].map(b => {
                const active = bathrooms === b;
                return (
                  <TouchableOpacity
                    key={b}
                    style={[styles.chip, active && styles.activeChip]}
                    onPress={() => setBathrooms(active ? null : b)}
                  >
                    <Text style={[styles.chipText, active && styles.activeChipText]}>
                      {b}+ Bathrooms
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Furnishing */}
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

            <View style={styles.inputsRow}>
              <Input
                label="Max Property Age (Years)"
                placeholder="e.g. 5"
                keyboardType="numeric"
                value={propertyAge}
                onChangeText={setPropertyAge}
                style={{ flex: 1 }}
              />
              {listingType === 'buy' && (
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.subLabel}>Ownership Type</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {['freehold', 'leasehold'].map(o => {
                      const active = ownershipType === o;
                      return (
                        <TouchableOpacity
                          key={o}
                          style={[styles.chip, active && styles.activeChip, { paddingVertical: 6, paddingHorizontal: 10 }]}
                          onPress={() => setOwnershipType(active ? null : o)}
                        >
                          <Text style={[styles.chipText, { fontSize: 11 }, active && styles.activeChipText]}>
                            {o}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </AccordionSection>

          {/* Area Specifications Accordion */}
          <AccordionSection
            title="Area Limits"
            isOpen={openSection === 'area'}
            onToggle={() => toggleSection('area')}
            onReset={resetArea}
          >
            <View style={styles.inputsRow}>
              <Input
                label="Min Area (Sq.ft)"
                placeholder="e.g. 500"
                keyboardType="numeric"
                value={minCarpetArea}
                onChangeText={setMinCarpetArea}
                style={{ flex: 1 }}
              />
              <Input
                label="Max Area (Sq.ft)"
                placeholder="e.g. 2000"
                keyboardType="numeric"
                value={maxCarpetArea}
                onChangeText={setMaxCarpetArea}
                style={{ flex: 1 }}
              />
            </View>
          </AccordionSection>

          {/* Neighborhood & Commute Accordion */}
          <AccordionSection
            title="Neighborhood & Commute"
            isOpen={openSection === 'neighborhood'}
            onToggle={() => toggleSection('neighborhood')}
            onReset={resetNeighborhood}
          >
            {/* Proximity range inputs */}
            <Text style={styles.subLabel}>Maximum Distance Limits (km)</Text>
            <View style={styles.inputsRow}>
              <Input
                label="Metro Station"
                placeholder="e.g. 1"
                keyboardType="numeric"
                value={maxMetroDist}
                onChangeText={setMaxMetroDist}
                style={{ flex: 1 }}
              />
              <Input
                label="Healthcare / Hospital"
                placeholder="e.g. 2"
                keyboardType="numeric"
                value={maxHospitalDist}
                onChangeText={setMaxHospitalDist}
                style={{ flex: 1 }}
              />
            </View>
            <View style={styles.inputsRow}>
              <Input
                label="School / Academy"
                placeholder="e.g. 1.5"
                keyboardType="numeric"
                value={maxSchoolDist}
                onChangeText={setMaxSchoolDist}
                style={{ flex: 1 }}
              />
              <Input
                label="Parks / Greenery"
                placeholder="e.g. 0.8"
                keyboardType="numeric"
                value={maxParkDist}
                onChangeText={setMaxParkDist}
                style={{ flex: 1 }}
              />
              <Input
                label="Shopping Mall"
                placeholder="e.g. 3"
                keyboardType="numeric"
                value={maxMallDist}
                onChangeText={setMaxMallDist}
                style={{ flex: 1 }}
              />
            </View>

            {/* Commute Duration Limits */}
            <Text style={[styles.subLabel, { marginTop: Theme.spacing.sm }]}>Max Commute Duration (min)</Text>
            <View style={styles.inputsRow}>
              <Input
                label="To Metro Hub"
                placeholder="e.g. 10"
                keyboardType="numeric"
                value={maxCommuteMetro}
                onChangeText={setMaxCommuteMetro}
                style={{ flex: 1 }}
              />
              <Input
                label="To Airport Terminal"
                placeholder="e.g. 30"
                keyboardType="numeric"
                value={maxCommuteAirport}
                onChangeText={setMaxCommuteAirport}
                style={{ flex: 1 }}
              />
              <Input
                label="To Business Tech Hub"
                placeholder="e.g. 20"
                keyboardType="numeric"
                value={maxCommuteBusiness}
                onChangeText={setMaxCommuteBusiness}
                style={{ flex: 1 }}
              />
            </View>

            {/* Lifestyle Tags Multi-select */}
            <Text style={[styles.subLabel, { marginTop: Theme.spacing.sm }]}>Locality Lifestyle Tags</Text>
            <View style={styles.chipContainer}>
              {['Family Friendly', 'Walkable', 'Pet Friendly', 'Quiet Neighborhood', 'Green Areas'].map(tag => {
                const active = lifestyleFriendly.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    activeOpacity={Theme.motion.presets.press.scale}
                    style={[styles.chip, active && styles.activeChip]}
                    onPress={() => {
                      setLifestyleFriendly(prev =>
                        prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]
                      );
                    }}
                  >
                    <Text style={[styles.chipText, active && styles.activeChipText]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </AccordionSection>

          {/* Amenities Accordion */}
          <AccordionSection
            title="Amenities Selection (AND Match)"
            isOpen={openSection === 'amenities'}
            onToggle={() => toggleSection('amenities')}
            onReset={resetAmenities}
          >
            {Object.entries(AMENITY_CATEGORIES).map(([catId, catLabel]) => {
              const categoryAmenities = AMENITIES.filter(a => a.category === catId);
              return (
                <View key={catId} style={styles.amenityCategoryBlock}>
                  <Text style={styles.amenityCategoryTitle}>{catLabel}</Text>
                  <View style={styles.chipContainer}>
                    {categoryAmenities.map(amenity => {
                      const active = selectedAmenities.includes(amenity.id);
                      return (
                        <TouchableOpacity
                          key={amenity.id}
                          activeOpacity={Theme.motion.presets.press.scale}
                          style={[styles.chip, active && styles.activeChip]}
                          onPress={() => toggleAmenity(amenity.id)}
                        >
                          <Text style={[styles.chipText, active && styles.activeChipText]}>
                            {amenity.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </AccordionSection>

          {/* Trust Filters Accordion */}
          <AccordionSection
            title="Marketplace Trust"
            isOpen={openSection === 'trust'}
            onToggle={() => toggleSection('trust')}
            onReset={resetTrust}
          >
            <View style={styles.chipContainer}>
              {[
                { id: 'verified', label: 'Verified Owner' },
                { id: 'walkthrough', label: 'Walkthrough Video Available' },
              ].map(badge => {
                const active = trustFilters.includes(badge.id);
                return (
                  <TouchableOpacity
                    key={badge.id}
                    activeOpacity={Theme.motion.presets.press.scale}
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
          </AccordionSection>
        </ScrollView>

        {/* Footer Controls */}
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
  amenityCategoryBlock: {
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  amenityCategoryTitle: {
    fontSize: Theme.typography.sizes.sm - 1,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilySemiBold,
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
