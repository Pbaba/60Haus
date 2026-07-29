import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Share, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { Skeleton } from '../../components/Skeleton';
import { FeedbackState } from '../../components/FeedbackState';
import { FullscreenGallery } from '../../components/FullscreenGallery';
import { useProperties } from '../../hooks/useProperties';
import { useAuth } from '../../hooks/useAuth';
import { useFeedback } from '../../context/FeedbackContext';
import { analyticsService } from '../../services/analyticsService';
import { SimilarProperties } from '../../features/discovery/components/SimilarProperties';
import { profileService } from '../../services/profileService';
import { discoveryService } from '../../services/discoveryService';
import { historyService } from '../../services/historyService';
import { supabase } from '../../lib/supabase';
import { conversationService } from '../../features/communication/services/conversationService';
import { notificationService } from '../../services/notificationService';
import { useAnalytics } from '../../features/analytics/hooks/useAnalytics';
import { Theme } from '../../theme';
import { formatCurrency } from '../../utils';
import { ArrowLeft, MapPin, Heart, Share2, Phone, GitCompare, ShieldAlert } from 'lucide-react-native';
import {
  PropertyListing,
  UserProfile,
  PropertyVerification,
  PriceHistoryRecord,
  PropertyActivityLog,
  ListingQualityReport,
} from '../../types';
import { trustService, MarketContextModel } from '../../services/trustService';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    properties, // Feed items
    savedPropertyIds,
    toggleSave,
    incrementContactCount,
    collections,
    addPropertyToCollection,
    createCollection,
    compareQueue,
    toggleCompare,
  } = useProperties();
  const { user, isGuest } = useAuth();
  const { showToast } = useFeedback();
  const { trackEvent } = useAnalytics();

  const [property, setProperty] = useState<PropertyListing | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  // Collections modal states
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [selectedColId, setSelectedColId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [creatingNewCollection, setCreatingNewCollection] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  // Sprint 16 Trust & Quality States
  const [verifications, setVerifications] = useState<PropertyVerification[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>([]);
  const [timeline, setTimeline] = useState<PropertyActivityLog[]>([]);
  const [qualityReport, setQualityReport] = useState<ListingQualityReport | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContextModel | null>(null);

  // Reporting States
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportCategory, setReportCategory] = useState<string | null>(null);
  const [reportDetailsText, setReportDetailsText] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const isSaved = id ? savedPropertyIds.has(id) : false;
  const isCompared = id ? compareQueue.includes(id) : false;

  const loadLiveDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      // 1. Query live listing join images & videos
      const { data: prop, error: propErr } = await supabase
        .from('properties')
        .select('*, property_images(image_url), property_videos(video_url, thumbnail_url)')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (propErr || !prop) throw propErr || new Error('Not found');

      const videoRecord = prop.property_videos && prop.property_videos[0];
      const mappedProperty: PropertyListing = {
        id: prop.id,
        ownerId: prop.owner_id,
        title: prop.title,
        description: prop.description,
        price: Number(prop.price),
        listingType: prop.listing_type,
        city: prop.city,
        address: prop.address,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        furnishing: prop.furnishing,
        thumbnailUrl: videoRecord?.thumbnail_url || prop.thumbnail_url,
        videoUrl: videoRecord?.video_url || '',
        createdAt: prop.created_at,
        imageUrls: prop.property_images ? prop.property_images.map((img: any) => img.image_url) : [],
        amenities: prop.amenities || [],
        viewCount: prop.view_count || 0,
        locality: prop.locality,
        // Sprint 16 transparency columns
        propertyAge: prop.property_age || null,
        possessionStatus: prop.possession_status || null,
        ownershipType: prop.ownership_type || null,
        propertyAgeConfidence: prop.property_age_confidence || 'estimated',
        lastInspectionDate: prop.last_inspection_date || null,
        lastInspectionConfidence: prop.last_inspection_confidence || 'estimated',
        occupancyStatus: prop.occupancy_status || null,
        registrationAvailability: prop.registration_availability === undefined ? true : prop.registration_availability,
        reraNumber: prop.rera_number || null,
        reraNumberConfidence: prop.rera_number_confidence || 'estimated',
      };

      setProperty(mappedProperty);

      // 2. Fetch owner profile details
      try {
        const owner = await profileService.getProfile(prop.owner_id);
        setOwnerProfile(owner);
      } catch (profileErr) {
        console.warn('Failed to load owner profile:', profileErr);
      }

      // 3. Fetch related listing recommendation models
      try {
        await discoveryService.getRecommendations(mappedProperty);
      } catch (recErr) {
        console.warn('Failed to load related listings:', recErr);
      }

      // 4. Log property history view record
      if (user && !isGuest) {
        await historyService.recordView(user.id, prop.id);
        trackEvent('property_viewed', prop.id, prop.owner_id);
      }

      // 5. Load Sprint 16 verification, history timeline, and pricing context
      try {
        const [verifs, prices, logs] = await Promise.all([
          trustService.getPropertyVerifications(prop.id),
          trustService.getPropertyPriceHistory(prop.id, Number(prop.price)),
          trustService.getPropertyTimeline(prop.id),
        ]);
        
        setVerifications(verifs);
        setPriceHistory(prices);
        setTimeline(logs);
        
        const qReport = trustService.compileListingQualityReport(mappedProperty, verifs);
        setQualityReport(qReport);
        
        const mContext = trustService.getMarketContext(mappedProperty, properties);
        setMarketContext(mContext);
      } catch (trustErr) {
        console.warn('Failed to load trust layers:', trustErr);
      }

    } catch (err) {
      console.error('Error fetching live listing details:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, user, isGuest, properties, trackEvent]);

  useEffect(() => {
    loadLiveDetails();
  }, [loadLiveDetails]);

  // Video view initialization
  const videoUrl = property?.videoUrl || '';
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = false;
  });

  const handleShare = async () => {
    if (!property) return;
    try {
      await Share.share({
        message: `Check out this amazing walkthrough: ${property.title} in ${property.locality || property.city} for ${formatCurrency(property.price)}/mo!`,
        url: `https://60haus.app/property/${property.id}`,
      });
      analyticsService.trackScreenView('property_detail');
      trackEvent('property_shared', property.id, property.ownerId);
    } catch {
      console.warn('Share failed');
    }
  };

  const handleSaveToggle = () => {
    if (isGuest || !id) {
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

    if (isSaved) {
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
              toggleSave(id);
              showToast('Removed from saved homes');
            },
          },
        ]
      );
      return;
    }

    // Default bookmark save or customize collection flow
    if (collections.length === 0) {
      setCreatingNewCollection(true);
    } else {
      setCreatingNewCollection(false);
      setSelectedColId(collections[0].id);
    }
    setSaveModalVisible(true);
  };

  const handleSaveToCollectionSubmit = async () => {
    if (!id) return;

    try {
      // Opt-in save properties globally to retain bookmarks sync
      if (!isSaved) {
        toggleSave(id);
        if (property) {
          trackEvent('property_saved', id, property.ownerId);
        }
      }

      if (creatingNewCollection) {
        if (!newColName.trim()) {
          showToast('Collection name is required.');
          return;
        }
        const col = await createCollection(newColName.trim(), newColDesc.trim());
        analyticsService.trackCollectionCreated(col.id, col.name);
        await addPropertyToCollection(col.id, id, noteText.trim());
        analyticsService.trackPropertyAddedToCollection(id, col.id);
        
        setNewColName('');
        setNewColDesc('');
      } else {
        if (!selectedColId) {
          showToast('Please select a collection.');
          return;
        }
        await addPropertyToCollection(selectedColId, id, noteText.trim());
        analyticsService.trackPropertyAddedToCollection(id, selectedColId);
      }

      setNoteText('');
      setSaveModalVisible(false);
    } catch {
      showToast('Failed to save to collection.');
    }
  };

  const handleCompareToggle = () => {
    if (!id) return;
    toggleCompare(id);
    const added = !isCompared;
    showToast(added ? 'Added to comparison queue' : 'Removed from comparison queue');
  };

  const handleReportSubmit = async () => {
    if (!id) return;
    if (!reportCategory) {
      showToast('Please select a category.');
      return;
    }
    setSubmittingReport(true);
    try {
      await trustService.submitReport(
        id,
        user?.id || null,
        reportCategory,
        reportDetailsText.trim()
      );
      analyticsService.trackListingReported(id, reportCategory);
      showToast('Thank you. The listing has been reported.');
      setReportCategory(null);
      setReportDetailsText('');
      setReportModalVisible(false);
    } catch {
      showToast('Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleContact = async () => {
    if (isGuest || !user) {
      Alert.alert(
        'Authentication Required',
        'Please sign in to contact the property owner.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login' as any) },
        ]
      );
      return;
    }

    if (id) {
      incrementContactCount(id);
    }

    if (!property) return;

    try {
      const conv = await conversationService.findOrCreateConversation(property.id, property.ownerId, user.id);
      if (conv) {
        // Optimistically notify owner
        if (ownerProfile?.push_token) {
          notificationService.sendPushNotification(
            ownerProfile.push_token,
            'New Inquiry',
            `${user.email || 'Someone'} is interested in ${property.title}.`,
            { url: `/chat/${conv.id}` }
          );
        }
        trackEvent('conversation_started', property.id, property.ownerId);
        router.push(`/chat/${conv.id}` as any);
      } else {
        showToast('Failed to start conversation.');
      }
    } catch {
      showToast('Failed to start conversation.');
    }
  };

  const renderSkeletons = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Skeleton height={240} width="100%" variant="rounded" />
      <View style={styles.body}>
        <Skeleton height={32} width="40%" />
        <Skeleton height={18} width="60%" style={{ marginTop: 4 }} />
        
        <View style={styles.specs}>
          <Skeleton height={40} width={70} />
          <Skeleton height={40} width={70} />
          <Skeleton height={40} width={70} />
        </View>

        <View style={styles.section}>
          <Skeleton height={20} width="30%" />
          <Skeleton height={60} width="100%" style={{ marginTop: 8 }} />
        </View>

        <View style={styles.section}>
          <Skeleton height={20} width="30%" />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Skeleton height={30} width={80} variant="rounded" />
            <Skeleton height={30} width={80} variant="rounded" />
            <Skeleton height={30} width={80} variant="rounded" />
          </View>
        </View>
      </View>
    </ScrollView>
  );

  if (error) {
    return (
      <ScreenContainer style={styles.center}>
        <FeedbackState type="error" onRetry={loadLiveDetails} />
      </ScreenContainer>
    );
  }

  if (loading || !property) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading details...</Text>
        </View>
        {renderSkeletons()}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {property.title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleCompareToggle} style={styles.iconBtn} accessibilityLabel="Toggle compare listing" accessibilityRole="button">
            <GitCompare size={22} color={isCompared ? Theme.colors.primary : Theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSaveToggle} style={styles.iconBtn}>
            <Heart size={22} color={isSaved ? Theme.colors.primary : Theme.colors.textPrimary} fill={isSaved ? Theme.colors.primary : 'transparent'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
            <Share2 size={22} color={Theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Walkthrough Video Player / Image Hero */}
        {property.videoUrl ? (
          <VideoView
            player={player}
            style={styles.heroVideo}
            nativeControls={true}
          />
        ) : (
          <Image
            source={{ uri: property.thumbnailUrl }}
            style={styles.heroImage}
            contentFit="cover"
          />
        )}
        
        <View style={styles.body}>
          {/* Main Info */}
          <Text style={styles.price}>
            {formatCurrency(property.price)}
            <Text style={styles.perMonth}>/month</Text>
          </Text>
          <Text style={styles.location}>
            <MapPin size={16} color={Theme.colors.textSecondary} /> {property.address}, {property.city}
          </Text>

          {/* Config Specs */}
          <View style={styles.specs}>
            <View style={styles.specItem}>
              <Text style={styles.specValue}>{property.bedrooms} BHK</Text>
              <Text style={styles.specLabel}>Configuration</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specValue}>{property.bathrooms}</Text>
              <Text style={styles.specLabel}>Bathrooms</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specValue}>{property.furnishing.replace('-', ' ')}</Text>
              <Text style={styles.specLabel}>Furnishing</Text>
            </View>
          </View>

          {/* Gallery Carousels */}
          {property.imageUrls && property.imageUrls.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Image Gallery</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                {property.imageUrls.map((url, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.9}
                    onPress={() => setGalleryIndex(index)}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.galleryImage}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.desc}>{property.description}</Text>
          </View>

          {/* Amenities Chips */}
          {property.amenities && property.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenities}>
                {property.amenities.map((a) => (
                  <View key={a} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Sprint 16 Trust & Quality Hub */}
          {qualityReport && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Listing Quality Report</Text>
              <View style={styles.qualityCard}>
                <View style={styles.qualityScoreHeader}>
                  <View style={styles.qualityScoreCircle}>
                    <Text style={styles.qualityScoreNumber}>{qualityReport.overallScore}</Text>
                    <Text style={styles.qualityScoreLabel}>Quality Score</Text>
                  </View>
                  <View style={styles.qualityScoreIntro}>
                    <Text style={styles.qualityIntroTitle}>Listing Confidence Rating</Text>
                    <Text style={styles.qualityIntroDesc}>
                      Evaluated dynamically based on verified owner records, document checks, metadata transparency, and description completeness.
                    </Text>
                  </View>
                </View>

                <View style={styles.dimensionsContainer}>
                  {qualityReport.explanations.map((exp) => (
                    <View key={exp.dimension} style={styles.dimensionRow}>
                      <View style={styles.dimensionHeader}>
                        <Text style={styles.dimensionTitle}>{exp.title}</Text>
                        <Text style={styles.dimensionScore}>{exp.score}/100</Text>
                      </View>
                      <View style={styles.barBackground}>
                        <View
                          style={[
                            styles.barForeground,
                            {
                              width: `${exp.score}%`,
                              backgroundColor:
                                exp.score >= 80
                                  ? '#4CD964'
                                  : exp.score >= 50
                                  ? Theme.colors.primary
                                  : '#FF3B30',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.dimensionDesc}>{exp.description}</Text>
                      <View style={styles.whyMattersBox}>
                        <Text style={styles.whyMattersLabel}>Why this matters:</Text>
                        <Text style={styles.whyMattersText}>{exp.whyItMatters}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Verification Checklist (Extensible model) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verification Status</Text>
            <View style={styles.verificationListCard}>
              {[
                { type: 'owner', label: 'Verified Owner', desc: 'Listing matches verified title deeds and land registries.' },
                { type: 'documents', label: 'Verified Documents', desc: 'Taxes, registration documents, and utility files verified by 60Haus agents.' },
                { type: 'contact', label: 'Verified Contact', desc: 'Active phone verification and landlord validation completed.' },
                { type: 'address', label: 'Verified Address', desc: 'Postal code and geographic address checked against municipal maps.' },
                { type: 'photos', label: 'Verified Photos', desc: 'Photos checked for consistency against physical inspection files.' },
              ].map((badge) => {
                const isVerified = verifications.some((v) => v.verificationType === badge.type);
                const verifiedRecord = verifications.find((v) => v.verificationType === badge.type);
                
                return (
                  <View key={badge.type} style={[styles.badgeItem, !isVerified && styles.badgeItemInactive]}>
                    <View style={styles.badgeLeft}>
                      <View
                        style={[
                          styles.badgeIconBg,
                          isVerified ? styles.badgeIconBgActive : styles.badgeIconBgInactive,
                        ]}
                      >
                        <Text style={{ color: isVerified ? '#000' : '#8E8E93', fontSize: 10, fontWeight: 'bold' }}>✓</Text>
                      </View>
                      <View style={styles.badgeInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.badgeLabel, isVerified && styles.badgeLabelActive]}>{badge.label}</Text>
                          {isVerified && (
                            <View style={styles.verifiedStamp}>
                              <Text style={styles.verifiedStampText}>Verified</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.badgeDesc}>{badge.desc}</Text>
                        {isVerified && verifiedRecord && (
                          <Text style={styles.verifiedDate}>
                            Checked on: {new Date(verifiedRecord.verifiedAt).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Pricing Context & History */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Market Context & Price History</Text>
            {marketContext && (
              <View style={styles.marketCard}>
                <View style={styles.marketCategoryRow}>
                  <View
                    style={[
                      styles.marketTag,
                      marketContext.valuationCategory === 'Excellent value'
                        ? styles.marketTagGood
                        : marketContext.valuationCategory === 'Above market price'
                        ? styles.marketTagBad
                        : styles.marketTagFair,
                    ]}
                  >
                    <Text
                      style={[
                        styles.marketTagText,
                        marketContext.valuationCategory === 'Excellent value'
                          ? styles.marketTagTextGood
                          : marketContext.valuationCategory === 'Above market price'
                          ? styles.marketTagTextBad
                          : styles.marketTagTextFair,
                      ]}
                    >
                      {marketContext.valuationCategory}
                    </Text>
                  </View>
                  <Text style={styles.marketDescText}>{marketContext.valuationDescription}</Text>
                </View>

                {/* Range stats */}
                <View style={styles.marketStatsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Local Min Price</Text>
                    <Text style={styles.statVal}>{formatCurrency(marketContext.localPriceMin)}</Text>
                  </View>
                  <View style={styles.statBoxDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Local Average</Text>
                    <Text style={styles.statVal}>{formatCurrency(marketContext.localAveragePrice)}</Text>
                  </View>
                  <View style={styles.statBoxDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Local Max Price</Text>
                    <Text style={styles.statVal}>{formatCurrency(marketContext.localPriceMax)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Price Timeline List */}
            {priceHistory.length > 0 && (
              <View style={styles.priceHistoryCard}>
                <Text style={styles.priceHistorySubtitle}>Price Evolution History</Text>
                {priceHistory.map((record, index) => {
                  let changeNode = null;
                  if (index > 0) {
                    const prevPrice = priceHistory[index - 1].price;
                    const diff = record.price - prevPrice;
                    const percent = Math.round((diff / prevPrice) * 100);
                    const color = diff < 0 ? '#4CD964' : '#FF3B30';
                    const sign = diff < 0 ? '' : '+';
                    
                    changeNode = (
                      <Text style={[styles.priceChangeTag, { color }]}>
                        {sign}{formatCurrency(diff)} ({sign}{percent}%)
                      </Text>
                    );
                  }
                  return (
                    <View key={record.id} style={styles.priceHistoryRow}>
                      <View style={styles.priceDotRow}>
                        <View style={styles.timelineDot} />
                        <Text style={styles.priceDate}>
                          {new Date(record.changedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.priceRowValue}>
                        <Text style={styles.priceValText}>{formatCurrency(record.price)}</Text>
                        {changeNode}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Activity Timeline */}
          {timeline.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Listing Timeline</Text>
              <View style={styles.timelineCard}>
                {timeline.map((log) => (
                  <View key={log.id} style={styles.timelineRow}>
                    <View style={styles.timelineConnectorCol}>
                      <View style={styles.timelineDotActive} />
                      <View style={styles.timelineBar} />
                    </View>
                    <View style={styles.timelineInfoCol}>
                      <Text style={styles.timelineEventTitle}>
                        {log.eventType.replace('_', ' ').toUpperCase()}
                      </Text>
                      <Text style={styles.timelineEventDesc}>{log.description}</Text>
                      <Text style={styles.timelineEventDate}>
                        {new Date(log.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Transparency Metadata */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Listing Transparency & Confidence</Text>
            <View style={styles.metadataCard}>
              {[
                { label: 'Ownership Type', value: property.ownershipType || 'Not Available', confidence: property.ownershipType ? 'verified' : 'estimated' },
                { label: 'Property Age', value: property.propertyAge ? `${property.propertyAge} years` : 'Not Available', confidence: property.propertyAgeConfidence || 'estimated' },
                { label: 'Last Inspection', value: property.lastInspectionDate ? new Date(property.lastInspectionDate).toLocaleDateString() : 'Not Inspected', confidence: property.lastInspectionConfidence || 'estimated' },
                { label: 'Occupancy Status', value: property.occupancyStatus || 'Not Disclosed', confidence: property.occupancyStatus ? 'verified' : 'estimated' },
                { label: 'Registration Certificate', value: property.registrationAvailability === undefined ? 'Unknown' : property.registrationAvailability ? 'Available' : 'Unavailable', confidence: 'verified' },
                { label: 'RERA Registration Number', value: property.reraNumber || 'Not Registered', confidence: property.reraNumberConfidence || 'estimated' },
              ].map((meta) => (
                <View key={meta.label} style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{meta.label}</Text>
                  <View style={styles.metaValueCol}>
                    <Text style={styles.metaValueText}>{meta.value}</Text>
                    <View
                      style={[
                        styles.confidenceBadge,
                        meta.confidence === 'verified' ? styles.confidenceBadgeVerified : styles.confidenceBadgeEstimated,
                      ]}
                    >
                      <Text
                        style={[
                          styles.confidenceBadgeText,
                          meta.confidence === 'verified' ? styles.confidenceBadgeTextVerified : styles.confidenceBadgeTextEstimated,
                        ]}
                      >
                        {meta.confidence}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Owner details Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Listing Host</Text>
            <View style={styles.ownerCard}>
              <Avatar
                name={ownerProfile?.fullName || 'Verified Owner'}
                source={ownerProfile?.avatarUrl}
                size="md"
              />
              <View style={styles.ownerInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.ownerName}>{ownerProfile?.fullName || 'Verified Owner'}</Text>
                  {ownerProfile?.verificationLevel && ownerProfile.verificationLevel !== 'unverified' && (
                    <View style={styles.ownerVerifBadge}>
                      <Text style={styles.ownerVerifBadgeText}>
                        {ownerProfile.verificationLevel} Host
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.ownerTitle}>Property Owner / Landlord</Text>
                <Text style={styles.ownerMetaText}>
                  Member since: {ownerProfile ? new Date(ownerProfile.createdAt).toLocaleDateString() : '2024'}
                </Text>
                <Text style={styles.ownerMetaText}>
                  Active Listings: {properties.filter((p) => p.ownerId === property.ownerId).length || 1} properties
                </Text>
                {ownerProfile?.bio ? <Text style={styles.ownerBio} numberOfLines={2}>{ownerProfile.bio}</Text> : null}
              </View>
            </View>
          </View>

          {/* Report Listing Card Button */}
          <TouchableOpacity
            style={styles.reportListingCardRow}
            onPress={() => {
              setReportModalVisible(true);
              analyticsService.trackTrustScoreExpanded(property.id); // Tracks event
            }}
            accessibilityLabel="Report listing issues button"
            accessibilityRole="button"
          >
            <ShieldAlert size={18} color={Theme.colors.danger || '#FF3B30'} />
            <Text style={styles.reportListingText}>Report listing errors, spam or suspicious pricing</Text>
          </TouchableOpacity>
          <SimilarProperties property={property} />

          <Button
            variant="primary"
            style={styles.contactBtn}
            onPress={handleContact}
          >
            <Phone size={18} color="#000" style={{ marginRight: 8 }} />
            Contact Owner
          </Button>
        </View>
      </ScrollView>

      {galleryIndex !== null && (
        <FullscreenGallery
          visible={galleryIndex !== null}
          images={property?.imageUrls || []}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}

      {/* Modal - Save to Collection Picker */}
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

      {/* Sprint 16 - Report Listing Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} accessibilityViewIsModal={true}>
            <Text style={styles.modalTitle}>Report Listing Issue</Text>
            <Text style={styles.modalSubtitle}>Help us keep 60Haus trustworthy. Select a category:</Text>

            <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
              {[
                { key: 'incorrect_information', label: 'Incorrect Information' },
                { key: 'fake_photos', label: 'Fake Photos' },
                { key: 'duplicate_listing', label: 'Duplicate Listing' },
                { key: 'already_sold', label: 'Already Sold / Unavail' },
                { key: 'spam', label: 'Spam listing' },
                { key: 'suspicious_pricing', label: 'Suspicious Pricing' },
                { key: 'other', label: 'Other Issue' },
              ].map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.collectionSelectItem,
                    reportCategory === cat.key && styles.collectionSelectItemActive,
                  ]}
                  onPress={() => setReportCategory(cat.key)}
                  accessibilityLabel={`Report as ${cat.label}`}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.collectionSelectText,
                      reportCategory === cat.key && styles.collectionSelectTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.modalInputNote, { height: 60 }]}
              placeholder="Provide extra details (optional)..."
              placeholderTextColor={Theme.colors.textSecondary}
              value={reportDetailsText}
              onChangeText={setReportDetailsText}
              multiline
              maxLength={200}
              accessibilityLabel="Report Details Text"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setReportModalVisible(false)}
                accessibilityLabel="Cancel report"
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: Theme.colors.danger || '#FF3B30' }]}
                onPress={handleReportSubmit}
                disabled={submittingReport}
                accessibilityLabel="Confirm submit report"
                accessibilityRole="button"
              >
                <Text style={[styles.modalSaveText, { color: '#FFF' }]}>
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </Text>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    gap: Theme.spacing.md,
  },
  backBtn: {
    padding: Theme.spacing.xs,
  },
  headerTitle: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  iconBtn: {
    padding: Theme.spacing.xs,
  },
  scrollContent: {
    paddingBottom: Theme.spacing.xxxl,
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
  },
  heroVideo: {
    width: '100%',
    height: 240,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  heroImage: {
    width: '100%',
    height: 240,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  body: {
    paddingVertical: Theme.spacing.lg,
    gap: Theme.spacing.lg,
  },
  price: {
    fontSize: 26,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  perMonth: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  location: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -Theme.spacing.md,
  },
  specs: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  specItem: {
    alignItems: 'center',
    gap: 2,
  },
  specValue: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'capitalize',
  },
  specLabel: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  section: {
    gap: Theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wider,
    marginBottom: Theme.spacing.xs,
  },
  desc: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    lineHeight: Theme.typography.lineHeights.xl,
  },
  amenities: {
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
  galleryScroll: {
    gap: Theme.spacing.md,
  },
  galleryImage: {
    width: 180,
    height: 120,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.backgroundSecondary,
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
  ownerBio: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: 4,
    lineHeight: Theme.typography.lineHeights.sm,
  },
  relatedScroll: {
    gap: Theme.spacing.md,
  },
  relatedCard: {
    width: 160,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  relatedThumb: {
    height: 100,
    width: '100%',
  },
  relatedInfo: {
    padding: Theme.spacing.sm,
    gap: 2,
  },
  relatedPrice: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  relatedTitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
  },
  relatedCity: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  contactBtn: {
    width: '100%',
    marginTop: Theme.spacing.sm,
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
  qualityCard: {
    backgroundColor: '#151518',
    borderRadius: 12,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  qualityScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  qualityScoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 163, 89, 0.05)',
  },
  qualityScoreNumber: {
    fontSize: Theme.typography.sizes.lg,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  qualityScoreLabel: {
    fontSize: 7,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
    marginTop: -2,
  },
  qualityScoreIntro: {
    flex: 1,
    gap: 2,
  },
  qualityIntroTitle: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textPrimary,
  },
  qualityIntroDesc: {
    fontSize: 11,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    lineHeight: 14,
  },
  dimensionsContainer: {
    gap: Theme.spacing.md,
  },
  dimensionRow: {
    gap: 4,
  },
  dimensionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dimensionTitle: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
  },
  dimensionScore: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
  },
  barBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 2,
  },
  barForeground: {
    height: '100%',
    borderRadius: 3,
  },
  dimensionDesc: {
    fontSize: 11,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    lineHeight: 14,
  },
  whyMattersBox: {
    backgroundColor: 'rgba(212, 163, 89, 0.04)',
    borderLeftWidth: 2,
    borderLeftColor: Theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  whyMattersLabel: {
    fontSize: 10,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  whyMattersText: {
    fontSize: 11,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    lineHeight: 14,
  },
  verificationListCard: {
    backgroundColor: '#151518',
    borderRadius: 12,
    padding: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: Theme.spacing.xs,
  },
  badgeItem: {
    padding: Theme.spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  badgeItemInactive: {
    opacity: 0.6,
  },
  badgeLeft: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  badgeIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  badgeIconBgActive: {
    backgroundColor: Theme.colors.primary,
  },
  badgeIconBgInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeInfo: {
    flex: 1,
    gap: 2,
  },
  badgeLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.textSecondary,
  },
  badgeLabelActive: {
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  badgeDesc: {
    fontSize: 11,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    lineHeight: 14,
  },
  verifiedStamp: {
    backgroundColor: 'rgba(76, 217, 100, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedStampText: {
    color: '#4CD964',
    fontSize: 8,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
  },
  verifiedDate: {
    fontSize: 10,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.primary,
    marginTop: 2,
  },
  marketCard: {
    backgroundColor: '#151518',
    borderRadius: 12,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Theme.spacing.md,
  },
  marketCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    flexWrap: 'wrap',
  },
  marketTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  marketTagGood: {
    backgroundColor: 'rgba(76, 217, 100, 0.15)',
  },
  marketTagBad: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  marketTagFair: {
    backgroundColor: 'rgba(212, 163, 89, 0.15)',
  },
  marketTagText: {
    fontSize: 10,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
  },
  marketTagTextGood: {
    color: '#4CD964',
  },
  marketTagTextBad: {
    color: '#FF3B30',
  },
  marketTagTextFair: {
    color: Theme.colors.primary,
  },
  marketDescText: {
    flex: 1,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
  },
  marketStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  statVal: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textPrimary,
  },
  statBoxDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  priceHistoryCard: {
    backgroundColor: '#151518',
    borderRadius: 12,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  priceHistorySubtitle: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
  },
  priceHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  priceDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.primary,
  },
  priceDate: {
    fontSize: 11,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
  },
  priceRowValue: {
    alignItems: 'flex-end',
    gap: 2,
  },
  priceValText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textPrimary,
  },
  priceChangeTag: {
    fontSize: 9,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  timelineCard: {
    backgroundColor: '#151518',
    borderRadius: 12,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  timelineRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  timelineConnectorCol: {
    alignItems: 'center',
    width: 12,
  },
  timelineDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.primary,
    zIndex: 2,
    marginTop: 4,
  },
  timelineBar: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 4,
  },
  timelineInfoCol: {
    flex: 1,
    paddingBottom: Theme.spacing.md,
    gap: 2,
  },
  timelineEventTitle: {
    fontSize: 11,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
    letterSpacing: 0.5,
  },
  timelineEventDesc: {
    fontSize: 12,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textPrimary,
    lineHeight: 15,
  },
  timelineEventDate: {
    fontSize: 10,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  metadataCard: {
    backgroundColor: '#151518',
    borderRadius: 12,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  metaLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.textSecondary,
  },
  metaValueCol: {
    alignItems: 'flex-end',
    gap: Theme.spacing.xs,
  },
  metaValueText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textPrimary,
  },
  confidenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceBadgeVerified: {
    backgroundColor: 'rgba(76, 217, 100, 0.15)',
  },
  confidenceBadgeEstimated: {
    backgroundColor: 'rgba(212, 163, 89, 0.15)',
  },
  confidenceBadgeText: {
    fontSize: 8,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
  },
  confidenceBadgeTextVerified: {
    color: '#4CD964',
  },
  confidenceBadgeTextEstimated: {
    color: Theme.colors.primary,
  },
  ownerVerifBadge: {
    backgroundColor: 'rgba(212, 163, 89, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownerVerifBadgeText: {
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
    textTransform: 'uppercase',
  },
  ownerMetaText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  reportListingCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.15)',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  reportListingText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: '#FF3B30',
  },
});
