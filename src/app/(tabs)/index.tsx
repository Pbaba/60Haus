import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useAuth } from '../../hooks/useAuth';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, Phone, MapPin, Flag } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
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
    filteredProperties,
    savedIds,
    toggleSave,
    loading,
    refreshing,
    fetchFeed,
    loadMoreFeed,
    incrementViewCount,
  } = useProperties();
  
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
      Alert.alert(
        'Report Submitted',
        'Thank you. Our moderation team will review this listing shortly.'
      );
      setReportingPropertyId(null);
      setReportReason(null);
      setReportDetails('');
    } catch {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
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

  const [viewabilityConfig] = useState(() => ({
    itemVisiblePercentThreshold: 80,
  }));

  const [onViewableItemsChanged] = useState(() => ({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveIdx(viewableItems[0].index ?? 0);
    }
  });

  const renderItem = useCallback(({ item, index }: { item: PropertyListing; index: number }) => {
    const isSaved = savedIds.includes(item.id);
    const isActive = index === activeIdx;
    
    return (
      <View style={styles.page}>
        <VideoFeedItem
          videoUrl={item.videoUrl || 'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054f4d823e1e6955a5b512dbf2d9dbd&profile_id=139&oauth2_token_id=57447761'}
          thumbnailUrl={item.thumbnailUrl}
          isActive={isActive}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(prev => !prev)}
          onViewCountIncrement={() => incrementViewCount(item.id)}
        />
        
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
              onPress={() => alert(`Contacting Owner: ${item.title}`)}
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
              onPress={() => alert(`Calling Owner at +91 99999 88888`)}
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
  }, [savedIds, activeIdx, isMuted, insets.bottom, handleReportPress, handleSavePress, incrementViewCount]);

  return (
    <ScreenContainer
      safeAreaTop={false}
      safeAreaBottom={false}
      style={styles.container}
    >
      {loading ? (
        <FeedbackState type="loading" />
      ) : filteredProperties.length > 0 ? (
        <FlashListAny
          data={filteredProperties}
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
        <FeedbackState type="empty-search" />
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
});
