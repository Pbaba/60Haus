import { supabase } from '../../../lib/supabase';
import { OwnerStatistics, ListingStatistics, ListingDailyMetric } from '../../../types';

export const aggregationService = {
  async getOwnerStatistics(ownerId: string): Promise<OwnerStatistics | null> {
    const { data, error } = await supabase
      .from('owner_statistics')
      .select('*')
      .eq('owner_id', ownerId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
      console.warn('Failed to fetch owner statistics:', error);
      return null;
    }

    return data as unknown as OwnerStatistics;
  },

  async getListingStatistics(propertyId: string): Promise<ListingStatistics | null> {
    const { data, error } = await supabase
      .from('listing_statistics')
      .select('*')
      .eq('property_id', propertyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('Failed to fetch listing statistics:', error);
      return null;
    }

    return data as unknown as ListingStatistics;
  },

  async getListingDailyMetrics(propertyId: string, days = 30): Promise<ListingDailyMetric[]> {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const { data, error } = await supabase
      .from('listing_daily_metrics')
      .select('*')
      .eq('property_id', propertyId)
      .gte('date', dateLimit.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.warn('Failed to fetch daily metrics:', error);
      return [];
    }

    return data as unknown as ListingDailyMetric[];
  },

  async getFunnelMetrics(propertyId: string) {
    const stats = await this.getListingStatistics(propertyId);
    if (!stats) return null;

    const views = Math.max(stats.total_views, 1); // prevent div by zero
    return {
      views: stats.total_views,
      saves: stats.saves,
      messages: stats.messages_received,
      visits: stats.visit_requests,
      closed: stats.closed_leads,
      conversionRates: {
        savesToViews: (stats.saves / views) * 100,
        messagesToSaves: stats.saves > 0 ? (stats.messages_received / stats.saves) * 100 : 0,
        visitsToMessages: stats.messages_received > 0 ? (stats.visit_requests / stats.messages_received) * 100 : 0,
        closedToVisits: stats.visit_requests > 0 ? (stats.closed_leads / stats.visit_requests) * 100 : 0,
      }
    };
  }
};
