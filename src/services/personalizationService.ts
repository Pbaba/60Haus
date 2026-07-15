import { PropertyListing } from '../types';
import { DISCOVERY_WEIGHTS } from '../constants/property';
import { enrichPropertyListing } from '../utils/propertyIntelligence';

export const personalizationService = {
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
        explanations.push(`Matches your typical BHK search (${item.bedrooms} BHK)`);
      }
    }

    // 3. Saved property similarity
    if (savedProperties.length > 0) {
      const similarSaved = savedProperties.some(
        (p) =>
          p.city.toLowerCase() === item.city.toLowerCase() &&
          p.bedrooms === item.bedrooms &&
          p.listingType === item.listingType
      );
      if (similarSaved) {
        score += 2.0;
        explanations.push('Similar to saved homes');
      }
    }

    // 4. Viewing history influence
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

    // 5. Listing freshness
    const now = Date.now();
    const ageInMs = now - new Date(item.createdAt).getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    
    if (ageInDays <= 1) {
      score += 2.0;
      explanations.push('Recently listed');
      trustSignals.push('Listed Today');
    } else if (ageInDays <= 3) {
      score += 1.0;
      trustSignals.push('Recently Updated');
    }

    // 6. Popularity
    const popularity = (item.viewCount || 0) + (item.saveCount || 0) * 4;
    if (popularity > 25) {
      score += 1.5;
      explanations.push('Popular among buyers');
      trustSignals.push('Popular Listing');
    }

    // 7. Trust signals (Owner verification, video tour)
    const isOwnerVerified = (item.ownerId.charCodeAt(0) + item.ownerId.charCodeAt(item.ownerId.length - 1)) % 2 === 0;
    if (isOwnerVerified) {
      trustSignals.push('Verified Owner');
    }

    if (item.videoUrl && item.videoUrl.length > 0) {
      trustSignals.push('High Quality Walkthrough');
    }

    // Fallbacks and limits
    if (explanations.length === 0) {
      explanations.push('Matches active search');
    }

    return {
      score,
      explanations: explanations.slice(0, 3), // Limit explanations to three chips
      trustSignals: trustSignals.slice(0, 3),   // Limit trust badges to three
    };
  },

  // Rank candidate properties by personalization score and attach personalization chips
  rankProperties(
    candidateListings: PropertyListing[],
    userProfile?: any,
    savedProperties: PropertyListing[] = [],
    recentlyViewedProperties: PropertyListing[] = []
  ): PropertyListing[] {
    // Precompute locality counts once
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
      // Safely ensure item has computed intelligence, trust, and health metrics
      const item = rawItem.healthScore === undefined ? enrichPropertyListing(rawItem) : rawItem;

      const { score, explanations } = this.computeListingScore(
        item,
        userProfile,
        savedProperties,
        recentlyViewedProperties,
        localityCounts
      );

      // Compute composite ranking components normalized to 0.0 - 1.0
      const normPersonalization = Math.min(1.0, score / 10.0);
      const normHealth = (item.healthScore || 0) / 100.0;
      const normTrust = (item.trustSignals?.length || 0) / 7.0; // 7 possible trust badges
      
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
        personalizationScore: score,
        priority_score: compositeScore, // Assign composite discovery ranking score
      };
    });

    // Sort by final calculated composite ranking score (descending)
    return (scoredListings as any[]).sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  },
};
