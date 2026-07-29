import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
  Linking,
  Share,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { Image } from 'expo-image';
import { Award, Share2, Heart, GitCompare, ArrowRight, Home } from 'lucide-react-native';
import { useFeedback } from '../../context/FeedbackContext';
import { profileService } from '../../services/profileService';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { ReportListingModal } from '../../components/ReportListingModal';
import { DiscoveryEndScreen } from '../../components/DiscoveryEndScreen';
import { FeedItemCell } from '../../components/FeedItemCell';
import { EmptyState } from '../../components/EmptyState';
import { AMENITIES } from '../../constants/property';
import { SkeletonFeed } from '../../components/Skeleton';
import { NeighborhoodSnapshot, locationDomain, reactNativeMapProvider } from '../../domain/location';
import { Avatar } from '../../components/Avatar';
import { BottomSheet } from '../../components/BottomSheet';
import { useProperties } from '../../hooks/useProperties';
import { Theme } from '../../theme';
import { formatCurrency } from '../../utils';
// @ts-ignore
import { PropertyListing, DiscoveryMode } from '../../types';
import { SearchFilters } from '../../features/discovery/components/FilterSheet';
import { analyticsService } from '../../services/analyticsService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');


const FlashListAny = FlashList as any;

interface ResumeBrowsingState {
  propertyId: string;
  propertyTitle: string;
  propertyLocality: string;
  filters: SearchFilters;
  discoveryMode: DiscoveryMode;
  exploredLocalities: string[];
  timestamp: number;
}

