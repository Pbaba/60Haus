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
  status?: 'draft' | 'published' | 'rented' | 'sold' | 'archived';
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
