import { PropertyListing, DiscoveryMode } from '../types';
import { SearchFilters } from '../components/SearchOverlay';
import { propertySearchService } from './propertySearchService';
import { supabase } from '../lib/supabase';
import { bookmarkService } from './bookmarkService';
import { historyService } from './historyService';

const PERSONALIZATION_WEIGHTS = {
  city: 0.3,
  listingType: 0.2,
  budget: 0.1,
  savedSimilarity: 0.15,
  recentHistory: 0.1,
};

export interface DiscoveryStrategyInput {
  filters?: SearchFilters;
  candidateListings: PropertyListing[];
  userProfile?: any;
  savedProperties: PropertyListing[];
  recentlyViewedProperties: PropertyListing[];
  flexibleLevel?: number;
  exploredLocalities?: string[];
}

export interface DiscoveryStrategyResult {
  listings: PropertyListing[];
  reason?: string;
}

export interface DiscoveryStrategy {
  getRankedFeed(input: DiscoveryStrategyInput): DiscoveryStrategyResult;
}

// 1. Shared ranking algorithm functions
function computeListingScore(
  item: PropertyListing,
  nowTimestamp: number,
  userPref?: any,
  savedProperties?: PropertyListing[],
  recentlyViewedProperties?: PropertyListing[]
): number {
  const ageInMs = nowTimestamp - new Date(item.createdAt).getTime();
  const ageInDays = Math.max(0, ageInMs / (1000 * 60 * 60 * 24));
  const freshness = 1.0 / (1.0 + ageInDays);

  let sponsoredBoost = 0;
  const raw = item as any;
  if (raw.is_sponsored || raw.isSponsored) {
    sponsoredBoost = 1.0 + (raw.priorityScore || raw.priority_score || 0.0);
  }

  let personalizationScore = 0;

  if (userPref) {
    if (userPref.preferredCity && item.city.toLowerCase() === userPref.preferredCity.toLowerCase()) {
      personalizationScore += PERSONALIZATION_WEIGHTS.city;
    }
    if (userPref.preferredListingType && item.listingType === userPref.preferredListingType) {
      personalizationScore += PERSONALIZATION_WEIGHTS.listingType;
    }
    if (userPref.preferredBudget && item.price <= userPref.preferredBudget) {
      personalizationScore += PERSONALIZATION_WEIGHTS.budget;
    }
  }

  if (savedProperties && savedProperties.length > 0) {
    const hasSimilarSaved = savedProperties.some(
      (p) =>
        p.city.toLowerCase() === item.city.toLowerCase() &&
        p.bedrooms === item.bedrooms &&
        p.listingType === item.listingType
    );
    if (hasSimilarSaved) {
      personalizationScore += PERSONALIZATION_WEIGHTS.savedSimilarity;
    }
  }

  if (recentlyViewedProperties && recentlyViewedProperties.length > 0) {
    const hasSimilarViewed = recentlyViewedProperties.some(
      (p) =>
        p.city.toLowerCase() === item.city.toLowerCase() &&
        p.bedrooms === item.bedrooms &&
        p.listingType === item.listingType
    );
    if (hasSimilarViewed) {
      personalizationScore += PERSONALIZATION_WEIGHTS.recentHistory;
    }
  }

  return freshness + sponsoredBoost + personalizationScore;
}

function rankListings(
  listings: PropertyListing[],
  userPref?: any,
  savedProperties?: PropertyListing[],
  recentlyViewedProperties?: PropertyListing[]
): PropertyListing[] {
  const now = new Date().getTime();
  
  return [...listings].sort((a, b) => {
    const scoreA = computeListingScore(a, now, userPref, savedProperties, recentlyViewedProperties);
    const scoreB = computeListingScore(b, now, userPref, savedProperties, recentlyViewedProperties);
    return scoreB - scoreA;
  });
}

// 2. Exact Match Strategy
export class ExactMatchStrategy implements DiscoveryStrategy {
  getRankedFeed(input: DiscoveryStrategyInput): DiscoveryStrategyResult {
    const ranked = rankListings(
      input.candidateListings,
      input.userProfile,
      input.savedProperties,
      input.recentlyViewedProperties
    );
    return {
      listings: ranked,
      reason: 'Matches your exact preferences',
    };
  }
}

