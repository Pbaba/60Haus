/**
 * Analytics Service — 60Haus
 *
 * Local event tracking system that queues events for future SDK integration.
 * In development mode, events are logged to the console for debugging.
 * In production, events are queued and can be flushed to any analytics provider.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsEvent {
  name: string;
  properties: Record<string, unknown>;
  timestamp: number;
}

// ─── Event Queue ────────────────────────────────────────────────────────────

const eventQueue: AnalyticsEvent[] = [];
const MAX_QUEUE_SIZE = 500;

function trackEvent(name: string, properties: Record<string, unknown> = {}): void {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: Date.now(),
  };

  if (__DEV__) {
    console.log(`[Analytics] ${name}`, properties);
  }

  eventQueue.push(event);

  // Prevent unbounded memory growth
  if (eventQueue.length > MAX_QUEUE_SIZE) {
    eventQueue.splice(0, eventQueue.length - MAX_QUEUE_SIZE);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const analyticsService = {
  /** Track when a listing detail is opened */
  trackListingViewed(listingId: string, listingType: string, city: string, locality?: string) {
    trackEvent('listing_viewed', { listingId, listingType, city, locality });
  },

  /** Track when a property is saved or unsaved */
  trackPropertySaved(listingId: string, action: 'save' | 'unsave') {
    trackEvent('property_saved', { listingId, action });
  },

  /** Track when search filters are applied */
  trackFiltersApplied(filters: Record<string, unknown>) {
    trackEvent('filters_applied', { filters });
  },

  /** Track when a search is executed */
  trackSearchExecuted(query: string, resultCount: number) {
    trackEvent('search_executed', { query, resultCount });
  },

  /** Track when interactive map is opened */
  trackMapOpened(listingId: string) {
    trackEvent('map_opened', { listingId });
  },

  /** Track when directions are requested */
  trackDirectionsOpened(listingId: string) {
    trackEvent('directions_opened', { listingId });
  },

  /** Track when owner is contacted */
  trackContactOwner(listingId: string, method: 'call' | 'whatsapp' | 'chat') {
    trackEvent('contact_owner', { listingId, method });
  },

  /** Track when a new listing is created */
  trackListingCreated(listingId: string, listingType: string) {
    trackEvent('listing_created', { listingId, listingType });
  },

  /** Track when a listing is edited */
  trackListingEdited(listingId: string) {
    trackEvent('listing_edited', { listingId });
  },

  /** Track discovery mode change */
  trackDiscoveryModeChanged(mode: string) {
    trackEvent('discovery_mode_changed', { mode });
  },

  /** Track when onboarding is completed */
  trackOnboardingCompleted() {
    trackEvent('onboarding_completed', {});
  },

  /** Track successful login */
  trackAuthLogin(method: string) {
    trackEvent('auth_login', { method });
  },

  /** Track successful registration */
  trackAuthRegister(method: string) {
    trackEvent('auth_register', { method });
  },

  /** Track screen view */
  trackScreenView(screenName: string) {
    trackEvent('screen_view', { screenName });
  },

  /** Track discovery end reached */
  trackDiscoveryEndReached() {
    trackEvent('discovery_end_reached', {});
  },

  /** Track discovery mode selected (legacy compat) */
  trackDiscoveryModeSelected(mode: string) {
    trackEvent('discovery_mode_selected', { mode });
  },

  trackCollectionCreated(collectionId: string, name: string) {
    trackEvent('collection_created', { collectionId, name });
  },

  trackCollectionDeleted(collectionId: string) {
    trackEvent('collection_deleted', { collectionId });
  },

  trackCollectionOpened(collectionId: string, name: string) {
    trackEvent('collection_opened', { collectionId, name });
  },

  trackPropertyAddedToCollection(propertyId: string, collectionId: string) {
    trackEvent('property_added_to_collection', { propertyId, collectionId });
  },

  trackPropertyRemovedFromCollection(propertyId: string, collectionId: string) {
    trackEvent('property_removed_from_collection', { propertyId, collectionId });
  },

  trackSavedSearchCreated(name: string) {
    trackEvent('saved_search_created', { name });
  },

  trackSavedSearchExecuted(name: string) {
    trackEvent('saved_search_executed', { name });
  },

  trackAlertCreated(alertType: string, searchName?: string) {
    trackEvent('alert_created', { alertType, searchName });
  },

  trackAlertDeleted(alertId: string) {
    trackEvent('alert_deleted', { alertId });
  },

  trackPropertyCompared(propertyIds: string[]) {
    trackEvent('property_compared', { propertyIds });
  },

  trackRecentlyViewedOpened() {
    trackEvent('recently_viewed_opened', {});
  },

  trackVerificationViewed(propertyId: string) {
    trackEvent('verification_viewed', { propertyId });
  },

  trackTimelineViewed(propertyId: string) {
    trackEvent('timeline_viewed', { propertyId });
  },

  trackPriceHistoryViewed(propertyId: string) {
    trackEvent('price_history_viewed', { propertyId });
  },

  trackListingReported(propertyId: string, category: string) {
    trackEvent('listing_reported', { propertyId, category });
  },

  trackOwnerProfileViewed(ownerId: string) {
    trackEvent('owner_profile_viewed', { ownerId });
  },

  trackTrustScoreExpanded(propertyId: string) {
    trackEvent('trust_score_expanded', { propertyId });
  },

  /** Get the current event queue for debugging */
  getEventQueue(): readonly AnalyticsEvent[] {
    return eventQueue;
  },

  /** Flush the event queue — for future SDK integration */
  flushEvents(): AnalyticsEvent[] {
    const flushed = [...eventQueue];
    eventQueue.length = 0;
    return flushed;
  },
};
