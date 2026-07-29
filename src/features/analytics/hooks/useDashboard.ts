import { useState, useEffect, useCallback } from 'react';
import { useProfile } from '../../../hooks/useProfile';
import { aggregationService } from '../services/aggregationService';
import { achievementService } from '../services/achievementService';
import { OwnerStatistics, ListingStatistics, OwnerAchievement, ListingDailyMetric } from '../../../types';

export function useDashboard() {
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ownerStats, setOwnerStats] = useState<OwnerStatistics | null>(null);
  const [achievements, setAchievements] = useState<OwnerAchievement[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      const stats = await aggregationService.getOwnerStatistics(profile.id);
      const badges = await achievementService.getAchievements(profile.id);
      
      setOwnerStats(stats);
      setAchievements(badges);
    } catch (e) {
      console.warn('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return {
    loading,
    refreshing,
    ownerStats,
    achievements,
    onRefresh,
    refetch: fetchDashboardData
  };
}

export function useListingAnalytics(propertyId: string) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ListingStatistics | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<ListingDailyMetric[]>([]);
  const [funnel, setFunnel] = useState<any>(null);

  const fetchListingData = useCallback(async () => {
    if (!propertyId) return;
    
    try {
      const s = await aggregationService.getListingStatistics(propertyId);
      const dm = await aggregationService.getListingDailyMetrics(propertyId, 30);
      const f = await aggregationService.getFunnelMetrics(propertyId);
      
      setStats(s);
      setDailyMetrics(dm);
      setFunnel(f);
    } catch (e) {
      console.warn('Failed to load listing analytics:', e);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchListingData();
  }, [fetchListingData]);

  return {
    loading,
    stats,
    dailyMetrics,
    funnel,
    refetch: fetchListingData
  };
}
