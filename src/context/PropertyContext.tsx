import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropertyListing } from '../types';
import { SearchFilters } from '../components/SearchOverlay';
import { propertyService } from '../services/propertyService';
import { discoveryService } from '../services/discoveryService';
import { propertyUploadService, VideoAsset } from '../services/propertyUploadService';
import { bookmarkService } from '../services/bookmarkService';
import { historyService } from '../services/historyService';
import { useAuth } from '../hooks/useAuth';

interface PropertyContextType {
  properties: PropertyListing[];
  filteredProperties: PropertyListing[];
  savedPropertyIds: Set<string>;
  savedProperties: PropertyListing[];
  filters: SearchFilters;
  toggleSave: (id: string) => void;
  publishListing: (
    listing: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUri?: string,
    videoAssetInfo?: VideoAsset
  ) => Promise<void>;
  updateListing: (
    id: string,
    updates: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUri?: string,
    videoAssetInfo?: VideoAsset
  ) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  archiveListing: (id: string) => Promise<void>;
  restoreListing: (id: string) => Promise<void>;
  incrementViewCount: (id: string) => Promise<void>;
  incrementContactCount: (id: string) => Promise<void>;
  setFilters: (filters: SearchFilters) => void;
  loading: boolean;
  refreshing: boolean;
  fetchFeed: () => Promise<void>;
  loadMoreFeed: () => Promise<void>;
  imageUploadProgress: number;
  videoUploadProgress: number;
  publishing: boolean;
  publishingStage: string;
}