export default function FeedScreen() {
  const router = useRouter();
  const { isGuest } = useAuth();
  const {
    properties,
    filteredProperties,
    savedPropertyIds,
    toggleSave,
    loading,
    refreshing,
    fetchFeed,
    loadMoreFeed,
    incrementViewCount,
    discoveryMode,
    hasExactMatchesRemaining,
    incrementContactCount,
    filters,
    compareQueue,
    toggleCompare,
    collections,
    addPropertyToCollection,
    createCollection,
  } = useProperties();
  const { showToast } = useFeedback();

  const listRef = useRef<any>(null);

  useEffect(() => {
    if (listRef.current) {
      try {
        listRef.current.scrollToOffset({ offset: 0, animated: false });
      } catch {
        // Safe fail
      }
    }
  }, [properties.length, discoveryMode]);
  
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Collections modal states
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [selectedColId, setSelectedColId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingPropertyId, setReportingPropertyId] = useState<string | null>(null);

  const [creatingNewCollection, setCreatingNewCollection] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  // Geographic Locality States
  const [snapshot, setSnapshot] = useState<NeighborhoodSnapshot | null>(null);
  const [activeLocationTab, setActiveLocationTab] = useState('Snapshot');
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  const handleShareProperty = async (p: PropertyListing) => {
    try {
      await Share.share({
        message: `Check out this amazing walkthrough: ${p.title} in ${p.locality || p.city} for ${formatCurrency(p.price)}/mo!`,
        url: `https://60haus.app/property/${p.id}`,
      });
      analyticsService.trackScreenView('property_detail');
    } catch {
      console.warn('Share failed');
    }
  };

  const handleSavePropertyToCollection = (p: PropertyListing) => {
    if (isGuest || !p) {
      Alert.alert(
        'Authentication Required',
        'Please sign in or create an account to save properties.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login' as any) },
        ]
      );
      return;
    }

    const alreadySaved = savedPropertyIds.has(p.id);
    if (alreadySaved) {
      Alert.alert(
        'Unsave Property',
        'This property is already bookmarked. Manage collections or unsave?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Manage Collections',
            onPress: () => {
              if (collections.length === 0) {
                setCreatingNewCollection(true);
              } else {
                setCreatingNewCollection(false);
                setSelectedColId(collections[0].id);
              }
              setSaveModalVisible(true);
            },
          },
          {
            text: 'Unsave/Remove',
            style: 'destructive',
            onPress: () => {
              toggleSave(p.id);
              showToast('Removed from saved homes');
            },
          },
        ]
      );
      return;
    }

    if (collections.length === 0) {
      setCreatingNewCollection(true);
    } else {
      setCreatingNewCollection(false);
      setSelectedColId(collections[0].id);
    }
    setSaveModalVisible(true);
  };

  const handleComparePropertyToggle = (p: PropertyListing) => {
    toggleCompare(p.id);
    const added = !compareQueue.includes(p.id);
    showToast(added ? 'Added to comparison queue' : 'Removed from comparison queue');
  };

  const handleSaveToCollectionSubmit = async () => {
    if (!selectedProperty) return;
    const pId = selectedProperty.id;

    try {
      const alreadySaved = savedPropertyIds.has(pId);
      if (!alreadySaved) {
        toggleSave(pId);
      }

      if (creatingNewCollection) {
        if (!newColName.trim()) {
          showToast('Collection name is required.');
          return;
        }
        const col = await createCollection(newColName.trim(), newColDesc.trim());
        analyticsService.trackCollectionCreated(col.id, col.name);
        await addPropertyToCollection(col.id, pId, noteText.trim());
        analyticsService.trackPropertyAddedToCollection(pId, col.id);
        
        setNewColName('');
        setNewColDesc('');
      } else {
        if (!selectedColId) {
          showToast('Please select a collection.');
          return;
        }
        await addPropertyToCollection(selectedColId, pId, noteText.trim());
        analyticsService.trackPropertyAddedToCollection(pId, selectedColId);
      }

      setNoteText('');
      setSaveModalVisible(false);
    } catch {
      showToast('Failed to save to collection.');
    }
  };

  useEffect(() => {
    if (selectedProperty) {
      setLoadingSnapshot(true);
      setSnapshot(null);
      setActiveLocationTab('Snapshot');
      
      const loadSnapshot = async () => {
        try {
          const snap = await locationDomain.getNeighborhoodSnapshot(selectedProperty, properties);
          setSnapshot(snap);
        } catch {
          console.warn('Failed to load neighborhood details');
        } finally {
          setLoadingSnapshot(false);
        }
      };
      
      loadSnapshot();
    } else {
      setSnapshot(null);
    }
  }, [selectedProperty, properties]);

  // Save active progress in background when index changes
  useEffect(() => {
    if (filteredProperties.length > 0 && activeIdx < filteredProperties.length) {
      const activeItem = filteredProperties[activeIdx];
      if (activeItem && !(activeItem as any).isEndCard && !(activeItem as any).isSinceLastVisitCard) {
        const state: ResumeBrowsingState = {
          propertyId: activeItem.id,
          propertyTitle: activeItem.title,
          propertyLocality: activeItem.locality || '',
          filters,
          discoveryMode,
          exploredLocalities: [],
          timestamp: Date.now(),
        };
        AsyncStorage.setItem('@resume_browsing_state', JSON.stringify(state)).catch(() => {});
      }
    }
  }, [activeIdx, filteredProperties, filters, discoveryMode]);



  const SinceLastVisitCard: React.FC = () => {
    return (
      <View style={styles.sinceLastContainer}>
        <View style={styles.sinceLastCard}>
          <Award size={32} color={Theme.colors.primary} style={styles.sinceLastIcon} />
          <Text style={styles.sinceLastTitle}>New Since Your Last Visit</Text>
          <Text style={styles.sinceLastSubtitle}>
            Here is a quick summary of what was updated in the marketplace since you last checked.
          </Text>
          
          <View style={styles.sinceLastDivider} />

          <View style={styles.sinceLastRow}>
            <Text style={styles.sinceLastValue}>12</Text>
            <Text style={styles.sinceLastLabel}>new listings matching preferences</Text>
          </View>
          
          <View style={styles.sinceLastRow}>
            <Text style={styles.sinceLastValue}>3</Text>
            <Text style={styles.sinceLastLabel}>price reductions detected</Text>
          </View>
          
          <View style={styles.sinceLastRow}>
            <Text style={styles.sinceLastValue}>2</Text>
            <Text style={styles.sinceLastLabel}>recently updated homes</Text>
          </View>
        </View>
        <ReportListingModal 
          visible={reportModalVisible}
          propertyId={reportingPropertyId}
          onClose={() => {
            setReportModalVisible(false);
            setReportingPropertyId(null);
          }}
        />
      </View>
    );
  };

  const handleSavePress = useCallback((id: string) => {
    if (isGuest) {
      Alert.alert(
        'Authentication Required',
        'Please sign in or create an account to save properties.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Register', onPress: () => router.replace('/register' as any) },
        ]
      );
      return;
    }
    toggleSave(id);
  }, [isGuest, toggleSave, router]);

  const handleReportPress = useCallback((id: string) => {
    if (isGuest) {
      Alert.alert(
        'Authentication Required',
        'Please sign in or register to report listings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Register', onPress: () => router.replace('/register' as any) },
        ]
      );
      return;
    }
    setReportingPropertyId(id);
    setReportModalVisible(true);
  }, [isGuest, router]);

  const handleRefresh = () => {
    fetchFeed();
  };

  const handlePropertyPress = useCallback((property: PropertyListing) => {
    setSelectedProperty(property);
  }, []);

  const handleQuickCall = useCallback(async (item: PropertyListing) => {
    try {
      await incrementContactCount(item.id);
      const owner = await profileService.getProfile(item.ownerId);
      if (owner?.phoneNumber) {
        Linking.openURL(`tel:${owner.phoneNumber}`);
      } else {
        showToast('No contact phone number provided by the homeowner.', 'warning');
      }
    } catch {
      showToast('Failed to retrieve owner details. Please try again.', 'error');
    }
  }, [incrementContactCount, showToast]);

  const [viewabilityConfig] = useState(() => ({
    itemVisiblePercentThreshold: 80,
  }));

  const [onViewableItemsChanged] = useState(() => ({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveIdx(viewableItems[0].index ?? 0);
    }
  });

  // Prefetch upcoming images when activeIdx changes
  useEffect(() => {
    const nextIdx1 = activeIdx + 1;
    const nextIdx2 = activeIdx + 2;
    const prefetches: string[] = [];

    [nextIdx1, nextIdx2].forEach((idx) => {
      if (idx < filteredProperties.length) {
        const item = filteredProperties[idx];
        if (item.thumbnailUrl) prefetches.push(item.thumbnailUrl);
        if (item.imageUrls && item.imageUrls.length > 0) {
          prefetches.push(item.imageUrls[0]);
        }
      }
    });

    if (prefetches.length > 0) {
      Image.prefetch(prefetches);
    }
  }, [activeIdx, filteredProperties]);

  const handleToggleMute = useCallback(() => setIsMuted(prev => !prev), []);
  const handleViewCountIncrement = useCallback((id: string) => incrementViewCount(id), [incrementViewCount]);

  const renderItem = useCallback(({ item, index, extraData }: any) => {
    const { activeIdx: currentActiveIdx, isMuted: currentIsMuted } = extraData || { activeIdx: 0, isMuted: false };
    const isActive = index === currentActiveIdx;

    if ((item as any).isEndCard) {
      return (
        <View style={styles.page}>
          <DiscoveryEndScreen
            isActive={isActive}
            onOpenFilters={() => router.push('/(tabs)/discover' as any)}
          />
        </View>
      );
    }

    if ((item as any).isSinceLastVisitCard) {
      return (
        <View style={styles.page}>
          <SinceLastVisitCard />
        </View>
      );
    }

    const isSaved = savedPropertyIds.has(item.id);
    
    return (
      <FeedItemCell
        item={item}
        isActive={isActive}
        isSaved={isSaved}
        isMuted={currentIsMuted}
        shouldLoad={isActive || index === currentActiveIdx + 1}
        onToggleMute={handleToggleMute}
        onViewCountIncrement={() => handleViewCountIncrement(item.id)}
        onSavePress={handleSavePress}
        onQuickCall={handleQuickCall}
        onReportPress={handleReportPress}
        onPropertyPress={handlePropertyPress}
      />
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPropertyIds, handleReportPress, handleSavePress, handleQuickCall, handleViewCountIncrement, handlePropertyPress, router, handleToggleMute]);

  const listData = React.useMemo(() => {
    const data = [...filteredProperties];
    if (data.length >= 3 && !loading) {
      data.splice(2, 0, {
        id: 'since-last-visit-card',
        isSinceLastVisitCard: true,
      } as any);
    }
    if (!hasExactMatchesRemaining && data.length > 0 && !loading) {
      data.push({
        id: 'discovery-end-card',
        isEndCard: true,
      } as any);
    }
    return data;
  }, [filteredProperties, loading, hasExactMatchesRemaining]);

  return (
    <ScreenContainer
      safeAreaTop={false}
      safeAreaBottom={false}
      style={styles.container}
    >
      {loading ? (
        <SkeletonFeed />
      ) : listData.length > 0 ? (
        <FlashListAny
          ref={listRef}
          data={listData}
          extraData={{ activeIdx, isMuted }}
          renderItem={renderItem}
          keyExtractor={(item: PropertyListing) => item.id}
          pagingEnabled
          estimatedItemSize={SCREEN_HEIGHT}
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={loadMoreFeed}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Theme.colors.primary}
            />
          }
        />
      ) : (
        <EmptyState
          icon={Home}
          title="No properties available"
          description="We couldn't find any listings matching your search. Try adjusting your filters or check back later."
          actionLabel="Edit Filters"
          onAction={() => router.push('/(tabs)/discover' as any)}
        />
      )}

      {/* Property Details Bottom Sheet Overlay */}
      <BottomSheet
        isOpen={selectedProperty !== null}
        onClose={() => setSelectedProperty(null)}
        title={selectedProperty?.title}
      >
        {selectedProperty && (
          <ScrollView
            style={styles.sheetScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
          >
            <Image
              source={{ uri: selectedProperty.thumbnailUrl }}
              style={styles.sheetHeroImage}
              contentFit="cover"
            />
            
            <View style={styles.sheetBody}>
              <Text style={styles.sheetPrice}>
                {formatCurrency(selectedProperty.price)}
                {selectedProperty.listingType === 'rent' && <Text style={styles.sheetPerMonth}>/month</Text>}
              </Text>
              <Text style={styles.sheetAddress}>
                {selectedProperty.address}, {selectedProperty.city}
              </Text>

              {/* Specifications Grid */}
              <View style={styles.sheetSpecs}>
                <View style={styles.sheetSpecItem}>
                  <Text style={styles.sheetSpecValue}>{selectedProperty.bedrooms} BHK</Text>
                  <Text style={styles.sheetSpecLabel}>Configuration</Text>
                </View>
                <View style={styles.sheetSpecItem}>
                  <Text style={styles.sheetSpecValue}>{selectedProperty.bathrooms}</Text>
                  <Text style={styles.sheetSpecLabel}>Bathrooms</Text>
                </View>
                <View style={styles.sheetSpecItem}>
                  <Text style={styles.sheetSpecValue}>
                    {(() => {
                      const area = selectedProperty.carpetArea || selectedProperty.builtUpArea || selectedProperty.superBuiltUpArea || selectedProperty.plotArea || 0;
                      return area > 0 ? `${area} sq ft` : 'N/A';
                    })()}
                  </Text>
                  <Text style={styles.sheetSpecLabel}>Size</Text>
                </View>
              </View>

              {/* Detailed Specifications List */}
              <View style={styles.sheetDetailedSpecs}>
                {selectedProperty.listingType === 'rent' ? (
                  <>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Security Deposit</Text>
                      <Text style={styles.specValue}>{selectedProperty.securityDeposit ? formatCurrency(selectedProperty.securityDeposit) : 'N/A'}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Maintenance / month</Text>
                      <Text style={styles.specValue}>{selectedProperty.monthlyMaintenance ? formatCurrency(selectedProperty.monthlyMaintenance) : 'N/A'}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Brokerage Fee</Text>
                      <Text style={styles.specValue}>{selectedProperty.brokerage ? formatCurrency(selectedProperty.brokerage) : 'N/A'}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Lease Duration</Text>
                      <Text style={styles.specValue}>{selectedProperty.leaseDuration ? `${selectedProperty.leaseDuration} Months` : 'N/A'}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Available From</Text>
                      <Text style={styles.specValue}>{selectedProperty.availableFrom || 'Immediate'}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Preferred Tenant</Text>
                      <Text style={[styles.specValue, { textTransform: 'capitalize' }]}>{selectedProperty.preferredTenant || 'Anyone'}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Carpet Area</Text>
                      <Text style={styles.specValue}>{selectedProperty.carpetArea ? `${selectedProperty.carpetArea} sq ft` : 'N/A'}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Built-up Area</Text>
                      <Text style={styles.specValue}>{selectedProperty.builtUpArea ? `${selectedProperty.builtUpArea} sq ft` : 'N/A'}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Super Built-up Area</Text>
                      <Text style={styles.specValue}>{selectedProperty.superBuiltUpArea ? `${selectedProperty.superBuiltUpArea} sq ft` : 'N/A'}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Property Age</Text>
                      <Text style={styles.specValue}>{selectedProperty.propertyAge ? `${selectedProperty.propertyAge} Years` : 'N/A'}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Possession Status</Text>
                      <Text style={[styles.specValue, { textTransform: 'capitalize' }]}>{selectedProperty.possessionStatus?.replace('-', ' ') || 'N/A'}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Ownership Type</Text>
                      <Text style={[styles.specValue, { textTransform: 'capitalize' }]}>{selectedProperty.ownershipType?.replace('-', ' ') || 'N/A'}</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Geographic Neighborhood Snapshot & Locality Tabs */}
              {loadingSnapshot ? (
                <View style={[styles.snapshotCard, { alignItems: 'center', justifyContent: 'center', minHeight: 100 }]}>
                  <Text style={{ color: Theme.colors.textSecondary, fontSize: 13, fontFamily: Theme.typography.fontFamily }}>Analyzing locality connectivity...</Text>
                </View>
              ) : snapshot ? (
                <View style={styles.sheetSection}>
                  <Text style={styles.sheetSectionTitle}>Locality Intelligence</Text>
                  
                  {/* Location Tabs Bar */}
                  <View style={styles.locationTabsBar}>
                    {['Snapshot', 'Interactive Map', 'Nearby Places', 'Commute Times', 'Market Trends'].map((tab) => {
                      const active = activeLocationTab === tab;
                      return (
                        <TouchableOpacity
                          key={tab}
                          style={[styles.locationTabBtn, active && styles.locationTabBtnActive]}
                          onPress={() => setActiveLocationTab(tab)}
                        >
                          <Text style={[styles.locationTabBtnText, active && styles.locationTabBtnTextActive]}>
                            {tab}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Tab Body Contents */}
                  {activeLocationTab === 'Snapshot' && (
                    <View style={styles.snapshotCard}>
                      <Text style={styles.snapshotTitle}>Neighborhood Snapshot</Text>
                      
                      {/* Lifestyle Insight Tags */}
                      {snapshot.lifestyleTags && snapshot.lifestyleTags.length > 0 && (
                        <View style={styles.lifestyleContainer}>
                          {snapshot.lifestyleTags.map((tag) => (
                            <View key={tag} style={styles.lifestyleChip}>
                              <Text style={styles.lifestyleChipText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={styles.snapshotGrid}>
                        {(() => {
                          const metro = snapshot.nearbyPlaces.find(p => p.subcategory === 'Metro Station');
                          if (!metro) return null;
                          return (
                            <View style={styles.snapshotBadge}>
                              <Text style={styles.snapshotBadgeText}>🚇 Metro • {metro.distance}m</Text>
                            </View>
                          );
                        })()}
                        {(() => {
                          const hospital = snapshot.nearbyPlaces.find(p => p.subcategory === 'Hospital');
                          if (!hospital) return null;
                          return (
                            <View style={styles.snapshotBadge}>
                              <Text style={styles.snapshotBadgeText}>🏥 Hospital • {hospital.distance}m</Text>
                            </View>
                          );
                        })()}
                        {(() => {
                          const park = snapshot.nearbyPlaces.find(p => p.subcategory === 'Park');
                          if (!park) return null;
                          return (
                            <View style={styles.snapshotBadge}>
                              <Text style={styles.snapshotBadgeText}>🌳 Park • {park.distance}m</Text>
                            </View>
                          );
                        })()}
                        {(() => {
                          const cafe = snapshot.nearbyPlaces.find(p => p.subcategory === 'Cafe');
                          if (!cafe) return null;
                          return (
                            <View style={styles.snapshotBadge}>
                              <Text style={styles.snapshotBadgeText}>☕ Cafe • {cafe.distance}m</Text>
                            </View>
                          );
                        })()}
                        {(() => {
                          const school = snapshot.nearbyPlaces.find(p => p.subcategory === 'School');
                          if (!school) return null;
                          return (
                            <View style={styles.snapshotBadge}>
                              <Text style={styles.snapshotBadgeText}>🏫 School • {school.distance}m</Text>
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                  )}

                  {activeLocationTab === 'Interactive Map' && (
                    <View style={[styles.tabBodyContent, { height: 200, borderRadius: Theme.borderRadius.md, overflow: 'hidden', padding: 0 }]}>
                      {reactNativeMapProvider.renderMap(
                        { latitude: selectedProperty.latitude || 0, longitude: selectedProperty.longitude || 0 },
                        snapshot.nearbyPlaces
                      )}
                    </View>
                  )}

                  {activeLocationTab === 'Nearby Places' && (
                    <View style={styles.tabBodyContent}>
                      {snapshot.nearbyPlaces.slice(0, 5).map((place) => (
                        <View key={place.id} style={styles.nearbyPlaceItem}>
                          <View style={{ flex: 1, gap: 2 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: Theme.typography.sizes.sm, fontFamily: Theme.typography.fontFamilySemiBold, color: Theme.colors.textPrimary }} numberOfLines={1}>
                                {place.name}
                              </Text>
                              <Text style={styles.categorySubText}>{place.subcategory}</Text>
                            </View>
                            {place.optionalRating && (
                               <Text style={{ fontSize: Theme.typography.sizes.xs, color: '#f59e0b', fontFamily: Theme.typography.fontFamilyBold }}>
                                ★ {place.optionalRating} rating
                              </Text>
                            )}
                          </View>
                           <Text style={{ fontSize: 11, color: Theme.colors.textSecondary, fontFamily: Theme.typography.fontFamily }}>
                            {place.distance}m • {place.estimatedTravelTime} mins
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {activeLocationTab === 'Commute Times' && (
                    <View style={styles.tabBodyContent}>
                      {snapshot.commuteHighlights.slice(0, 5).map((est, idx) => (
                        <View key={idx} style={styles.commuteItem}>
                          <View style={{ gap: 2 }}>
                             <Text style={{ fontSize: Theme.typography.sizes.sm, fontFamily: Theme.typography.fontFamilySemiBold, color: Theme.colors.textPrimary }}>{est.destination}</Text>
                             <Text style={{ fontSize: Theme.typography.sizes.xs, color: Theme.colors.textSecondary, fontFamily: Theme.typography.fontFamily, textTransform: 'capitalize' }}>
                              via {est.transportMode}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 2 }}>
                             <Text style={{ fontSize: Theme.typography.sizes.sm, fontFamily: Theme.typography.fontFamilyBold, color: Theme.colors.primary }}>
                              {est.estimatedDuration} mins
                            </Text>
                             <Text style={{ fontSize: Theme.typography.sizes.xxs, color: Theme.colors.textSecondary, fontFamily: Theme.typography.fontFamily }}>
                              {(est.distance / 1000).toFixed(1)} km
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {activeLocationTab === 'Market Trends' && (
                    <View style={styles.tabBodyContent}>
                      {snapshot.localityMetrics ? (
                        <View style={styles.marketCard}>
                          <View style={styles.marketRow}>
                            <Text style={styles.marketLabel}>Average Price per Sq.ft</Text>
                            <Text style={styles.marketValue}>{formatCurrency(snapshot.localityMetrics.averagePricePerSqft)}</Text>
                          </View>
                          <View style={styles.marketRow}>
                            <Text style={styles.marketLabel}>Median Rent / month</Text>
                            <Text style={styles.marketValue}>{formatCurrency(snapshot.localityMetrics.medianRent)}</Text>
                          </View>
                          <View style={styles.marketRow}>
                            <Text style={styles.marketLabel}>Median Sale Price</Text>
                            <Text style={styles.marketValue}>{formatCurrency(snapshot.localityMetrics.medianSalePrice)}</Text>
                          </View>
                          <View style={styles.marketRow}>
                            <Text style={styles.marketLabel}>Active Area Listings</Text>
                            <Text style={styles.marketValue}>{snapshot.localityMetrics.activeListings} active</Text>
                          </View>
                          <View style={styles.marketRow}>
                            <Text style={styles.marketLabel}>Listing Density</Text>
                            <Text style={styles.marketValue}>{snapshot.localityMetrics.listingDensity} / sq km</Text>
                          </View>
                        </View>
                      ) : (
                         <Text style={{ color: Theme.colors.textSecondary, fontSize: Theme.typography.sizes.sm, fontFamily: Theme.typography.fontFamily }}>Locality market pricing trends unavailable.</Text>
                      )}
                    </View>
                  )}
                </View>
              ) : null}

              {/* Description */}
              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionTitle}>Description</Text>
                <Text style={styles.sheetDesc}>{selectedProperty.description}</Text>
              </View>

              {/* Amenities */}
              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionTitle}>Amenities</Text>
                <View style={styles.sheetAmenities}>
                  {selectedProperty.amenities && selectedProperty.amenities.length > 0 ? (
                    selectedProperty.amenities.map((amenityId) => {
                      const resolvedAmenity = AMENITIES.find(a => a.id === amenityId);
                      return (
                        <View key={amenityId} style={styles.amenityChip}>
                          <Text style={styles.amenityText}>{resolvedAmenity ? resolvedAmenity.label : amenityId}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ color: Theme.colors.textSecondary, fontSize: 13, fontFamily: Theme.typography.fontFamily }}>No listed amenities.</Text>
                  )}
                </View>
              </View>

              {/* Owner Info */}
              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionTitle}>Listing Agent</Text>
                <View style={styles.ownerCard}>
                  <Avatar
                    name="Vikram Malhotra"
                    source="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80"
                    size="md"
                  />
                  <View style={styles.ownerInfo}>
                    <Text style={styles.ownerName}>Vikram Malhotra</Text>
                    <Text style={styles.ownerTitle}>Property Owner / Manager</Text>
                  </View>
                </View>
              </View>

              {/* Quick Directions Button */}
              {selectedProperty?.latitude && selectedProperty?.longitude && (
                <View style={styles.sheetSection}>
                  <Button
                    variant="secondary"
                    style={{ width: '100%' }}
                    onPress={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedProperty.latitude},${selectedProperty.longitude}`;
                      Linking.openURL(url);
                    }}
                  >
                    Get Directions in Google Maps
                  </Button>
                </View>
              )}

              {/* Sprint 15 Action Buttons Row */}
              <View style={styles.sheetActionsRow}>
                <TouchableOpacity
                  onPress={() => handleShareProperty(selectedProperty)}
                  style={styles.sheetActionBtn}
                  accessibilityLabel="Share listing"
                  accessibilityRole="button"
                >
                  <Share2 size={16} color={Theme.colors.textPrimary} />
                  <Text style={styles.sheetActionBtnText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSavePropertyToCollection(selectedProperty)}
                  style={styles.sheetActionBtn}
                  accessibilityLabel="Save listing to collection"
                  accessibilityRole="button"
                >
                  <Heart
                    size={16}
                    color={savedPropertyIds.has(selectedProperty.id) ? Theme.colors.primary : Theme.colors.textPrimary}
                    fill={savedPropertyIds.has(selectedProperty.id) ? Theme.colors.primary : 'transparent'}
                  />
                  <Text style={styles.sheetActionBtnText}>
                    {savedPropertyIds.has(selectedProperty.id) ? 'Saved' : 'Save'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleComparePropertyToggle(selectedProperty)}
                  style={styles.sheetActionBtn}
                  accessibilityLabel="Toggle property comparison"
                  accessibilityRole="button"
                >
                  <GitCompare
                    size={16}
                    color={compareQueue.includes(selectedProperty.id) ? Theme.colors.primary : Theme.colors.textPrimary}
                  />
                  <Text style={styles.sheetActionBtnText}>
                    {compareQueue.includes(selectedProperty.id) ? 'Comparing' : 'Compare'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action Button */}
              <Button
                variant="primary"
                style={styles.sheetContactBtn}
                onPress={() => alert(`Connecting you to Vikram Malhotra for ${selectedProperty.title}`)}
              >
                Contact Owner
              </Button>
            </View>
          </ScrollView>
        )}
      </BottomSheet>

      {/* Sprint 15 - Floating Comparison Banner */}
      {compareQueue.length > 0 && (
        <View style={styles.compareBanner} accessibilityRole="none">
          <View style={styles.compareBannerLeft}>
            <GitCompare size={18} color={Theme.colors.primary} />
            <Text style={styles.compareBannerText}>
              Comparing {compareQueue.length} {compareQueue.length === 1 ? 'property' : 'properties'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.compareBannerBtn}
            onPress={() => router.push('/compare' as any)}
            accessibilityLabel="Open compare screen button"
            accessibilityRole="button"
          >
            <Text style={styles.compareBannerBtnText}>Compare Now</Text>
            <ArrowRight size={14} color={Theme.colors.background} />
          </TouchableOpacity>
        </View>
      )}

      {/* Modal - Save to Collection Picker (Feed version) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={saveModalVisible}
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} accessibilityViewIsModal={true}>
            <Text style={styles.modalTitle}>
              {creatingNewCollection ? 'Create Collection & Save' : 'Save to Collection'}
            </Text>

            {creatingNewCollection ? (
              <View style={{ gap: Theme.spacing.md }}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Collection Name (e.g. Dream Homes)"
                  placeholderTextColor={Theme.colors.textSecondary}
                  value={newColName}
                  onChangeText={setNewColName}
                  maxLength={30}
                  accessibilityLabel="Collection Name Input"
                />
                <TextInput
                  style={[styles.modalInput, styles.modalInputDesc]}
                  placeholder="Description (Optional)"
                  placeholderTextColor={Theme.colors.textSecondary}
                  value={newColDesc}
                  onChangeText={setNewColDesc}
                  multiline
                  maxLength={100}
                  accessibilityLabel="Collection Description Input"
                />
                {collections.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setCreatingNewCollection(false)}
                    accessibilityLabel="Choose existing collection toggle"
                    accessibilityRole="button"
                  >
                    <Text style={styles.toggleCreateText}>Choose existing collection</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ gap: Theme.spacing.md }}>
                <Text style={styles.modalSubtitle}>Select Target Collection:</Text>
                <ScrollView style={styles.collectionsSelectorList} nestedScrollEnabled>
                  {collections.map((col) => (
                    <TouchableOpacity
                      key={col.id}
                      style={[
                        styles.collectionSelectItem,
                        selectedColId === col.id && styles.collectionSelectItemActive,
                      ]}
                      onPress={() => setSelectedColId(col.id)}
                      accessibilityLabel={`Select collection ${col.name}`}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.collectionSelectText,
                          selectedColId === col.id && styles.collectionSelectTextActive,
                        ]}
                      >
                        {col.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  onPress={() => setCreatingNewCollection(true)}
                  accessibilityLabel="Create custom collection toggle"
                  accessibilityRole="button"
                >
                  <Text style={styles.toggleCreateText}>+ Create New Collection</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Note text input */}
            <TextInput
              style={styles.modalInputNote}
              placeholder="Add personal note (e.g. kitchen size, view)..."
              placeholderTextColor={Theme.colors.textSecondary}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              maxLength={200}
              accessibilityLabel="Personal Listing Note"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSaveModalVisible(false)}
                accessibilityLabel="Cancel saving listing"
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveToCollectionSubmit}
                accessibilityLabel="Confirm save to collection"
                accessibilityRole="button"
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 11, 0.52)',
  },
  overlayContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Theme.spacing.lg,
  },
  bottomInfo: {
    flex: 1,
    alignSelf: 'flex-end',
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.xs,
  },
  price: {
    fontSize: Theme.typography.sizes.h1,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  perMonth: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    letterSpacing: Theme.typography.letterSpacing.tight,
  },
  location: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
  },
  tagText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'capitalize',
  },
  contactBtn: {
    width: '90%',
  },
  sidebar: {
    alignSelf: 'flex-end',
    marginBottom: Theme.spacing.md,
    marginLeft: Theme.spacing.md,
    gap: Theme.spacing.lg,
    alignItems: 'center',
  },
  sidebarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(21, 21, 24, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sidebarBtnActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '20',
  },

  // Sheet styling details
  sheetScroll: {
    flex: 1,
    marginTop: Theme.spacing.xs,
  },
  sheetScrollContent: {
    paddingBottom: Theme.spacing.xxxl,
  },
  sheetHeroImage: {
    width: '100%',
    height: 220,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  sheetBody: {
    paddingVertical: Theme.spacing.lg,
    gap: Theme.spacing.lg,
  },
  sheetPrice: {
    fontSize: 26,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  sheetPerMonth: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  sheetAddress: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: -Theme.spacing.md,
  },
  sheetSpecs: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  sheetDetailedSpecs: {
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginTop: Theme.spacing.sm,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  specValue: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  sheetSpecItem: {
    alignItems: 'center',
    gap: 2,
  },
  sheetSpecValue: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'capitalize',
  },
  sheetSpecLabel: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  sheetSection: {
    gap: Theme.spacing.xs,
  },
  sheetSectionTitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wider,
  },
  sheetDesc: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    lineHeight: Theme.typography.lineHeights.xl,
  },
  sheetAmenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  amenityChip: {
    backgroundColor: Theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.full,
  },
  amenityText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  ownerTitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  mapPlaceholder: {
    height: 140,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
  },
  snapshotCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    gap: Theme.spacing.xs,
  },
  snapshotTitle: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wider,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.xs,
    marginTop: 4,
  },
  snapshotBadge: {
    paddingVertical: 5,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.full,
  },
  snapshotBadgeText: {
    fontSize: 11,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  locationTabsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: Theme.spacing.md,
  },
  locationTabBtn: {
    paddingVertical: 6,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  locationTabBtnActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '15',
  },
  locationTabBtnText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  locationTabBtnTextActive: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  tabBodyContent: {
    padding: Theme.spacing.sm,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    minHeight: 120,
    gap: Theme.spacing.xs,
  },
  nearbyPlaceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border + '30',
  },
  categorySubText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    backgroundColor: Theme.colors.border + '30',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commuteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border + '30',
  },
  marketCard: {
    gap: 8,
  },
  marketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marketLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  marketValue: {
    fontSize: 13,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  lifestyleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.xs,
    marginTop: 6,
    marginBottom: 8,
  },
  lifestyleChip: {
    paddingVertical: 4,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.primary + '08',
    borderColor: Theme.colors.primary + '40',
    borderWidth: 1,
    borderRadius: Theme.borderRadius.full,
  },
  lifestyleChipText: {
    fontSize: 11,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  sheetContactBtn: {
    width: '100%',
    marginTop: Theme.spacing.sm,
  },

  // Report Modal styling
  reportSheet: {
    paddingVertical: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  reportSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  reasonScroll: {
    maxHeight: 180,
  },
  reasonScrollContent: {
    gap: Theme.spacing.sm,
  },
  reasonItem: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  reasonItemActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '15',
  },
  reasonText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  reasonTextActive: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  reportForm: {
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.xs,
  },
  submitReportBtn: {
    width: '100%',
    marginTop: Theme.spacing.xs,
  },
  floatingHeader: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Theme.spacing.lg,
  },
  chipsScroll: {
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingRight: 30,
  },
  searchButton: {
    backgroundColor: 'rgba(21, 21, 24, 0.85)',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chip: {
    backgroundColor: 'rgba(21, 21, 24, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
  },
  chipText: {
    color: '#FFF',
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilySemiBold,
    textTransform: 'capitalize',
  },
  welcomeGreeting: {
    color: '#FFF',
    fontSize: Theme.typography.sizes.lg,
    marginBottom: Theme.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    fontFamily: Theme.typography.fontFamilyBold,
    marginTop: 8,
  },
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(21, 21, 24, 0.95)',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(212, 163, 89, 0.3)',
  },
  resumeTextCol: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  resumeCardTitle: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  resumeCardDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: Theme.typography.fontFamily,
  },
  resumeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  resumeBtn: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.md,
  },
  resumeBtnText: {
    color: '#000',
    fontSize: 11,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  resumeDismissBtn: {
    padding: 6,
  },
  resumeDismissText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  sinceLastContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#0F0F12',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  sinceLastCard: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(212, 163, 89, 0.25)',
    alignItems: 'center',
  },
  sinceLastIcon: {
    marginBottom: Theme.spacing.md,
  },
  sinceLastTitle: {
    fontSize: Theme.typography.sizes.xl,
    color: '#FFF',
    marginBottom: Theme.spacing.xs,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
  },
  sinceLastSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    lineHeight: Theme.typography.lineHeights.md,
    marginBottom: Theme.spacing.lg,
    fontFamily: Theme.typography.fontFamily,
  },
  sinceLastDivider: {
    width: '100%',
    height: 1,
    backgroundColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg,
  },
  sinceLastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Theme.spacing.md,
    backgroundColor: '#0F0F11',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  sinceLastValue: {
    fontSize: Theme.typography.sizes.xl,
    color: Theme.colors.primary,
    marginRight: Theme.spacing.md,
    width: 24,
    textAlign: 'center',
    fontFamily: Theme.typography.fontFamilyBold,
  },
  sinceLastLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: '#FFF',
    flex: 1,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  trustSignalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  trustSignalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 163, 89, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(212, 163, 89, 0.25)',
  },
  trustSignalText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.sizes.xxs,
    marginLeft: 3,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wide,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  explanationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  explanationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  explanationTagText: {
    color: '#FFF',
    fontSize: Theme.typography.sizes.xs,
    marginLeft: 3,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  sheetActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
  },
  sheetActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    paddingVertical: Theme.spacing.sm,
    gap: 6,
  },
  sheetActionBtnText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
  },
  compareBanner: {
    position: 'absolute',
    bottom: Theme.floatingDock.height + Theme.spacing.md,
    left: Theme.spacing.lg,
    right: Theme.spacing.lg,
    backgroundColor: 'rgba(21, 21, 24, 0.95)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(223, 185, 120, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Theme.spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    zIndex: 999,
  },
  compareBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  compareBannerText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
  },
  compareBannerBtn: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  compareBannerBtnText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.xl,
    gap: Theme.spacing.md,
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textSecondary,
  },
  modalInput: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
  },
  modalInputDesc: {
    height: 60,
    textAlignVertical: 'top',
  },
  modalInputNote: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamily,
    height: 50,
    textAlignVertical: 'top',
  },
  toggleCreateText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.primary,
    textAlign: 'center',
  },
  collectionsSelectorList: {
    maxHeight: 120,
  },
  collectionSelectItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  collectionSelectItemActive: {
    backgroundColor: '#1E1E22',
  },
  collectionSelectText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
  },
  collectionSelectTextActive: {
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modalCancelText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xxl,
    backgroundColor: Theme.colors.background,
  },
  emptyHeaderSection: {
    width: '100%',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingVertical: Theme.spacing.lg,
  },
  emptyGreeting: {
    fontSize: Theme.typography.sizes.h2,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  emptyActionBtn: {
    minWidth: 200,
    marginTop: Theme.spacing.xs,
  },
  emptyDivider: {
    width: '100%',
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: Theme.spacing.xxl,
  },
  emptyBodySection: {
    width: '100%',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingVertical: Theme.spacing.lg,
  },
  emptyFeedbackTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyFeedbackSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
});