// 3. Flexible Match Strategy (Supports progressive expansion levels)
export class FlexibleMatchStrategy implements DiscoveryStrategy {
  static getRelaxedFilters(filters: SearchFilters, level: number): SearchFilters {
    const relaxed = { ...filters };
    const multiplier = level === 1 ? 0.20 : level === 2 ? 0.35 : 0.50;
    
    if (filters.minPrice) {
      relaxed.minPrice = Math.max(0, Math.round(filters.minPrice * (1 - multiplier)));
    }
    if (filters.maxPrice) {
      relaxed.maxPrice = Math.round(filters.maxPrice * (1 + multiplier));
    }
    
    if (level >= 2) {
      relaxed.furnishing = null;
    }
    
    if (level >= 3) {
      relaxed.bhk = null;
    }
    
    return relaxed;
  }

  getRankedFeed(input: DiscoveryStrategyInput): DiscoveryStrategyResult {
    let candidates = input.candidateListings;
    const level = input.flexibleLevel || 1;
    
    if (level === 3 && input.filters && input.filters.bhk !== null) {
      const targetBhk = input.filters.bhk;
      candidates = candidates.filter(
        (item) => Math.abs(item.bedrooms - targetBhk) <= 1
      );
    }
    
    const ranked = rankListings(
      candidates,
      input.userProfile,
      input.savedProperties,
      input.recentlyViewedProperties
    );
    
    const reasonMap: Record<number, string> = {
      1: 'Slightly expanded budget limit',
      2: 'Relaxed budget & furnishing preferences',
      3: 'Expanded bedroom & budget matching',
    };

    return {
      listings: ranked,
      reason: reasonMap[level] || 'Relaxed matching criteria',
    };
  }
}

// 4. Nearby Localities Discovery Strategy
export class NearbyStrategy implements DiscoveryStrategy {
  getRankedFeed(input: DiscoveryStrategyInput): DiscoveryStrategyResult {
    const candidates = input.candidateListings;
    const explored = input.exploredLocalities || [];
    
    const unexploredCandidates = candidates.filter(
      (item) => !item.locality || !explored.includes(item.locality.toLowerCase().trim())
    );
    
    const finalCandidates = unexploredCandidates.length > 0 ? unexploredCandidates : candidates;
    
    const ranked = rankListings(
      finalCandidates,
      input.userProfile,
      input.savedProperties,
      input.recentlyViewedProperties
    );

    return {
      listings: ranked,
      reason: 'Discovered in a neighbouring locality',
    };
  }
}

// 5. Revisit History & Saved Homes Strategy
export class RevisitStrategy implements DiscoveryStrategy {
  getRankedFeed(input: DiscoveryStrategyInput): DiscoveryStrategyResult {
    const savedIds = new Set(input.savedProperties.map((p) => p.id));
    const combined = [...input.recentlyViewedProperties];
    
    for (const s of input.savedProperties) {
      if (!combined.some((p) => p.id === s.id)) {
        combined.push(s);
      }
    }

    const ranked = combined.sort((a, b) => {
      const aSaved = savedIds.has(a.id) ? 1 : 0;
      const bSaved = savedIds.has(b.id) ? 1 : 0;
      if (aSaved !== bSaved) return bSaved - aSaved;
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
      listings: ranked,
      reason: 'Reviewing your viewed and saved history',
    };
  }
}

export const discoveryService = {
  // Centralized Feed loader (retrieves raw list, delegates to selected strategy)
  async getRankedFeed(
    userId?: string,
    cursor?: string,
    limit: number = 10,
    filters?: SearchFilters,
    mode: DiscoveryMode = DiscoveryMode.EXACT_MATCH,
    flexibleLevel: number = 1,
    exploredLocalities: string[] = []
  ): Promise<PropertyListing[]> {
    let userPref: any = undefined;
    let saved: PropertyListing[] = [];
    let recent: PropertyListing[] = [];

    if (userId) {
      try {
        const [profileRes, savedRes, recentRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          bookmarkService.getSavedProperties(userId).catch(() => []),
          historyService.getRecentViews(userId).catch(() => []),
        ]);
        const profile = profileRes.data;
        if (profile) {
          userPref = {
            preferredCity: profile.preferred_city,
            preferredListingType: profile.preferred_listing_type,
            preferredBudget: profile.preferred_budget,
          };
        }
        saved = savedRes;
        recent = recentRes;
      } catch (e) {
        console.warn('Discovery inputs load failed:', e);
      }
    }

    if (mode === DiscoveryMode.REVISIT) {
      const strategy = new RevisitStrategy();
      const result = strategy.getRankedFeed({
        filters,
        candidateListings: [],
        userProfile: userPref,
        savedProperties: saved,
        recentlyViewedProperties: recent,
      });
      return result.listings.map((item) => ({ ...item, reason: result.reason }));
    }

    let searchFilters = filters ? { ...filters } : undefined;
    
    if (mode === DiscoveryMode.FLEXIBLE_MATCH && filters) {
      searchFilters = FlexibleMatchStrategy.getRelaxedFilters(filters, flexibleLevel);
    } else if (mode === DiscoveryMode.NEARBY && filters && filters.city) {
      let targetLocalities: string[] = [];
      try {
        const { data: cityProps } = await supabase
          .from('properties')
          .select('locality')
          .eq('city', filters.city)
          .eq('status', 'published')
          .is('deleted_at', null);

        if (cityProps && cityProps.length > 0) {
          const density: Record<string, number> = {};
          cityProps.forEach((p: any) => {
            if (p.locality) {
              const loc = p.locality.trim();
              density[loc] = (density[loc] || 0) + 1;
            }
          });
          
          const sorted = Object.keys(density).sort((a, b) => density[b] - density[a]);
          
          let lastLocality = '';
          if (recent && recent.length > 0) {
            lastLocality = (recent[0] as any).locality || '';
          }
          
          const exploredNorm = exploredLocalities.map((l) => l.toLowerCase().trim());
          targetLocalities = sorted.filter(
            (loc) => loc.toLowerCase().trim() !== lastLocality.toLowerCase().trim() && 
                      !exploredNorm.includes(loc.toLowerCase().trim())
          );
          
          if (targetLocalities.length === 0) {
            targetLocalities = sorted.filter((loc) => loc.toLowerCase().trim() !== lastLocality.toLowerCase().trim());
          }
        }
      } catch (e) {
        console.warn('Dynamic localities lookup failed:', e);
      }

      searchFilters = {
        ...filters,
        localities: targetLocalities,
      };
    }

    const rawItems = await propertySearchService.getFeedListings(cursor, limit, searchFilters);

    let strategy: DiscoveryStrategy;
    if (mode === DiscoveryMode.FLEXIBLE_MATCH) {
      strategy = new FlexibleMatchStrategy();
    } else if (mode === DiscoveryMode.NEARBY) {
      strategy = new NearbyStrategy();
    } else {
      strategy = new ExactMatchStrategy();
    }

    const result = strategy.getRankedFeed({
      filters,
      candidateListings: rawItems,
      userProfile: userPref,
      savedProperties: saved,
      recentlyViewedProperties: recent,
      flexibleLevel,
      exploredLocalities,
    });

    return result.listings.map((item) => ({ ...item, reason: result.reason }));
  },

