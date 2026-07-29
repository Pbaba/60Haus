import { supabase } from '../../../lib/supabase';
import { AnalyticsEventType } from '../../../types';

export const analyticsService = {
  async trackEvent(
    eventType: AnalyticsEventType, 
    propertyId: string, 
    ownerId: string, 
    actorId?: string, 
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // 1. Insert into analytics_events ledger
      await supabase.from('analytics_events').insert({
        event_type: eventType,
        property_id: propertyId,
        owner_id: ownerId,
        actor_id: actorId,
        metadata: metadata || {}
      });

      // 2. We trigger aggregation incrementally or just rely on backend triggers/cron.
      // For this frontend implementation, we can optimistically call aggregationService 
      // if we want immediate dashboard updates, or let the backend handle it.
    } catch (e) {
      console.warn('Failed to track analytics event:', e);
    }
  }
};
