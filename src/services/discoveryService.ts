import { PropertyListing } from '../types';
import { SearchFilters } from '../components/SearchOverlay';
import { propertySearchService } from './propertySearchService';
import { supabase } from '../lib/supabase';

export const discoveryService = {
  // Simple weighted score combining Freshness and Sponsored boost
  rankListings(listings: PropertyListing[]): PropertyListing[] {
    const now = new Date().getTime();
    
    return [...listings].sort((a, b) => {
      const scoreA = this.computeListingScore(a, now);
      const scoreB = this.computeListingScore(b, now);
      return scoreB - scoreA;
    });
  },

  computeListingScore(item: PropertyListing, nowTimestamp: number): number {
    // 1. Freshness Score: 1 / (1 + age_in_days)
    const ageInMs = nowTimestamp - new Date(item.createdAt).getTime();
    const ageInDays = Math.max(0, ageInMs / (1000 * 60 * 60 * 24));
    const freshness = 1.0 / (1.0 + ageInDays);

    // 2. Sponsorship Boost
    let sponsoredBoost = 0;
    const raw = item as any;
    if (raw.is_sponsored || raw.isSponsored) {
      // Add boost of 1.0 + priority_score
      sponsoredBoost = 1.0 + (raw.priorityScore || raw.priority_score || 0.0);
    }

    return freshness + sponsoredBoost;
  },

  // Centralized Feed loader (retrieves raw list, computes scores and ranks them)
  async getRankedFeed(
    cursor?: string,
    limit: number = 10,
    filters?: SearchFilters
  ): Promise<PropertyListing[]> {
    const rawItems = await propertySearchService.getFeedListings(cursor, limit, filters);
    return this.rankListings(rawItems);
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

      // Score matching criteria
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