  // Recommendations: matches similar listings based on city, locality, type, bedrooms
  async getRecommendations(property: PropertyListing, limit: number = 5): Promise<PropertyListing[]> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*, property_images(image_url), property_videos(video_url, thumbnail_url)')
        .eq('status', 'published')
        .is('deleted_at', null)
        .neq('id', property.id)
        .limit(30);

      if (error) throw error;
      if (!data) return [];

      const mappedCandidates: PropertyListing[] = data.map((item: any) => {
        const videoRecord = item.property_videos && item.property_videos[0];
        return {
          id: item.id,
          ownerId: item.owner_id,
          title: item.title,
          description: item.description,
          price: Number(item.price),
          listingType: item.listing_type,
          city: item.city,
          locality: item.locality,
          address: item.address,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          furnishing: item.furnishing,
          thumbnailUrl: videoRecord?.thumbnail_url || item.thumbnail_url,
          videoUrl: videoRecord?.video_url || '',
          createdAt: item.created_at,
          imageUrls: item.property_images ? item.property_images.map((img: any) => img.image_url) : [],
          amenities: item.amenities,
          viewCount: item.view_count || 0,
          is_sponsored: item.is_sponsored,
          priority_score: item.priority_score,
        } as any;
      });

      const scored = mappedCandidates.map((candidate) => {
        let matchScore = 0;
        
        if (candidate.city.toLowerCase() === property.city.toLowerCase()) {
          matchScore += 5;
        }
        
        const candidateRaw = candidate as any;
        const propRaw = property as any;
        if (candidateRaw.locality && propRaw.locality && 
            candidateRaw.locality.toLowerCase() === propRaw.locality.toLowerCase()) {
          matchScore += 4;
        }
        
        if (candidate.bedrooms === property.bedrooms) {
          matchScore += 3;
        }
        
        if (candidate.listingType === property.listingType) {
          matchScore += 2;
        }

        const candidatePropType = candidateRaw.propertyType || candidateRaw.property_type;
        const propType = propRaw.propertyType || propRaw.property_type;
        if (candidatePropType && propType && 
            candidatePropType.toLowerCase() === propType.toLowerCase()) {
          matchScore += 2;
        }

        return { candidate, matchScore };
      });

      return scored
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit)
        .map((x) => x.candidate);
    } catch (e) {
      console.warn('Recommendations query failed:', e);
      return [];
    }
  },
};
