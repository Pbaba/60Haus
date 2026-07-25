import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { hapticsService } from '../services/hapticsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropertyListing, DiscoveryMode, Collection } from '../types';
import { SearchFilters } from '../features/discovery/components/FilterSheet';
import { propertyService } from '../services/propertyService';
import { discoveryService } from '../services/discoveryService';
import { propertyUploadService, VideoAsset } from '../services/propertyUploadService';
import { PipelineProgress } from '../media/MediaTypes';
import { PipelineEventBus } from '../media/PipelineEventBus';
import { UploadManager } from '../media/UploadManager';
import { bookmarkService } from '../services/bookmarkService';
import { historyService } from '../services/historyService';
import { collectionService } from '../services/collectionService';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useFeedback } from './FeedbackContext';

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
  ) => Promise<string>;
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
  publishingProgress: PipelineProgress | null;
  discoveryMode: DiscoveryMode;
  setDiscoveryMode: (mode: DiscoveryMode) => void;
  hasExactMatchesRemaining: boolean;
  flexibleLevel: number;
  setFlexibleLevel: React.Dispatch<React.SetStateAction<number>>;

  // Comparison
  compareQueue: string[];
  toggleCompare: (id: string) => void;
  clearCompareQueue: () => void;

  // Collections
  collections: Collection[];
  fetchCollections: () => Promise<void>;
  createCollection: (name: string, description?: string) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  addPropertyToCollection: (collectionId: string, propertyId: string, notes?: string) => Promise<void>;
  removePropertyFromCollection: (collectionId: string, propertyId: string) => Promise<void>;
  updatePropertyNote: (collectionId: string, propertyId: string, notes: string) => Promise<void>;
}

interface FeedCacheEntry {
  items: PropertyListing[];
  hasMore: boolean;
  timestamp: number;
}
let feedCache: Record<string, FeedCacheEntry> = {};

const getFeedCacheKey = (
  userId: string | undefined,
  filters: SearchFilters,
  mode: DiscoveryMode,
  level: number,
  localities: string[]
) => {
  return `${userId || 'guest'}_${JSON.stringify(filters)}_${mode}_${level}_${localities.join(',')}`;
};

