import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Share, Linking, Alert, Modal, TextInput } from 'react-native';
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
import { profileService } from '../../services/profileService';
import { discoveryService } from '../../services/discoveryService';
import { historyService } from '../../services/historyService';
import { supabase } from '../../lib/supabase';
import { Theme } from '../../theme';
import { formatCurrency } from '../../utils';
import { ArrowLeft, MapPin, Heart, Share2, Phone, GitCompare } from 'lucide-react-native';
import { PropertyListing, UserProfile } from '../../types';
import { analyticsService } from '../../services/analyticsService';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
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

  const [property, setProperty] = useState<PropertyListing | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);
  const [related, setRelated] = useState<PropertyListing[]>([]);
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
        const recommendations = await discoveryService.getRecommendations(mappedProperty);
        setRelated(recommendations);
      } catch (recErr) {
        console.warn('Failed to load related listings:', recErr);
      }

      // 4. Log property history view record
      if (user && !isGuest) {
        await historyService.recordView(user.id, prop.id);
      }

    } catch (err) {
      console.error('Error fetching live listing details:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, user, isGuest]);

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

  const handleContact = () => {
    if (!ownerProfile?.phoneNumber) {
      Alert.alert('Contact Details', 'No contact phone number provided by the homeowner.');
      return;
    }

    if (id) {
      incrementContactCount(id);
    }

    Alert.alert(
      'Contact Owner',
      `Reach out to ${ownerProfile.fullName || 'Homeowner'}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Phone',
          onPress: () => Linking.openURL(`tel:${ownerProfile.phoneNumber}`),
        },
        {
          text: 'Send WhatsApp',
          onPress: () => {
            const formatted = ownerProfile.phoneNumber!.replace(/[^0-9]/g, '');
            Linking.openURL(`https://wa.me/${formatted}`);
          },
        },
      ]
    );
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
                <Text style={styles.ownerName}>{ownerProfile?.fullName || 'Verified Owner'}</Text>
                <Text style={styles.ownerTitle}>Property Owner / Landlord</Text>
                {ownerProfile?.bio ? <Text style={styles.ownerBio} numberOfLines={2}>{ownerProfile.bio}</Text> : null}
              </View>
            </View>
          </View>

          {/* Related Listings */}
          {related.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Related Listings</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
                {related.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.relatedCard}
                    onPress={() => router.push(`/property/${item.id}` as any)}
                  >
                    <Image
                      source={{ uri: item.thumbnailUrl }}
                      style={styles.relatedThumb}
                      contentFit="cover"
                    />
                    <View style={styles.relatedInfo}>
                      <Text style={styles.relatedPrice}>{formatCurrency(item.price)}</Text>
                      <Text style={styles.relatedTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.relatedCity}>{item.city}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

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
});
