import { useState, useCallback } from 'react';
import { historyService } from '../services/historyService';

export const useSearch = (userId?: string) => {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    setIsSearching(true);
    setQuery(searchQuery);
    
    if (searchQuery.trim() && userId) {
      try {
        await historyService.recordSearch(userId, searchQuery);
      } catch (e) {
        console.warn('Failed to record search history', e);
      }
    }
    
    setIsSearching(false);
  }, [userId]);

  const loadRecentSearches = useCallback(async () => {
    if (!userId) return;
    try {
      const history = await historyService.getSearchHistory(userId);
      setRecentSearches(history.map(h => h.query));
    } catch (e) {
      console.warn('Failed to load search history', e);
    }
  }, [userId]);

  const clearRecentSearches = useCallback(async () => {
    if (!userId) return;
    try {
      await historyService.clearSearchHistory(userId);
      setRecentSearches([]);
    } catch (e) {
      console.warn('Failed to clear search history', e);
    }
  }, [userId]);

  return {
    query,
    setQuery,
    isSearching,
    recentSearches,
    performSearch,
    loadRecentSearches,
    clearRecentSearches,
  };
};