export const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isGuest, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { showTransactionFeedback, showToast } = useFeedback();

  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());
  const [savedProperties, setSavedProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const savedPropertiesRef = useRef(savedProperties);
  const profileRef = useRef(profile);

  const [compareQueue, setCompareQueue] = useState<string[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  // Load initial compareQueue on mount
  useEffect(() => {
    const loadCompareQueue = async () => {
      try {
        const stored = await AsyncStorage.getItem('@compareQueue');
        if (stored) {
          setCompareQueue(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load compareQueue from AsyncStorage:', e);
      }
    };
    loadCompareQueue();
  }, []);

  const saveCompareQueue = async (queue: string[]) => {
    try {
      await AsyncStorage.setItem('@compareQueue', JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save compareQueue to AsyncStorage:', e);
    }
  };

  useEffect(() => {
    savedPropertiesRef.current = savedProperties;
  }, [savedProperties]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  const [hasExactMatchesRemaining, setHasExactMatchesRemaining] = useState(true);
  
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [publishingStage, setPublishingStage] = useState('');
  const [publishingProgress, setPublishingProgress] = useState<PipelineProgress | null>(null);
  
  const [discoveryMode, setDiscoveryModeState] = useState<DiscoveryMode>(DiscoveryMode.EXACT_MATCH);
  const [flexibleLevel, setFlexibleLevel] = useState(1);
  const [exploredLocalities, setExploredLocalities] = useState<string[]>([]);
  
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

  // Fetch bookmarks & collections automatically on user auth change
  useEffect(() => {
    if (user && !isGuest) {
      const loadBookmarksAndCollections = async () => {
        try {
          const bookmarked = await bookmarkService.getSavedProperties(user.id);
          setSavedProperties(bookmarked);
          setSavedPropertyIds(new Set(bookmarked.map((b) => b.id)));

          const cols = await collectionService.getCollections(user.id);
          setCollections(cols);
        } catch (e) {
          console.error('Error fetching live saved homes/collections:', e);
        }
      };
      loadBookmarksAndCollections();
    } else {
      setSavedProperties([]);
      setSavedPropertyIds(new Set());
      setCollections([]);
    }
  }, [user, isGuest]);

  const fetchFeed = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      feedCache = {};
    }
    setRefreshing(true);
    const startTime = Date.now();
    const cacheKey = getFeedCacheKey(user?.id, filters, discoveryMode, flexibleLevel, exploredLocalities);
    const cached = feedCache[cacheKey];

    if (!isPullToRefresh && cached && Date.now() - cached.timestamp < 3 * 60 * 1000) {
      setProperties(cached.items);
      setHasExactMatchesRemaining(cached.hasMore);
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 600 - elapsed);
      setTimeout(() => {
        setRefreshing(false);
        setLoading(false);
      }, delay);
      return;
    }

    try {
      const items = await discoveryService.getRankedFeed(
        user?.id,
        undefined,
        10,
        filters,
        discoveryMode,
        flexibleLevel,
        exploredLocalities,
        {
          profile: profileRef.current,
          savedProperties: savedPropertiesRef.current,
        }
      );
      setProperties(items);
      const hasMore = items.length === 10;
      setHasExactMatchesRemaining(hasMore);

      feedCache[cacheKey] = {
        items,
        hasMore,
        timestamp: Date.now(),
      };
    } catch (e) {
      console.error('Failed to load feed listings from Supabase:', e);
      setProperties([]);
      setHasExactMatchesRemaining(false);
    } finally {
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 600 - elapsed);
      setTimeout(() => {
        setRefreshing(false);
        setLoading(false);
      }, delay);
    }
  }, [filters, user, discoveryMode, flexibleLevel, exploredLocalities]);

  useEffect(() => {
    if (authLoading) return;
    fetchFeed();
  }, [fetchFeed, authLoading]);

  const loadMoreFeed = useCallback(async () => {
    if (!hasExactMatchesRemaining || refreshing) return;

    const lastItem = properties[properties.length - 1];
    const cursor = lastItem ? lastItem.createdAt : undefined;

    try {
      const items = await discoveryService.getRankedFeed(
        user?.id,
        cursor,
        10,
        filters,
        discoveryMode,
        flexibleLevel,
        exploredLocalities,
        {
          profile: profileRef.current,
          savedProperties: savedPropertiesRef.current,
        }
      );
      if (items.length > 0) {
        setProperties((prev) => [...prev, ...items]);
        setHasExactMatchesRemaining(items.length === 10);
      } else {
        setHasExactMatchesRemaining(false);
      }
    } catch (e) {
      console.error('Error loading pagination details:', e);
    }
  }, [hasExactMatchesRemaining, refreshing, properties, user, filters, discoveryMode, flexibleLevel, exploredLocalities]);

  const toggleSave = useCallback(async (id: string) => {
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
        hapticsService.warning();
      } else {
        next.add(id);
        hapticsService.success();
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
      hapticsService.error();
      showToast('Failed to update saved home. Please check your connection.', 'error');
    }
  }, [isGuest, user, savedPropertyIds, savedProperties, properties, showToast]);

  // Atomic property publishing with complete transaction rollback
  const publishListing = useCallback(async (
    newListing: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUri?: string,
    videoAssetInfo?: VideoAsset
  ) => {
    setPublishing(true);
    setPublishingProgress({ stage: 'idle', progress: 0, completedStages: [] });
    setImageUploadProgress(0);
    setVideoUploadProgress(0);

    const unsubscribe = PipelineEventBus.subscribe((event, overallProgress) => {
      setPublishingStage(event.details || event.stage);
      setPublishingProgress(overallProgress);
    });

    try {
      const uploadManager = new UploadManager();
      const propertyId = await uploadManager.publishListing(
        newListing,
        imageUrls,
        videoUri || null,
        videoAssetInfo?.duration || undefined
      );

      feedCache = {};
      setProperties([]);
      await fetchFeed();
      
      hapticsService.success();
      setPublishingProgress(prev => prev ? { ...prev, stage: 'completed', progress: 100 } : null);
      showTransactionFeedback('success', 'Listing Published', 'Your property listing has been successfully uploaded and published.');
      
      return propertyId;
    } catch (e: any) {
      console.error('Publishing failed:', e);
      hapticsService.error();
      showTransactionFeedback('error', 'Publish Failed', e.message || 'Failed to upload media assets.');
      throw e;
    } finally {
      unsubscribe();
      setPublishing(false);
    }
  }, [fetchFeed, showTransactionFeedback]);

  // Sync edits using centralized propertyUploadService.syncMedia helper
  const updateListing = useCallback(async (
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
      const uploadManager = new UploadManager();
      await uploadManager.updateListing(
        id,
        updates,
        imageUrls,
        videoUri || undefined,
        videoAssetInfo
      );

      feedCache = {};
      await fetchFeed();
      hapticsService.success();
      setPublishingStage('Success');
      showTransactionFeedback('success', 'Listing Updated', 'Your listing has been successfully updated.');
    } catch (e: any) {
      console.error('Update transaction failed:', e);
      setPublishingStage('Failure');
      hapticsService.error();
      showTransactionFeedback('error', 'Update Failed', e.message || 'Failed to update listing.');
      throw e;
    } finally {
      setPublishing(false);
    }
  }, [fetchFeed, showTransactionFeedback]);

  // Deletion sequence: Retrieve URLs -> Delete Storage media -> Delete Database record -> Invalidate & refresh
  const deleteListing = useCallback(async (id: string) => {
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
      feedCache = {};
      setProperties((prev) => prev.filter((item) => item.id !== id));
      await fetchFeed();
      hapticsService.warning();
      showTransactionFeedback('success', 'Listing Deleted', 'The property listing has been permanently deleted from the marketplace and storage.');
    } catch (e) {
      console.error('Failed to delete property listing:', e);
      showTransactionFeedback('error', 'Delete Failed', 'Failed to delete the listing from the server. Please try again.');
      throw e;
    }
  }, [properties, fetchFeed, showTransactionFeedback]);

  const archiveListing = useCallback(async (id: string) => {
    try {
      await propertyService.archiveListing(id);
      feedCache = {};
      setProperties((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'archived' } : item))
      );
      await fetchFeed();
      hapticsService.warning();
      showTransactionFeedback('warning', 'Listing Archived', 'The listing has been archived and removed from the active search recommendations.');
    } catch (e) {
      console.error('Failed to archive listing:', e);
      throw e;
    }
  }, [fetchFeed, showTransactionFeedback]);

  const restoreListing = useCallback(async (id: string) => {
    try {
      await propertyService.restoreListing(id);
      feedCache = {};
      setProperties((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'published' } : item))
      );
      await fetchFeed();
      hapticsService.success();
      showTransactionFeedback('success', 'Listing Restored', 'The listing has been restored and is now active on the marketplace search feed.');
    } catch (e) {
      console.error('Failed to restore listing:', e);
      throw e;
    }
  }, [fetchFeed, showTransactionFeedback]);

  const incrementViewCount = useCallback(async (id: string) => {
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

    // Track explored locality during current session
    const viewedProperty = properties.find((p) => p.id === id);
    if (viewedProperty && viewedProperty.locality) {
      const normLoc = viewedProperty.locality.toLowerCase().trim();
      setExploredLocalities((prev) => {
        if (!prev.includes(normLoc)) {
          return [...prev, normLoc];
        }
        return prev;
      });
    }
  }, [user, isGuest, properties]);


  const incrementContactCount = useCallback(async (id: string) => {
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
  }, []);

  const setFilters = useCallback(async (newFilters: SearchFilters) => {
    setFiltersState(newFilters);
    setDiscoveryModeState(DiscoveryMode.EXACT_MATCH);
    setFlexibleLevel(1);
    setExploredLocalities([]);
    hapticsService.light();
    try {
      await AsyncStorage.setItem('@filters', JSON.stringify(newFilters));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const setDiscoveryMode = useCallback((mode: DiscoveryMode) => {
    setDiscoveryModeState(mode);
    if (mode === DiscoveryMode.EXACT_MATCH) {
      setFlexibleLevel(1);
      setExploredLocalities([]);
    }
  }, []);

  // Comparison Handlers
  const toggleCompare = useCallback(async (id: string) => {
    setCompareQueue((prev) => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter((item) => item !== id);
      } else {
        if (prev.length >= 4) {
          showToast('You can compare up to 4 properties simultaneously.');
          return prev;
        }
        next = [...prev, id];
      }
      saveCompareQueue(next);
      return next;
    });
  }, [showToast]);

  const clearCompareQueue = useCallback(async () => {
    setCompareQueue([]);
    saveCompareQueue([]);
  }, []);

  // Collections Handlers
  const fetchCollections = useCallback(async () => {
    if (isGuest || !user) return;
    try {
      const cols = await collectionService.getCollections(user.id);
      setCollections(cols);
    } catch (e) {
      console.warn('Failed to fetch collections:', e);
    }
  }, [isGuest, user]);

  const createCollection = useCallback(async (name: string, description?: string) => {
    if (isGuest || !user) throw new Error('Authentication required');
    const newCol = await collectionService.createCollection(user.id, name, description);
    fetchCollections();
    return newCol;
  }, [isGuest, user, fetchCollections]);

  const deleteCollection = useCallback(async (id: string) => {
    await collectionService.deleteCollection(id);
    fetchCollections();
  }, [fetchCollections]);

  const addPropertyToCollection = useCallback(async (collectionId: string, propertyId: string, notes?: string) => {
    await collectionService.addPropertyToCollection(collectionId, propertyId, notes);
    fetchCollections();
    showToast('Saved to collection');
  }, [fetchCollections, showToast]);

  const removePropertyFromCollection = useCallback(async (collectionId: string, propertyId: string) => {
    await collectionService.removePropertyFromCollection(collectionId, propertyId);
    fetchCollections();
    showToast('Removed from collection');
  }, [fetchCollections, showToast]);

  const updatePropertyNote = useCallback(async (collectionId: string, propertyId: string, notes: string) => {
    await collectionService.updatePropertyNote(collectionId, propertyId, notes);
    fetchCollections();
  }, [fetchCollections]);

  const contextValue = useMemo(() => ({
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
    publishingProgress,
    discoveryMode,
    setDiscoveryMode,
    hasExactMatchesRemaining,
    flexibleLevel,
    setFlexibleLevel,
    compareQueue,
    toggleCompare,
    clearCompareQueue,
    collections,
    fetchCollections,
    createCollection,
    deleteCollection,
    addPropertyToCollection,
    removePropertyFromCollection,
    updatePropertyNote,
  }), [
    properties,
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
    publishingProgress,
    discoveryMode,
    setDiscoveryMode,
    hasExactMatchesRemaining,
    flexibleLevel,
    compareQueue,
    toggleCompare,
    clearCompareQueue,
    collections,
    fetchCollections,
    createCollection,
    deleteCollection,
    addPropertyToCollection,
    removePropertyFromCollection,
    updatePropertyNote,
  ]);

  return (
    <PropertyContext.Provider value={contextValue}>
      {children}
    </PropertyContext.Provider>
  );
};

