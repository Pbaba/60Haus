import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Theme } from '../../theme';
import { SearchBar } from '../../features/discovery/components/SearchBar';
import { FilterSheet } from '../../features/discovery/components/FilterSheet';
import { MapContainer } from '../../features/discovery/components/MapContainer';
import { MapToggle } from '../../features/discovery/components/MapToggle';
import { PropertyCarousel } from '../../features/discovery/components/PropertyCarousel';
import { SearchChip } from '../../features/discovery/components/SearchChip';
import { useSearch } from '../../features/discovery/hooks/useSearch';
import { useFilters } from '../../features/discovery/hooks/useFilters';
import { useProperties } from '../../hooks/useProperties';
import { SlidersHorizontal } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { historyService } from '../../services/historyService';

export default function DiscoverScreen() {
  const router = useRouter();
  const { filteredProperties, loading } = useProperties();
  const { filters, updateFilters, clearFilters } = useFilters();
  const { query, setQuery, performSearch, recentSearches, loadRecentSearches } = useSearch('test-user-id'); // use actual auth user ID here
  
  const [isMapView, setIsMapView] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  useEffect(() => {
    loadRecentSearches();
    loadRecentlyViewed();
  }, [loadRecentSearches]);

  const loadRecentlyViewed = async () => {
    try {
      const viewed = await historyService.getViewHistory('test-user-id');
      setRecentlyViewed(viewed.slice(0, 10)); // Top 10
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSearch = (text: string) => {
    performSearch(text);
    updateFilters({ query: text });
  };

  const activeFilterCount = Object.keys(filters).reduce((acc, key) => {
    const val = (filters as any)[key];
    if (key === 'city' || key === 'listingType' || key === 'sortBy') return acc; // Skip defaults
    if (Array.isArray(val) && val.length > 0) return acc + 1;
    if (val !== null && val !== undefined && val !== false && val !== '') return acc + 1;
    return acc;
  }, 0);

  // Derive specialized lists
  const recommendedProperties = useMemo(() => {
    return filteredProperties
      .filter(p => p.priority_score && p.priority_score > 0.5)
      .slice(0, 10);
  }, [filteredProperties]);

  const recentlyAdded = useMemo(() => {
    return [...filteredProperties]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [filteredProperties]);

  const mostTrusted = useMemo(() => {
    return filteredProperties
      .filter(p => p.dynamicTrustRank && p.dynamicTrustRank > 80)
      .slice(0, 10);
  }, [filteredProperties]);

  return (
    <ScreenContainer style={styles.container} safeAreaBottom={!isMapView}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <SearchBar 
            value={query}
            onChangeText={handleSearch}
            placeholder="Search localities, projects..."
            containerStyle={{ flex: 1 }}
          />
          <TouchableOpacity 
            style={styles.filterBtn}
            onPress={() => setIsFilterSheetOpen(true)}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={20} color={Theme.colors.textPrimary} />
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {!isMapView && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <SearchChip label="Pet Friendly" onPress={() => updateFilters({ petFriendly: !filters.petFriendly })} isActive={filters.petFriendly} />
            <SearchChip label="Verified Only" onPress={() => updateFilters({ trustFilters: ['verified'] })} isActive={filters.trustFilters?.includes('verified')} />
            <SearchChip label="Walkthrough Video" onPress={() => updateFilters({ trustFilters: ['walkthrough'] })} isActive={filters.trustFilters?.includes('walkthrough')} />
          </ScrollView>
        )}
      </View>

      {isMapView ? (
        <View style={styles.mapWrapper}>
          <MapContainer properties={filteredProperties} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {query.length > 0 ? (
            <PropertyCarousel 
              title="Search Results" 
              properties={filteredProperties} 
              onViewAll={() => router.push('/(tabs)')}
              emptyMessage="No properties match your search."
            />
          ) : (
            <>
              {recommendedProperties.length > 0 && (
                <PropertyCarousel 
                  title="Recommended For You" 
                  properties={recommendedProperties} 
                  onViewAll={() => {}}
                />
              )}
              
              <PropertyCarousel 
                title="Most Trusted" 
                properties={mostTrusted} 
                emptyMessage="No highly trusted listings found in this area."
              />

              <PropertyCarousel 
                title="Recently Added" 
                properties={recentlyAdded} 
              />

              {recentlyViewed.length > 0 && (
                <PropertyCarousel 
                  title="Recently Viewed" 
                  properties={recentlyViewed.map(item => item.property)} // assuming historyService returns joined property
                />
              )}
            </>
          )}
          
          {/* Spacer for bottom map toggle */}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <MapToggle 
        isMapView={isMapView} 
        onToggle={() => setIsMapView(!isMapView)} 
      />

      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filters={filters}
        onApplyFilters={(newFilters) => {
          updateFilters(newFilters);
          setIsFilterSheetOpen(false);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: Theme.colors.background,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Theme.colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  chipsRow: {
    paddingRight: Theme.spacing.md,
  },
  scrollContent: {
    paddingVertical: Theme.spacing.md,
  },
  mapWrapper: {
    flex: 1,
  },
});
