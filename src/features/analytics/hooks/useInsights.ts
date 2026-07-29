import { useMemo } from 'react';
import { insightEngine, InsightSuggestion } from '../services/insightEngine';
import { ListingStatistics } from '../../../types';

export function useInsights(stats: ListingStatistics | null) {
  const suggestions = useMemo<InsightSuggestion[]>(() => {
    return insightEngine.analyzeListing(stats);
  }, [stats]);

  return {
    suggestions
  };
}
