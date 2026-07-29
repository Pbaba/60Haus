export type AnalyticsEventType = 
  | 'property_viewed'
  | 'property_saved'
  | 'property_shared'
  | 'conversation_started'
  | 'visit_requested'
  | 'visit_completed';

export interface OwnerStatistics {
  owner_id: string;
  total_listings: number;
  total_views: number;
  total_saves: number;
  total_leads: number;
  avg_response_time_minutes: number;
  avg_trust_score: number;
  updated_at: string;
}

export interface ListingStatistics {
  property_id: string;
  owner_id: string;
  total_views: number;
  unique_visitors: number;
  saves: number;
  shares: number;
  messages_received: number;
  visit_requests: number;
  closed_leads: number;
  health_score: number;
  updated_at: string;
}

export interface ListingDailyMetric {
  id: string;
  property_id: string;
  date: string;
  views: number;
  saves: number;
  messages: number;
}

export interface OwnerAchievement {
  id: string;
  owner_id: string;
  badge_key: string;
  unlocked_at: string;
}
