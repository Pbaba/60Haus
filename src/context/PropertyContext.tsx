import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropertyListing } from '../types';
import { SearchFilters } from '../components/SearchOverlay';
import { propertyService } from '../services/propertyService';
import { discoveryService } from '../services/discoveryService';
import { propertyUploadService, VideoAsset } from '../services/propertyUploadService';
import { mockProperties } from '../constants/mockProperties';

interface PropertyContextType {
  properties: PropertyListing[];
  filteredProperties: PropertyListing[];
  savedIds: string[];
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
  incrementViewCount: (id: string) => Promise<void>;
  setFilters: (filters: SearchFilters) => void;
  loading: boolean;
  refreshing: boolean;
  fetchFeed: () => Promise<void>;
  loadMoreFeed: () => Promise<void>;
  imageUploadProgress: number;
  videoUploadProgress: number;
}

export const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  
  const [filters, setFiltersState] = useState<SearchFilters>({
    city: 'Mumbai',
    bhk: null,
    furnishing: null,
    petFriendly: false,
    listingType: 'rent',
  });

  // Load saved IDs and initial filters on mount
  useEffect(() => {
    const loadPersistedConfig = async () => {
      try {
        const storedSavedIds = await AsyncStorage.getItem('@saved_ids');
        const storedFilters = await AsyncStorage.getItem('@filters');

        if (storedSavedIds) {
          setSavedIds(JSON.parse(storedSavedIds));
        }
        if (storedFilters) {
          setFiltersState(JSON.parse(storedFilters));
        }
      } catch (e) {
        console.error('Failed to load persisted property keys', e);
      }
    };

    loadPersistedConfig();
  }, []);

  const fetchFeed = useCallback(async () => {
    setRefreshing(true);
    try {
      let items = await discoveryService.getRankedFeed(undefined, 10, filters);
      
      // Fallback: If database returns 0 listings, query local mock listings
      if (items.length === 0) {
        items = mockProperties.filter((item) => {
          if (filters.city && item.city.toLowerCase() !== filters.city.toLowerCase()) {
            return false;
          }
          if (filters.listingType && item.listingType !== filters.listingType) {
            return false;
          }
          if (filters.bhk !== null && item.bedrooms !== filters.bhk) {
            return false;
          }
          if (filters.furnishing && item.furnishing !== filters.furnishing) {
            return false;
          }
          if (filters.minPrice !== undefined && item.price < filters.minPrice) {
            return false;
          }
          if (filters.maxPrice !== undefined && item.price > filters.maxPrice) {
            return false;
          }
          return true;
        });
      }
      
      setProperties(items);
      setHasMore(items.length === 10);
    } catch (e) {
      console.error('Failed to load feed listings from Supabase, loading mocks:', e);
      // Resilient fallback to local mocks matching active filters on error
      const items = mockProperties.filter((item) => {
        if (filters.city && item.city.toLowerCase() !== filters.city.toLowerCase()) {
          return false;
        }
        return true;
      });
      setProperties(items);
      setHasMore(false);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const loadMoreFeed = async () => {
    if (!hasMore || refreshing) return;
    
    // If current listings are mock listings, do not attempt paging
    if (properties.some((p) => p.id.startsWith('prop-'))) {
      setHasMore(false);
      return;
    }

    const lastItem = properties[properties.length - 1];
    const cursor = lastItem ? lastItem.createdAt : undefined;

    try {
      const items = await discoveryService.getRankedFeed(cursor, 10, filters);
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

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const isSaved = prev.includes(id);
      let updated: string[];
      if (isSaved) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        updated = prev.filter((savedId) => savedId !== id);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        updated = [...prev, id];
      }
      AsyncStorage.setItem('@saved_ids', JSON.stringify(updated)).catch((e) =>
        console.error(e)
      );
      return updated;
    });
  };

  const publishListing = async (
    newListing: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUri?: string,
    videoAssetInfo?: VideoAsset
  ) => {
    try {
      setImageUploadProgress(0);
      setVideoUploadProgress(0);

      if (videoUri && videoAssetInfo) {
        propertyUploadService.validateVideo({ ...videoAssetInfo, uri: videoUri });
      }

      let generatedThumbnail = '';
      if (videoUri) {
        const localThumbUri = await propertyUploadService.generateThumbnail(videoUri);
        generatedThumbnail = await propertyUploadService.uploadPhoto(
          localThumbUri,
          'property-thumbnails',
          newListing.ownerId
        );
      }

      const uploadedUrls: string[] = [];
      if (imageUrls.length > 0) {
        setImageUploadProgress(10);
        for (let i = 0; i < imageUrls.length; i++) {
          const localUri = imageUrls[i];
          if (localUri.startsWith('file://') || localUri.startsWith('content://')) {
            const publicUrl = await propertyUploadService.uploadPhoto(
              localUri,
              'property-images',
              newListing.ownerId,
              (progress) => {
                const stepProgress = Math.floor(((i + progress / 100) / imageUrls.length) * 90);
                setImageUploadProgress(10 + stepProgress);
              }
            );
            uploadedUrls.push(publicUrl);
          } else {
            uploadedUrls.push(localUri);
          }
        }
        setImageUploadProgress(100);
      }

      let uploadedVideoUrl = '';
      if (videoUri) {
        setVideoUploadProgress(10);
        uploadedVideoUrl = await propertyUploadService.uploadVideo(
          videoUri,
          newListing.ownerId,
          (progress) => {
            setVideoUploadProgress(progress);
          }
        );
        setVideoUploadProgress(100);
      }

      const finalThumb = generatedThumbnail || uploadedUrls[0] || newListing.thumbnailUrl;
      const createdProperty = await propertyService.createListing(
        {
          ...newListing,
          thumbnailUrl: finalThumb,
        },
        uploadedUrls,
        uploadedVideoUrl,
        generatedThumbnail
      );

      setProperties((prev) => [createdProperty, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('Error creating property listing in Supabase:', e);
      setImageUploadProgress(0);
      setVideoUploadProgress(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw e;
    }
  };

  const updateListing = async (
    id: string,
    updates: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUri?: string,
    videoAssetInfo?: VideoAsset
  ) => {
    try {
      setImageUploadProgress(0);
      setVideoUploadProgress(0);

      if (videoUri && videoAssetInfo) {
        propertyUploadService.validateVideo({ ...videoAssetInfo, uri: videoUri });
      }

      let generatedThumbnail = '';
      if (videoUri && (videoUri.startsWith('file://') || videoUri.startsWith('content://'))) {
        const localThumbUri = await propertyUploadService.generateThumbnail(videoUri);
        generatedThumbnail = await propertyUploadService.uploadPhoto(
          localThumbUri,
          'property-thumbnails',
          updates.ownerId
        );
      }

      const uploadedUrls: string[] = [];
      if (imageUrls.length > 0) {
        setImageUploadProgress(10);
        for (let i = 0; i < imageUrls.length; i++) {
          const localUri = imageUrls[i];
          if (localUri.startsWith('file://') || localUri.startsWith('content://')) {
            const publicUrl = await propertyUploadService.uploadPhoto(
              localUri,
              'property-images',
              updates.ownerId,
              (progress) => {
                const stepProgress = Math.floor(((i + progress / 100) / imageUrls.length) * 90);
                setImageUploadProgress(10 + stepProgress);
              }
            );
            uploadedUrls.push(publicUrl);
          } else {
            uploadedUrls.push(localUri);
          }
        }
        setImageUploadProgress(100);
      }

      let uploadedVideoUrl = videoUri || '';
      if (videoUri && (videoUri.startsWith('file://') || videoUri.startsWith('content://'))) {
        setVideoUploadProgress(10);
        uploadedVideoUrl = await propertyUploadService.uploadVideo(
          videoUri,
          updates.ownerId,
          (progress) => {
            setVideoUploadProgress(progress);
          }
        );
        setVideoUploadProgress(100);
      }

      const finalThumb = generatedThumbnail || uploadedUrls[0] || updates.thumbnailUrl;
      const updatedProperty = await propertyService.updateListing(
        id,
        {
          ...updates,
          thumbnailUrl: finalThumb,
        },
        uploadedUrls,
        uploadedVideoUrl,
        generatedThumbnail
      );

      setProperties((prev) => prev.map((item) => (item.id === id ? updatedProperty : item)));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('Failed to update listing in context:', e);
      setImageUploadProgress(0);
      setVideoUploadProgress(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw e;
    }
  };

  const deleteListing = async (id: string) => {
    try {
      await propertyService.deleteListing(id);
      setProperties((prev) => prev.filter((item) => item.id !== id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      console.error('Failed to delete property listing:', e);
      throw e;
    }
  };

  const incrementViewCount = async (id: string) => {
    // If it's a local mock listing, don't execute Supabase DB updates
    if (id.startsWith('prop-')) {
      setProperties((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, viewCount: (item.viewCount || 0) + 1 } : item
        )
      );
      return;
    }
    await propertyService.incrementViewCount(id);
    setProperties((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, viewCount: (item.viewCount || 0) + 1 } : item
      )
    );
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
        savedIds,
        filters,
        toggleSave,
        publishListing,
        updateListing,
        deleteListing,
        incrementViewCount,
        setFilters,
        loading,
        refreshing,
        fetchFeed,
        loadMoreFeed,
        imageUploadProgress,
        videoUploadProgress,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};