export const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isGuest } = useAuth();
  
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());
  const [savedProperties, setSavedProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [publishingStage, setPublishingStage] = useState('');
  
  const [filters, setFiltersState] = useState<SearchFilters>({
    city: 'Mumbai',
    bhk: null,
    furnishing: null,
    petFriendly: false,
    listingType: 'rent',
  });

  // Load initial filters on mount
  useEffect(() => {
    const loadPersistedConfig = async () => {
      try {
        const storedFilters = await AsyncStorage.getItem('@filters');
        if (storedFilters) {
          setFiltersState(JSON.parse(storedFilters));
        }
      } catch (e) {
        console.error('Failed to load persisted property keys', e);
      }
    };

    loadPersistedConfig();
  }, []);

  // Fetch bookmarks automatically on user auth change
  useEffect(() => {
    if (user && !isGuest) {
      const loadBookmarks = async () => {
        try {
          const bookmarked = await bookmarkService.getSavedProperties(user.id);
          setSavedProperties(bookmarked);
          setSavedPropertyIds(new Set(bookmarked.map((b) => b.id)));
        } catch (e) {
          console.error('Error fetching live saved homes:', e);
        }
      };
      loadBookmarks();
    } else {
      setSavedProperties([]);
      setSavedPropertyIds(new Set());
    }
  }, [user, isGuest]);

  const fetchFeed = useCallback(async () => {
    setRefreshing(true);
    try {
      const items = await discoveryService.getRankedFeed(user?.id, undefined, 10, filters);
      setProperties(items);
      setHasMore(items.length === 10);
    } catch (e) {
      console.error('Failed to load feed listings from Supabase:', e);
      setProperties([]);
      setHasMore(false);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [filters, user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const loadMoreFeed = async () => {
    if (!hasMore || refreshing) return;

    const lastItem = properties[properties.length - 1];
    const cursor = lastItem ? lastItem.createdAt : undefined;

    try {
      const items = await discoveryService.getRankedFeed(user?.id, cursor, 10, filters);
      if (items.length > 0) {
        setProperties((prev) => [...prev, ...items]);
        setHasMore(items.length === 10);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Error loading pagination details:', e);
    }
  };

  const toggleSave = async (id: string) => {
    if (isGuest || !user) {
      return;
    }

    const wasSaved = savedPropertyIds.has(id);
    const previousIds = new Set(savedPropertyIds);
    const previousProperties = [...savedProperties];

    setSavedPropertyIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) {
        next.delete(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        next.add(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return next;
    });

    setSavedProperties((prev) => {
      if (wasSaved) {
        return prev.filter((p) => p.id !== id);
      } else {
        const found = properties.find((p) => p.id === id);
        if (found) return [...prev, found];
        return prev;
      }
    });

    try {
      if (wasSaved) {
        await bookmarkService.removeSavedProperty(user.id, id);
      } else {
        await bookmarkService.saveProperty(user.id, id);
      }
      
      // Update local listing save count
      setProperties((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, saveCount: Math.max(0, (item.saveCount || 0) + (wasSaved ? -1 : 1)) }
            : item
        )
      );
    } catch (e) {
      console.error('Failed to sync bookmark mutation with Supabase:', e);
      setSavedPropertyIds(previousIds);
      setSavedProperties(previousProperties);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update saved home. Please check your connection.');
    }
  };

  // Atomic property publishing with complete transaction rollback
  const publishListing = async (
    newListing: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUri?: string,
    videoAssetInfo?: VideoAsset
  ) => {
    setPublishing(true);
    setPublishingStage('Publishing Listing');
    setImageUploadProgress(0);
    setVideoUploadProgress(0);

    let propertyId = '';
    const uploadedPaths: { bucket: string; path: string }[] = [];

    try {
      if (videoUri && videoAssetInfo) {
        setPublishingStage('Validating Video');
        propertyUploadService.validateVideo({ ...videoAssetInfo, uri: videoUri });
      }

      setPublishingStage('Publishing Listing');
      propertyId = await propertyService.createListingPlaceholder(newListing);

      setPublishingStage('Compressing Images');
      const optimizedImages = await propertyUploadService.compressImages(imageUrls);

      setPublishingStage('Uploading Images');
      const uploadedImages = await propertyUploadService.uploadImages(
        propertyId,
        optimizedImages,
        (progress) => {
          setImageUploadProgress(progress);
        }
      );
      uploadedPaths.push(...uploadedImages.map(img => ({ bucket: img.bucket, path: img.path })));
      const finalImageUrls = uploadedImages.map(img => img.publicUrl);

      let uploadedVideoUrl = '';
      let generatedThumbnail = '';

      if (videoUri) {
        setPublishingStage('Generating Thumbnail');
        const thumbFile = await propertyUploadService.uploadThumbnail(propertyId, videoUri);
        uploadedPaths.push({ bucket: thumbFile.bucket, path: thumbFile.path });
        generatedThumbnail = thumbFile.publicUrl;

        setPublishingStage('Uploading Video');
        const videoFile = await propertyUploadService.uploadVideo(
          propertyId,
          videoUri,
          (progress) => {
            setVideoUploadProgress(progress);
          }
        );
        uploadedPaths.push({ bucket: videoFile.bucket, path: videoFile.path });
        uploadedVideoUrl = videoFile.publicUrl;
      }

      setPublishingStage('Finalizing');
      const finalThumb = generatedThumbnail || finalImageUrls[0] || newListing.thumbnailUrl;
      await propertyService.updateListingUrls(
        propertyId,
        finalImageUrls,
        uploadedVideoUrl,
        finalThumb
      );

      const newProperty: PropertyListing = {
        id: propertyId,
        ownerId: newListing.ownerId,
        title: newListing.title,
        description: newListing.description,
        price: Number(newListing.price),
        listingType: newListing.listingType,
        city: newListing.city,
        address: newListing.address,
        bedrooms: newListing.bedrooms,
        bathrooms: newListing.bathrooms,
        furnishing: newListing.furnishing,
        thumbnailUrl: finalThumb,
        videoUrl: uploadedVideoUrl,
        createdAt: new Date().toISOString(),
        imageUrls: finalImageUrls,
        amenities: newListing.amenities || [],
        viewCount: 0,
        saveCount: 0,
        contactCount: 0,
      };

      setProperties((prev) => [newProperty, ...prev]);
      
      await fetchFeed();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPublishingStage('Success');
    } catch (e) {
      console.error('Publishing pipeline transaction failed, starting rollback:', e);
      setPublishingStage('Failure');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (propertyId) {
        try {
          await propertyService.deleteListingHard(propertyId);
        } catch (dbErr) {
          console.warn('Rollback hard-delete database record failed:', dbErr);
        }
      }

      if (uploadedPaths.length > 0) {
        try {
          await propertyUploadService.cleanupUploads(uploadedPaths);
        } catch (storageErr) {
          console.warn('Rollback delete storage files failed:', storageErr);
        }
      }

      throw e;
    } finally {
      setPublishing(false);
    }
  };

  // Sync edits using centralized propertyUploadService.syncMedia helper
  const updateListing = async (
    id: string,
    updates: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUri?: string,
    videoAssetInfo?: VideoAsset
  ) => {
    setPublishing(true);
    setPublishingStage('Saving Changes');
    setImageUploadProgress(0);
    setVideoUploadProgress(0);

    try {
      if (videoUri && videoAssetInfo && (videoUri.startsWith('file://') || videoUri.startsWith('content://'))) {
        setPublishingStage('Validating Video');
        propertyUploadService.validateVideo({ ...videoAssetInfo, uri: videoUri });
      }

      const previousProperty = properties.find(p => p.id === id);
      const currentImages = previousProperty?.imageUrls || [];
      const currentVideo = previousProperty?.videoUrl || '';

      setPublishingStage('Synchronizing Media');
      const mediaResult = await propertyUploadService.syncMedia(
        id,
        currentImages,
        imageUrls,
        currentVideo,
        videoUri || undefined,
        (progress) => {
          setImageUploadProgress(progress);
        }
      );

      setPublishingStage('Finalizing');
      const finalThumb = mediaResult.thumbnailUrl || mediaResult.imageUrls[0] || updates.thumbnailUrl;
      
      const updatedProperty = await propertyService.updateListing(
        id,
        {
          ...updates,
          thumbnailUrl: finalThumb,
        },
        mediaResult.imageUrls,
        mediaResult.videoUrl,
        finalThumb
      );

      setProperties((prev) => prev.map((item) => (item.id === id ? updatedProperty : item)));
      
      await fetchFeed();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPublishingStage('Success');
    } catch (e) {
      console.error('Update transaction failed:', e);
      setPublishingStage('Failure');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw e;
    } finally {
      setPublishing(false);
    }
  };

  // Deletion sequence: Retrieve URLs -> Delete Storage media -> Delete Database record -> Invalidate & refresh
  const deleteListing = async (id: string) => {
    try {
      // 1. Retrieve all media metadata from state/database
      const previousProperty = properties.find(p => p.id === id);
      const imageUrls = previousProperty?.imageUrls || [];
      const videoUrl = previousProperty?.videoUrl || '';
      const thumbnailUrl = previousProperty?.thumbnailUrl || '';

      // 2. Delete Storage objects first (encapsulated in propertyUploadService)
      await propertyUploadService.deletePropertyMedia(imageUrls, videoUrl, thumbnailUrl);

      // 3. Delete Database record
      await propertyService.deleteListingHard(id);

      // 4. Refresh application state
      setProperties((prev) => prev.filter((item) => item.id !== id));
      await fetchFeed();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      console.error('Failed to delete property listing:', e);
      throw e;
    }
  };

  const archiveListing = async (id: string) => {
    try {
      await propertyService.archiveListing(id);
      setProperties((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'archived' } : item))
      );
      await fetchFeed();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      console.error('Failed to archive listing:', e);
      throw e;
    }
  };

  const restoreListing = async (id: string) => {
    try {
      await propertyService.restoreListing(id);
      setProperties((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'published' } : item))
      );
      await fetchFeed();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('Failed to restore listing:', e);
      throw e;
    }
  };

  const incrementViewCount = async (id: string) => {
    if (id.startsWith('prop-')) {
      setProperties((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, viewCount: (item.viewCount || 0) + 1 } : item
        )
      );
      return;
    }
    
    await propertyService.incrementViewCount(id);

    if (user && !isGuest) {
      try {
        await historyService.recordView(user.id, id);
      } catch (e) {
        console.warn('History tracking error:', e);
      }
    }

    setProperties((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, viewCount: (item.viewCount || 0) + 1 } : item
      )
    );
  };


  const incrementContactCount = async (id: string) => {
    if (id.startsWith('prop-')) return;
    try {
      await propertyService.incrementContactCount(id);
      setProperties((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, contactCount: (item.contactCount || 0) + 1 } : item
        )
      );
    } catch (e) {
      console.warn('Failed to increment contact count:', e);
    }
  };

  const setFilters = async (newFilters: SearchFilters) => {
    setFiltersState(newFilters);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await AsyncStorage.setItem('@filters', JSON.stringify(newFilters));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PropertyContext.Provider
      value={{
        properties,
        filteredProperties: properties,
        savedPropertyIds,
        savedProperties,
        filters,
        toggleSave,
        publishListing,
        updateListing,
        deleteListing,
        archiveListing,
        restoreListing,
        incrementViewCount,
        incrementContactCount,
        setFilters,
        loading,
        refreshing,
        fetchFeed,
        loadMoreFeed,
        imageUploadProgress,
        videoUploadProgress,
        publishing,
        publishingStage,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};
