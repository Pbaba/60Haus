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
import { useAuth } from '../../hooks/useAuth';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, Phone, MapPin, Flag, Search } from 'lucide-react-native';
import { useFeedback } from '../../context/FeedbackContext';
import { profileService } from '../../services/profileService';
import Animated from 'react-native-reanimated';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { DiscoveryEndScreen } from '../../components/DiscoveryEndScreen';
import { SkeletonFeed } from '../../components/Skeleton';
import { ImageFeedItem } from '../../components/ImageFeedItem';
import { Input } from '../../components/Input';
import { Avatar } from '../../components/Avatar';
import { BottomSheet } from '../../components/BottomSheet';
import { FeedbackState } from '../../components/FeedbackState';
import { useProperties } from '../../hooks/useProperties';
import { Theme } from '../../theme';
import { formatCurrency } from '../../utils';
import { PropertyListing } from '../../types';
import { VideoFeedItem } from '../../components/VideoFeedItem';
import { reportService } from '../../services/reportService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedBookmark = Animated.createAnimatedComponent(Bookmark);
const FlashListAny = FlashList as any;

export default function FeedScreen() {
  const router = useRouter();
  const { isGuest } = useAuth();
  const insets = useSafeAreaInsets();
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

  // Listing Report States
  const [reportingPropertyId, setReportingPropertyId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

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

  const handlePropertyPress = (property: PropertyListing) => {
    setSelectedProperty(property);
  };

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

    const isSaved = savedPropertyIds.has(item.id);
    
    return (
      <View style={styles.page}>
        {item.videoUrl ? (
          <VideoFeedItem
            videoUrl={item.videoUrl}
            thumbnailUrl={item.thumbnailUrl}
            isActive={isActive}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(prev => !prev)}
            onViewCountIncrement={() => incrementViewCount(item.id)}
            onDoubleTapSave={() => handleSavePress(item.id)}
            shouldLoad={isActive || index === activeIdx + 1}
          />
        ) : (
          <ImageFeedItem
            imageUrls={item.imageUrls || []}
            thumbnailUrl={item.thumbnailUrl}
            onDoubleTapSave={() => handleSavePress(item.id)}
          />
        )}
        
        <View style={styles.gradientOverlay} />

        <View
          style={[
            styles.overlayContent,
            { paddingBottom: insets.bottom + Theme.floatingDock.height + Theme.spacing.lg },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handlePropertyPress(item)}
            style={styles.bottomInfo}
          >
            <Text style={styles.price}>
              {formatCurrency(item.price)}
              <Text style={styles.perMonth}>/month</Text>
            </Text>
            
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            
            <Text style={styles.location}>
              <MapPin size={16} color={Theme.colors.textSecondary} />
              {item.address}, {item.city}
            </Text>

            <View style={styles.tagsContainer}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.bedrooms} BHK</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.furnishing.replace('-', ' ')}</Text>
              </View>
              {item.viewCount !== undefined && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.viewCount} views</Text>
                </View>
              )}
            </View>

            <Button
              variant="primary"
              style={styles.contactBtn}
              onPress={() => handleQuickCall(item)}
            >
              Contact Owner
            </Button>
          </TouchableOpacity>

          <View style={styles.sidebar}>
            {/* Save Action */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.sidebarBtn, isSaved && styles.sidebarBtnActive]}
              onPress={() => handleSavePress(item.id)}
            >
              <AnimatedBookmark
                size={22}
                color={isSaved ? Theme.colors.primary : Theme.colors.textPrimary}
              />
            </TouchableOpacity>

            {/* Quick Call Action */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sidebarBtn}
              onPress={() => handleQuickCall(item)}
            >
              <Phone size={20} color={Theme.colors.textPrimary} />
            </TouchableOpacity>

            {/* Report Listing Flag Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sidebarBtn}
              onPress={() => handleReportPress(item.id)}
            >
              <Flag size={18} color={Theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [savedPropertyIds, activeIdx, isMuted, insets.bottom, handleReportPress, handleSavePress, handleQuickCall, incrementViewCount, router]);

  const listData = [...filteredProperties];
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
                <Text style={styles.sheetPerMonth}>/month</Text>
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
                  <Text style={styles.sheetSpecValue}>1,450 sq ft</Text>
                  <Text style={styles.sheetSpecLabel}>Size</Text>
                </View>
              </View>

              {/* Description */}
              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionTitle}>Description</Text>
                <Text style={styles.sheetDesc}>{selectedProperty.description}</Text>
              </View>

              {/* Amenities */}
              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionTitle}>Amenities</Text>
                <View style={styles.sheetAmenities}>
                  {['WiFi Connection', 'Swimming Pool', 'Gymnasium', 'Reserved Parking'].map((a) => (
                    <View key={a} style={styles.amenityChip}>
                      <Text style={styles.amenityText}>{a}</Text>
                    </View>
                  ))}
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

              {/* Map Placeholder */}
              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionTitle}>Location map</Text>
                <View style={styles.mapPlaceholder}>
                  <Text style={styles.mapPlaceholderText}>
                    [ Satellite Map Location View ]
                  </Text>
                </View>
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
    flex: 1,
    justifyContent: 'flex-end',
    flexDirection: 'row',
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
});
