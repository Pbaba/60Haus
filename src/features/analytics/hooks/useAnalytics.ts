import { useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';
import { AnalyticsEventType } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';

export function useAnalytics() {
  const { user } = useAuth();

  const trackEvent = useCallback((
    eventType: AnalyticsEventType,
    propertyId: string,
    ownerId: string,
    metadata?: Record<string, any>
  ) => {
    analyticsService.trackEvent(eventType, propertyId, ownerId, user?.id, metadata);
  }, [user]);

  return {
    trackEvent
  };
}
