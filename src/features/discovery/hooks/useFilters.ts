import { useContext, useCallback } from 'react';
import { PropertyContext } from '../../../context/PropertyContext';
import { SearchFilters } from '../components/FilterSheet';
import { savedSearchService } from '../../../services/savedSearchService';

export const useFilters = (userId?: string) => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useFilters must be used within PropertyProvider');
  }

  const { filters, setFilters, fetchFeed } = context;

  const updateFilters = useCallback(async (newFilters: Partial<SearchFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    await fetchFeed(); // force refresh with new filters
  }, [filters, setFilters, fetchFeed]);

  const clearFilters = useCallback(async () => {
    // Reset to defaults
    const defaults: SearchFilters = {
      city: 'Mumbai',
      listingType: 'rent',
      bhk: null,
      furnishing: null,
      petFriendly: false,
    };
    setFilters(defaults);
    await fetchFeed();
  }, [setFilters, fetchFeed]);

  const saveCurrentFilters = useCallback(async (name: string) => {
    if (!userId) return;
    try {
      await savedSearchService.saveSearch(userId, filters, name);
    } catch (e) {
      console.warn('Failed to save search preset', e);
    }
  }, [userId, filters]);

  return {
    filters,
    updateFilters,
    clearFilters,
    saveCurrentFilters,
  };
};
