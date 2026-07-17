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
  status?: 'draft' | 'published' | 'archived' | 'available' | 'reserved' | 'sold' | 'rented' | 'coming-soon';
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
  healthScore?: number;
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

