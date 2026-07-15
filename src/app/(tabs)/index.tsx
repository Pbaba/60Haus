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
} from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedSearchPanel } from '../../components/SavedSearchPanel';
import { useAuth } from '../../hooks/useAuth';
import { Image } from 'expo-image';
import { Search, Award } from 'lucide-react-native';
import { useFeedback } from '../../context/FeedbackContext';
import { profileService } from '../../services/profileService';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { DiscoveryEndScreen } from '../../components/DiscoveryEndScreen';
import { FeedItemCell } from '../../components/FeedItemCell';
import { AMENITIES } from '../../constants/property';
import { SkeletonFeed } from '../../components/Skeleton';
import { locationDomain, reactNativeMapProvider, NeighborhoodSnapshot } from '../../domain/location';
import { Input } from '../../components/Input';
import { Avatar } from '../../components/Avatar';
import { BottomSheet } from '../../components/BottomSheet';
import { FeedbackState } from '../../components/FeedbackState';
import { useProperties } from '../../hooks/useProperties';
import { Theme } from '../../theme';
import { formatCurrency } from '../../utils';
import { PropertyListing, DiscoveryMode } from '../../types';
import { SearchFilters } from '../../components/SearchOverlay';
import { hapticsService } from '../../services/hapticsService';
import { reportService } from '../../services/reportService';

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
    setDiscoveryMode,
    hasExactMatchesRemaining,
    incrementContactCount,
    filters,
    setFilters,
  } = useProperties();
  const { showToast, showTransactionFeedback } = useFeedback();

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
  const [resumeState, setResumeState] = useState<ResumeBrowsingState | null>(null);
  const [showResumeCard, setShowResumeCard] = useState(false);

  // Geographic Locality States
  const [snapshot, setSnapshot] = useState<NeighborhoodSnapshot | null>(null);
  const [activeLocationTab, setActiveLocationTab] = useState('Snapshot');
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  useEffect(() => {
    if (selectedProperty) {
      setLoadingSnapshot(true);
      setSnapshot(null);
      setActiveLocationTab('Snapshot');
      
      const loadSnapshot = async () => {
        try {
          const snap = await locationDomain.getNeighborhoodSnapshot(selectedProperty, properties);
          setSnapshot(snap);
        } catch (e) {
          console.warn('Failed to load neighborhood details:', e);
        } finally {
          setLoadingSnapshot(false);
        }
      };
      
      loadSnapshot();
    } else {
      setSnapshot(null);
    }
  }, [selectedProperty, properties]);

  // Listing Report States
  const [reportingPropertyId, setReportingPropertyId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Load saved session on mount
  useEffect(() => {
    const checkResumeProgress = async () => {
      try {
        const saved = await AsyncStorage.getItem('@resume_browsing_state');
        if (saved) {
          const parsed: ResumeBrowsingState = JSON.parse(saved);
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            setResumeState(parsed);
            setShowResumeCard(true);
          }
        }
      } catch (e) {
        console.warn('Failed to load resume state:', e);
      }
    };
    checkResumeProgress();
  }, []);

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

  const handleResume = async () => {
    if (!resumeState) return;
    hapticsService.success();
    setShowResumeCard(false);

    setFilters(resumeState.filters);
    setDiscoveryMode(resumeState.discoveryMode);
    
    await fetchFeed();

    setTimeout(() => {
      const idx = filteredProperties.findIndex((p) => p.id === resumeState.propertyId);
      if (idx !== -1) {
        listRef.current?.scrollToIndex({ index: idx, animated: true });
        setActiveIdx(idx);
      } else {
        listRef.current?.scrollToIndex({ index: 0, animated: true });
        setActiveIdx(0);
        showToast('Saved listing is no longer available; starting from the top.', 'info');
      }
    }, 850);
  };

  const getWelcomeGreeting = () => {
    const hour = new Date().getHours();
    let greeting = 'Welcome back';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    const matchCount = filteredProperties.filter(p => !(p as any).isEndCard).length;
    const localityName = filters.localities && filters.localities[0] || filters.city;

    const messages = [
      `${greeting}. ${matchCount} new homes match your preferences.`,
      `${greeting}. 3 new listings were added in ${localityName} today.`,
      `You've got ${matchCount} new recommendations since yesterday.`,
    ];

    const idx = new Date().getDate() % messages.length;
    return messages[idx];
  };

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
  }, [isGuest, router]);

  const handleConfirmReport = async () => {
    if (!reportingPropertyId || !reportReason) return;
    setSubmittingReport(true);
    try {
      await reportService.submitReport(reportingPropertyId, reportReason, reportDetails);
      showTransactionFeedback(
        'success',
        'Report Submitted',
        'Thank you. Our moderation team will review this listing shortly.'
      );
      setReportingPropertyId(null);
      setReportReason(null);
      setReportDetails('');
    } catch {
      showTransactionFeedback('error', 'Report Failed', 'Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

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

  const renderItem = useCallback(({ item, index }: { item: PropertyListing; index: number }) => {
    const isActive = index === activeIdx;

    if ((item as any).isEndCard) {
      return (
        <View style={styles.page}>
          <DiscoveryEndScreen
            isActive={isActive}
            onOpenFilters={() => router.replace('/(tabs)/search' as any)}
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
        isMuted={isMuted}
        shouldLoad={isActive || index === activeIdx + 1}
        onToggleMute={() => setIsMuted(prev => !prev)}
        onViewCountIncrement={() => incrementViewCount(item.id)}
        onSavePress={handleSavePress}
        onQuickCall={handleQuickCall}
        onReportPress={handleReportPress}
        onPropertyPress={handlePropertyPress}
      />
    );
  }, [savedPropertyIds, activeIdx, isMuted, handleReportPress, handleSavePress, handleQuickCall, incrementViewCount, handlePropertyPress, router]);

  const listData = [...filteredProperties];
  if (listData.length >= 3 && !loading) {
    listData.splice(2, 0, {
      id: 'since-last-visit-card',
      isSinceLastVisitCard: true,
    } as any);
  }
  if (!hasExactMatchesRemaining && listData.length > 0 && !loading) {
    listData.push({
      id: 'discovery-end-card',
      isEndCard: true,
    } as any);
  }

  return (
    <ScreenContainer
      safeAreaTop={false}
      safeAreaBottom={false}
      style={styles.container}
    >
      {/* Floating Filters Header */}
      {!loading && listData.length > 0 && (
        <View style={styles.floatingHeader}>
          {activeIdx === 0 && (
            <>
              {/* Dynamic Welcome Back Text */}
              <Text style={styles.welcomeGreeting}>{getWelcomeGreeting()}</Text>

              {/* Resume Browsing Progress Card */}
              {showResumeCard && resumeState && (
                <View style={styles.resumeCard}>
                  <View style={styles.resumeTextCol}>
                    <Text style={styles.resumeCardTitle}>Continue where you left off</Text>
                    <Text style={styles.resumeCardDesc}>
                      Property {resumeState.propertyId.slice(-4)} • {resumeState.propertyLocality || resumeState.filters.city}
                    </Text>
                  </View>
                  <View style={styles.resumeActionRow}>
                    <TouchableOpacity style={styles.resumeBtn} onPress={handleResume}>
                      <Text style={styles.resumeBtnText}>Resume</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resumeDismissBtn}
                      onPress={() => {
                        hapticsService.light();
                        setShowResumeCard(false);
                      }}
                    >
                      <Text style={styles.resumeDismissText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Saved Search Profiles Selector */}
              <SavedSearchPanel
                currentFilters={filters}
                onApplyFilters={(newFilters) => {
                  setFilters(newFilters);
                  fetchFeed(); // reload feed and bypass cache
                }}
              />
            </>
          )}

          {/* Quick Filters Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.searchButton}
              onPress={() => router.push('/search' as any)}
            >
              <Search size={18} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.chip}>
              <Text style={styles.chipText}>{filters.city}</Text>
            </View>

            <View style={styles.chip}>
              <Text style={styles.chipText}>For {filters.listingType === 'rent' ? 'Rent' : 'Buy'}</Text>
            </View>

            {filters.bhk && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{filters.bhk} BHK</Text>
              </View>
            )}

            {filters.furnishing && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{filters.furnishing.replace('-', ' ')}</Text>
              </View>
            )}

            {filters.petFriendly && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Pet Friendly 🐾</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <SkeletonFeed />
      ) : listData.length > 0 ? (
        <FlashListAny
          ref={listRef}
          data={listData}
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
        <FeedbackState
          type={properties.length === 0 ? 'empty-feed' : 'empty-search'}
          title={properties.length === 0 ? 'No listings available yet.' : 'No Search Results'}
          onRetry={properties.length === 0 ? handleRefresh : undefined}
          actionText="Refresh Feed"
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
                  <Text style={{ color: Theme.colors.textSecondary, fontSize: 13 }}>Analyzing locality connectivity...</Text>
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
                              <Text style={{ fontSize: 12, fontWeight: '600', color: Theme.colors.textPrimary }} numberOfLines={1}>
                                {place.name}
                              </Text>
                              <Text style={styles.categorySubText}>{place.subcategory}</Text>
                            </View>
                            {place.optionalRating && (
                              <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: 'bold' }}>
                                ★ {place.optionalRating} rating
                              </Text>
                            )}
                          </View>
                          <Text style={{ fontSize: 11, color: Theme.colors.textSecondary }}>
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
                            <Text style={{ fontSize: 12, fontWeight: '600', color: Theme.colors.textPrimary }}>{est.destination}</Text>
                            <Text style={{ fontSize: 10, color: Theme.colors.textSecondary, textTransform: 'capitalize' }}>
                              via {est.transportMode}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 2 }}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: Theme.colors.primary }}>
                              {est.estimatedDuration} mins
                            </Text>
                            <Text style={{ fontSize: 9, color: Theme.colors.textSecondary }}>
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
                        <Text style={{ color: Theme.colors.textSecondary, fontSize: 12 }}>Locality market pricing trends unavailable.</Text>
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
                    <Text style={{ color: Theme.colors.textSecondary, fontSize: 13 }}>No listed amenities.</Text>
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

      {/* Listing Report Bottom Sheet */}
      <BottomSheet
        isOpen={reportingPropertyId !== null}
        onClose={() => {
          setReportingPropertyId(null);
          setReportReason(null);
          setReportDetails('');
        }}
        title="Report Listing"
      >
        <View style={styles.reportSheet}>
          <Text style={styles.reportSubtitle}>Select the reason for reporting this property:</Text>
          
          <ScrollView
            style={styles.reasonScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.reasonScrollContent}
          >
            {[
              'Spam',
              'Duplicate Listing',
              'Incorrect Information',
              'Misleading Photos',
              'Scam',
              'Already Sold/Rented',
              'Other',
            ].map((reason) => {
              const isSelected = reportReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  activeOpacity={0.8}
                  style={[styles.reasonItem, isSelected && styles.reasonItemActive]}
                  onPress={() => setReportReason(reason)}
                >
                  <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {reportReason !== null && (
            <View style={styles.reportForm}>
              <Input
                label="Optional Details"
                placeholder="Provide details of the issue..."
                value={reportDetails}
                onChangeText={setReportDetails}
                editable={!submittingReport}
              />

              <Button
                variant="primary"
                style={styles.submitReportBtn}
                disabled={submittingReport}
                onPress={handleConfirmReport}
              >
                {submittingReport ? 'Submitting...' : 'Submit Report'}
              </Button>
            </View>
          )}
        </View>
      </BottomSheet>
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
    fontSize: 28,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  perMonth: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: Theme.typography.weights.regular,
    color: Theme.colors.textSecondary,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    letterSpacing: -0.5,
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
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
  },
  sheetPerMonth: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontWeight: Theme.typography.weights.regular,
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
    fontWeight: Theme.typography.weights.semiBold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  sheetSpecItem: {
    alignItems: 'center',
    gap: 2,
  },
  sheetSpecValue: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
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
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sheetDesc: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    lineHeight: 22,
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
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
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
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Theme.typography.fontFamily,
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
    fontWeight: 'bold',
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
    fontSize: 10,
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
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  marketValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
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
    fontWeight: 'bold',
    fontFamily: Theme.typography.fontFamily,
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
    fontWeight: Theme.typography.weights.bold,
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
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    fontFamily: Theme.typography.fontFamily,
  },
  welcomeGreeting: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Theme.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    fontFamily: Theme.typography.fontFamily,
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
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Theme.typography.fontFamily,
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
    fontWeight: '700',
  },
  resumeDismissBtn: {
    padding: 6,
  },
  resumeDismissText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: Theme.spacing.xs,
    fontFamily: Theme.typography.fontFamily,
  },
  sinceLastSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    lineHeight: 18,
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
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.primary,
    marginRight: Theme.spacing.md,
    width: 24,
    textAlign: 'center',
  },
  sinceLastLabel: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
    flex: 1,
    fontFamily: Theme.typography.fontFamily,
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
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
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
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
});
