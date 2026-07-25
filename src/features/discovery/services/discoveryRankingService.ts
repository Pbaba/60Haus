import { PropertyListing } from '../../../types';
import { DISCOVERY_WEIGHTS } from '../../../constants/property';
import { enrichPropertyListing } from '../../../utils/propertyIntelligence';
import { supabase } from '../../../lib/supabase';

export const discoveryRankingService = {
  // Score a listing based on user profile preferences, saves, and recent history
  computeListingScore(
    item: PropertyListing,
    userProfile?: any,
    savedProperties: PropertyListing[] = [],
    recentlyViewedProperties: PropertyListing[] = [],
    precomputedLocalityCounts?: Record<string, number>
  ): { score: number; explanations: string[]; trustSignals: string[] } {
    let score = 0;
    const explanations: string[] = [];
    const trustSignals: string[] = [];

    // 1. Explicit preferences / Profile preferences
    if (userProfile) {
      if (userProfile.preferredCity && item.city.toLowerCase() === userProfile.preferredCity.toLowerCase()) {
        score += 2.0;
      }
      if (userProfile.preferredListingType && item.listingType === userProfile.preferredListingType) {
        score += 1.5;
      }
      if (userProfile.preferredBudget) {
        const budget = Number(userProfile.preferredBudget);
        if (item.price <= budget) {
          score += 2.5;
          explanations.push('Matches your budget');
        } else if (item.price <= budget * 1.2) {
          score += 1.0;
          const pctUnder = Math.round(((item.price - budget) / budget) * 100);
          explanations.push(`Within ${pctUnder}% of budget`);
        }
      }
    }

    // 2. Locality affinity scoring
    let localityCounts = precomputedLocalityCounts;
    if (!localityCounts) {
      localityCounts = {};
      recentlyViewedProperties.forEach((p) => {
        if (p.locality) {
          const loc = p.locality.toLowerCase().trim();
          localityCounts![loc] = (localityCounts![loc] || 0) + 1;
        }
      });
      savedProperties.forEach((p) => {
        if (p.locality) {
          const loc = p.locality.toLowerCase().trim();
          localityCounts![loc] = (localityCounts![loc] || 0) + 3; // Saved homes have higher affinity weight
        }
      });
    }

    if (item.locality) {
      const itemLoc = item.locality.toLowerCase().trim();
      const affinity = localityCounts[itemLoc] || 0;
      if (affinity > 0) {
        score += Math.min(3.0, affinity * 0.5);
        explanations.push('In your preferred locality');
      }
    }

    // 3. Size / Configuration matching (BHK preference from recent history)
    if (recentlyViewedProperties.length > 0) {
      const bhkCounts: Record<number, number> = {};
      recentlyViewedProperties.forEach((p) => {
        bhkCounts[p.bedrooms] = (bhkCounts[p.bedrooms] || 0) + 1;
      });
      const favoriteBhk = Object.keys(bhkCounts).reduce((a, b) => 
        bhkCounts[Number(a)] > bhkCounts[Number(b)] ? Number(a) : Number(b), 
        item.bedrooms
      );
      
      if (item.bedrooms === favoriteBhk) {
        score += 1.0;
        explanations.push(`Matches your typical search (${item.bedrooms} BHK)`);
      }
    }

    // 4. Trust & Quality Signals (Sprint 20 & 23 expansions)
    if (item.healthStatus === 'excellent') {
      score += 1.5;
      trustSignals.push('Excellent Quality');
    }
    
    if (item.dynamicTrustRank && item.dynamicTrustRank > 80) {
      score += 2.0;
      trustSignals.push('Highly Trusted');
    }

    // 5. Viewing history influence
    if (recentlyViewedProperties.length > 0) {
      const similarViewed = recentlyViewedProperties.some(
        (p) =>
          p.city.toLowerCase() === item.city.toLowerCase() &&
          p.bedrooms === item.bedrooms &&
          p.listingType === item.listingType
      );
      if (similarViewed) {
        score += 1.2;
        explanations.push('Similar to viewed homes');
      }
    }

    // Fallbacks and limits
    if (explanations.length === 0) {
      explanations.push('Matches active search');
    }

    return {
      score,
      explanations: explanations.slice(0, 3),
      trustSignals: trustSignals.slice(0, 3),
    };
  },

  // Rank candidate properties by personalization score and attach personalization chips
  rankProperties(
    candidateListings: PropertyListing[],
    userProfile?: any,
    savedProperties: PropertyListing[] = [],
    recentlyViewedProperties: PropertyListing[] = []
  ): PropertyListing[] {
    const localityCounts: Record<string, number> = {};
    recentlyViewedProperties.forEach((p) => {
      if (p.locality) {
        const loc = p.locality.toLowerCase().trim();
        localityCounts[loc] = (localityCounts[loc] || 0) + 1;
      }
    });
    savedProperties.forEach((p) => {
      if (p.locality) {
        const loc = p.locality.toLowerCase().trim();
        localityCounts[loc] = (localityCounts[loc] || 0) + 3;
      }
    });

    const scoredListings = candidateListings.map((rawItem) => {
      const item = rawItem.healthScore === undefined ? enrichPropertyListing(rawItem) : rawItem;

      const { score, explanations, trustSignals } = this.computeListingScore(
        item,
        userProfile,
        savedProperties,
        recentlyViewedProperties,
        localityCounts
      );

      const normPersonalization = Math.min(1.0, score / 10.0);
      const normHealth = (item.healthScore || 0) / 100.0;
      const normTrust = (item.dynamicTrustRank || 0) / 100.0;
      
      const ageInDays = Math.max(0, (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const freshness = 1.0 / (1.0 + ageInDays);

      const compositeScore = (
        normPersonalization * DISCOVERY_WEIGHTS.personalization +
        normHealth * DISCOVERY_WEIGHTS.health +
        normTrust * DISCOVERY_WEIGHTS.trust +
        freshness * DISCOVERY_WEIGHTS.freshness
      );
      
      return {
        ...item,
        personalizationExplanations: explanations,
        trustSignals: [...(item.trustSignals || []), ...trustSignals],
        personalizationScore: score,
        priority_score: compositeScore,
      };
    });

    return (scoredListings as any[]).sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  },

  // Get similar properties (replacing recommendations in discoveryService)
  async getSimilarProperties(property: PropertyListing, limit: number = 5): Promise<PropertyListing[]> {
    try {
      // We leverage the ranked_feed_listings view from Sprint 20 that includes dynamic_trust_rank
      const { data, error } = await supabase
        .from('ranked_feed_listings')
        .select('*, property_images(image_url), property_videos(video_url, thumbnail_url)')
        .neq('id', property.id)
        .limit(40); // Fetch a broad candidate pool

      if (error) throw error;
      if (!data) return [];

      const mappedCandidates: PropertyListing[] = data.map((item: any) => {
        const videoRecord = item.property_videos && item.property_videos[0];
        return enrichPropertyListing({
          ...item,
          imageUrls: item.property_images ? item.property_images.map((img: any) => img.image_url) : [],
          videoUrl: videoRecord?.video_url || '',
          thumbnailUrl: videoRecord?.thumbnail_url || item.thumbnail_url,
          dynamicTrustRank: item.dynamic_trust_rank,
        });
      });

      const scored = mappedCandidates.map((candidate) => {
        let matchScore = 0;
        
        // Location matching
        if (candidate.city.toLowerCase() === property.city.toLowerCase()) matchScore += 5;
        if (candidate.locality && property.locality && 
            candidate.locality.toLowerCase() === property.locality.toLowerCase()) {
          matchScore += 4;
        }
        
        // Specs matching
        if (candidate.bedrooms === property.bedrooms) matchScore += 3;
        if (candidate.listingType === property.listingType) matchScore += 2;
        if (candidate.propertyType === property.propertyType) matchScore += 2;

        // Trust & Reliability Signals (Sprint 23 requirement)
        if (candidate.dynamicTrustRank && candidate.dynamicTrustRank >= 80) matchScore += 3; // Highly trusted owner
        if (candidate.healthStatus === 'excellent') matchScore += 2; // Great listing health
        
        // Verification Freshness
        if (candidate.lastVerifiedAt) {
           const daysSinceVerify = (Date.now() - new Date(candidate.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24);
           if (daysSinceVerify < 7) matchScore += 2; // Recently verified
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
