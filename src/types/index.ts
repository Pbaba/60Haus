export interface UserProfile {
  id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  phoneNumber?: string;
  role: 'hunter' | 'owner';
  createdAt: string;
  preferredCity?: string;
  preferredListingType?: 'rent' | 'buy';
  preferredBudget?: number;
  verificationLevel?: 'unverified' | 'basic' | 'verified' | 'premium';
  push_token?: string;
}

export interface PropertyListing {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  price: number;
  address: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  furnishing: 'unfurnished' | 'semi-furnished' | 'fully-furnished';
  listingType: 'rent' | 'buy';
  videoUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
  status?: 'draft' | 'pending' | 'published' | 'archived' | 'available' | 'reserved' | 'sold' | 'rented' | 'coming-soon';
  imageUrls?: string[];
  amenities?: string[];
  latitude?: number;
  longitude?: number;
  viewCount?: number;
  saveCount?: number;
  contactCount?: number;
  deletedAt?: string;
  locality?: string;
  propertyType?: string;
  personalizationExplanations?: string[];
  trustSignals?: string[];
  is_sponsored?: boolean;
  priority_score?: number;
  state?: string;
  postalCode?: string;
  formattedAddress?: string;

  // Verification Lifecycle
  lastVerifiedAt?: string;
  verificationDueAt?: string;
  nextVerificationAt?: string;
  verificationStatus?: 'active' | 'awaiting_verification' | 'grace_period' | 'inactive_unverified';
  verificationMissCount?: number;

  // Marketplace Integrity (Sprint 20)
  healthScore?: number;
  healthStatus?: 'excellent' | 'good' | 'needs_attention' | 'poor';
  healthBreakdown?: Record<string, any>;
  lastIntegrityCheckAt?: string;
  dynamicTrustRank?: number; // Fetched from backend view

  // Sale specific columns
  carpetArea?: number;
  builtUpArea?: number;
  superBuiltUpArea?: number;
  plotArea?: number;
  propertyAge?: number;
  possessionStatus?: 'ready-to-move' | 'under-construction';
  ownershipType?: 'freehold' | 'leasehold' | 'co-operative' | 'power-of-attorney';
  propertyAgeConfidence?: 'verified' | 'estimated';
  lastInspectionDate?: string;
  lastInspectionConfidence?: 'verified' | 'estimated';
  occupancyStatus?: 'vacant' | 'occupied' | 'tenant-occupied';
  registrationAvailability?: boolean;
  reraNumber?: string;
  reraNumberConfidence?: 'verified' | 'estimated';

  // Rent specific columns
  securityDeposit?: number;
  monthlyMaintenance?: number;
  brokerage?: number;
  leaseDuration?: number;
  availableFrom?: string;
  preferredTenant?: 'anyone' | 'family' | 'bachelors' | 'company';

  // Dynamically computed metrics
  pricePerSqft?: number;
  pricePerSqm?: number;
  priceTier?: 'budget' | 'mid-range' | 'premium' | 'luxury';
  areaTier?: 'compact' | 'medium' | 'spacious' | 'villa';
  luxuryClassification?: 'standard' | 'luxury' | 'ultra-luxury';
  healthSuggestions?: { text: string; boost: number }[];
}

export enum DiscoveryMode {
  EXACT_MATCH = 'EXACT_MATCH',
  FLEXIBLE_MATCH = 'FLEXIBLE_MATCH',
  NEARBY = 'NEARBY',
  REVISIT = 'REVISIT',
}

export interface SavedProperty {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
}

export interface PropertyLike {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
}

export interface PropertyReport {
  id: string;
  reporterId: string;
  propertyId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'under_review' | 'dismissed' | 'confirmed' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateListingCandidate {
  id: string;
  propertyId: string;
  duplicateOfId: string;
  similarityScore: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  status: 'pending' | 'under_review' | 'dismissed' | 'confirmed' | 'resolved';
  createdAt: string;
}

export interface OwnerReliabilityMetrics {
  ownerId: string;
  reliabilityScore: number;
  responseRate: number;
  reportCount: number;
  verificationMissCount: number;
  updatedAt: string;
}

export interface ModerationEvent {
  id: string;
  entityType: 'property' | 'report' | 'duplicate';
  entityId: string;
  moderatorId?: string;
  action: string;
  notes?: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  propertiesCount?: number;
  coverImageUrl?: string;
}

export interface CollectionProperty {
  id: string;
  collectionId: string;
  propertyId: string;
  notes?: string;
  createdAt: string;
  property?: PropertyListing;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name?: string;
  filters: any;
  isPinned: boolean;
  createdAt: string;
}

export interface AlertSubscription {
  id: string;
  userId: string;
  searchId?: string;
  alertType: 'new_matching_property' | 'price_drop' | 'verified_owner' | 'listing_updated';
  isActive: boolean;
  createdAt: string;
}

export interface PropertyVerification {
  id: string;
  propertyId: string;
  verificationType: 'owner' | 'documents' | 'address' | 'photos' | 'contact';
  verifiedAt: string;
}

export interface PriceHistoryRecord {
  id: string;
  propertyId: string;
  price: number;
  changedAt: string;
}

export interface PropertyActivityLog {
  id: string;
  propertyId: string;
  eventType: 'listed' | 'price_updated' | 'photos_added' | 'description_updated' | 'verification_completed' | 'status_changed';
  description: string;
  createdAt: string;
}

export interface ListingQualityReport {
  overallScore: number;
  trustworthinessScore: number;
  transparencyScore: number;
  completenessScore: number;
  explanations: {
    dimension: 'trustworthiness' | 'transparency' | 'completeness';
    title: string;
    description: string;
    whyItMatters: string;
    score: number;
  }[];
}

export interface ListingVerificationHistory {
  id: string;
  propertyId: string;
  ownerId: string;
  actionTaken: 'verified_available' | 'marked_sold' | 'marked_rented' | 'paused' | 'auto_deactivated';
  previousStatus: 'active' | 'awaiting_verification' | 'grace_period' | 'inactive_unverified';
  newStatus: 'active' | 'awaiting_verification' | 'grace_period' | 'inactive_unverified' | 'archived';
  createdAt: string;
}

// --- Sprint 24: Communication & Lead Management ---

export type LeadStatus = 'new_inquiry' | 'responded' | 'visit_scheduled' | 'negotiating' | 'closed' | 'archived';
export type MessageType = 'text' | 'system' | 'visit_request' | 'attachment';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type VisitStatus = 'pending' | 'accepted' | 'declined' | 'rescheduled' | 'cancelled';

export interface Conversation {
  id: string;
  property_id: string;
  owner_id: string;
  buyer_id: string;
  lead_status: LeadStatus;
  created_at: string;
  updated_at: string;
  last_message_preview?: string;
  property?: PropertyListing; // Joined
  owner?: UserProfile; // Joined
  buyer?: UserProfile; // Joined
  unread_count?: number; // Computed locally
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  is_archived: boolean;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  type: 'image' | 'property_card';
  url: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null; // null for system messages
  text: string;
  type: MessageType;
  status: MessageStatus;
  created_at: string;
  attachments?: MessageAttachment[]; // Joined
}

export interface VisitRequest {
  id: string;
  conversation_id: string;
  buyer_id: string;
  requested_date: string;
  requested_time: string;
  note?: string;
  status: VisitStatus;
  created_at: string;
  updated_at: string;
}

export interface SavedReply {
  id: string;
  owner_id: string;
  text: string;
  sort_order: number;
  created_at: string;
}
