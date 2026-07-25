import { PropertyListing, DiscoveryMode } from '../types';
import { SearchFilters } from '../features/discovery/components/FilterSheet';
import { propertySearchService } from './propertySearchService';
import { supabase } from '../lib/supabase';
import { bookmarkService } from './bookmarkService';
import { historyService } from './historyService';

import { discoveryRankingService } from '../features/discovery/services/discoveryRankingService';
import { enrichPropertyListing } from '../utils/propertyIntelligence';

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

function rankListings(
  listings: PropertyListing[],
  userPref?: any,
  savedProperties: PropertyListing[] = [],
  recentlyViewedProperties: PropertyListing[] = []
): PropertyListing[] {
  return discoveryRankingService.rankProperties(
    listings,
    userPref,
    savedProperties,
    recentlyViewedProperties
  );
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
    exploredLocalities: string[] = [],
    cachedData?: {
      profile?: any;
      savedProperties?: PropertyListing[];
      recentlyViewed?: PropertyListing[];
    }
  ): Promise<PropertyListing[]> {
    let userPref: any = undefined;
    let saved: PropertyListing[] = [];
    let recent: PropertyListing[] = [];

    if (userId) {
      try {
        const useCacheProfile = cachedData && cachedData.profile !== undefined;
        const profile = useCacheProfile 
          ? cachedData.profile 
          : (await supabase.from('profiles').select('*').eq('id', userId).single()).data;

        if (profile) {
          userPref = {
            preferredCity: profile.preferred_city || profile.preferredCity,
            preferredListingType: profile.preferred_listing_type || profile.preferredListingType,
            preferredBudget: profile.preferred_budget || profile.preferredBudget,
          };
        }

        saved = cachedData && cachedData.savedProperties !== undefined 
          ? cachedData.savedProperties 
          : await bookmarkService.getSavedProperties(userId).catch(() => []);

        recent = cachedData && cachedData.recentlyViewed !== undefined 
          ? cachedData.recentlyViewed 
          : await historyService.getRecentViews(userId).catch(() => []);
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

  // Recommendations: delegates to discoveryRankingService
  async getRecommendations(property: PropertyListing, limit: number = 5): Promise<PropertyListing[]> {
    return discoveryRankingService.getSimilarProperties(property, limit);
  },
};
