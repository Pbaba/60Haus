import { supabase } from '../lib/supabase';
import { PropertyListing } from '../types';
import { SearchFilters } from '../features/discovery/components/FilterSheet';
import { enrichPropertyListing } from '../utils/propertyIntelligence';
import { locationDomain } from '../domain/location';

export const propertySearchService = {
  async getFeedListings(
    cursor?: string,
    limit: number = 10,
    filters?: SearchFilters
  ): Promise<PropertyListing[]> {
    let query = supabase
      .from('ranked_feed_listings')
      .select('*, property_images(image_url), property_videos(video_url, thumbnail_url)')
      .eq('status', 'published')
      .is('deleted_at', null);

    // Filter rules
    if (filters) {
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.listingType) {
        query = query.eq('listing_type', filters.listingType);
      }
      if (filters.bhk !== null && filters.bhk !== undefined) {
        query = query.eq('bedrooms', filters.bhk);
      }
      if (filters.furnishing) {
        query = query.eq('furnishing', filters.furnishing);
      }
      if (filters.minPrice !== undefined && filters.minPrice > 0) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.localities && filters.localities.length > 0) {
        query = query.in('locality', filters.localities);
      }
      
      // Sprint 12 additions
      if (filters.propertyType) {
        query = query.eq('property_type', filters.propertyType);
      }
      if (filters.bathrooms !== null && filters.bathrooms !== undefined) {
        query = query.eq('bathrooms', filters.bathrooms);
      }
      if (filters.propertyAge !== null && filters.propertyAge !== undefined) {
        query = query.lte('property_age', filters.propertyAge);
      }
      if (filters.ownershipType) {
        query = query.eq('ownership_type', filters.ownershipType);
      }
      if (filters.minCarpetArea !== undefined && filters.minCarpetArea !== null) {
        query = query.gte('carpet_area', filters.minCarpetArea);
      }
      if (filters.maxCarpetArea !== undefined && filters.maxCarpetArea !== null) {
        query = query.lte('carpet_area', filters.maxCarpetArea);
      }
      if (filters.maxDeposit !== undefined && filters.maxDeposit !== null) {
        query = query.lte('security_deposit', filters.maxDeposit);
      }
      if (filters.maxMaintenance !== undefined && filters.maxMaintenance !== null) {
        query = query.lte('monthly_maintenance', filters.maxMaintenance);
      }
      
      // Trust filters
      if (filters.trustFilters && filters.trustFilters.length > 0) {
        if (filters.trustFilters.includes('verified')) {
          query = query.not('owner_id', 'is', null);
        }
        if (filters.trustFilters.includes('walkthrough')) {
          query = query.not('video_url', 'eq', '');
        }
      }

      // Amenities AND match logic
      if (filters.amenities && filters.amenities.length > 0) {
        query = query.contains('amenities', filters.amenities);
      }
    }

    // Cursor-based Pagination
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    // Ordering logic
    if (filters && filters.sortBy) {
      switch (filters.sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'price-low-high':
          query = query.order('price', { ascending: true });
          break;
        case 'price-high-low':
          query = query.order('price', { ascending: false });
          break;
        default:
          query = query.order('dynamic_trust_rank', { ascending: false }).order('created_at', { ascending: false });
      }
    } else {
      query = query.order('dynamic_trust_rank', { ascending: false }).order('created_at', { ascending: false });
    }

    // Limit chunk size
    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    let results = data.map((item: any) => {
      const videoRecord = item.property_videos && item.property_videos[0];
      return enrichPropertyListing({
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
        dynamicTrustRank: item.dynamic_trust_rank,
        healthScore: item.health_score,
        healthStatus: item.health_status,
        healthBreakdown: item.health_breakdown,
        lastIntegrityCheckAt: item.last_integrity_check_at,
        carpetArea: item.carpet_area ? Number(item.carpet_area) : undefined,
        builtUpArea: item.built_up_area ? Number(item.built_up_area) : undefined,
        superBuiltUpArea: item.super_built_up_area ? Number(item.super_built_up_area) : undefined,
        plotArea: item.plot_area ? Number(item.plot_area) : undefined,
        propertyAge: item.property_age ? Number(item.property_age) : undefined,
        possessionStatus: item.possession_status || undefined,
        ownershipType: item.ownership_type || undefined,
        securityDeposit: item.security_deposit ? Number(item.security_deposit) : undefined,
        monthlyMaintenance: item.monthly_maintenance ? Number(item.monthly_maintenance) : undefined,
        brokerage: item.brokerage ? Number(item.brokerage) : undefined,
        leaseDuration: item.lease_duration ? Number(item.lease_duration) : undefined,
        availableFrom: item.available_from || undefined,
        preferredTenant: item.preferred_tenant || undefined,
        status: item.status,
        latitude: item.latitude ? Number(item.latitude) : undefined,
        longitude: item.longitude ? Number(item.longitude) : undefined,
        state: item.state || undefined,
        postalCode: item.postal_code || undefined,
        formattedAddress: item.formatted_address || undefined,
      });
    });

    // Apply client-side locality, commute and lifestyle filters
    if (filters && (
      filters.maxMetroDist || filters.maxHospitalDist || filters.maxSchoolDist || filters.maxParkDist || filters.maxMallDist ||
      (filters.lifestyleFriendly && filters.lifestyleFriendly.length > 0) ||
      filters.maxCommuteAirport || filters.maxCommuteMetro || filters.maxCommuteBusiness
    )) {
      const filteredResults: PropertyListing[] = [];
      for (const item of results) {
        // Load neighborhood snapshot (uses in-memory cache internally)
        const snapshot = await locationDomain.getNeighborhoodSnapshot(item, results);
        
        let keep = true;

        // Proximity checks (converted from km to meters)
        if (filters.maxMetroDist && !snapshot.nearbyPlaces.some(p => p.subcategory === 'Metro Station' && p.distance <= filters.maxMetroDist! * 1000)) keep = false;
        if (filters.maxHospitalDist && !snapshot.nearbyPlaces.some(p => p.subcategory === 'Hospital' && p.distance <= filters.maxHospitalDist! * 1000)) keep = false;
        if (filters.maxSchoolDist && !snapshot.nearbyPlaces.some(p => p.subcategory === 'School' && p.distance <= filters.maxSchoolDist! * 1000)) keep = false;
        if (filters.maxParkDist && !snapshot.nearbyPlaces.some(p => p.subcategory === 'Park' && p.distance <= filters.maxParkDist! * 1000)) keep = false;
        if (filters.maxMallDist && !snapshot.nearbyPlaces.some(p => p.subcategory === 'Shopping Mall' && p.distance <= filters.maxMallDist! * 1000)) keep = false;

        // Lifestyle characteristics matching
        if (filters.lifestyleFriendly && filters.lifestyleFriendly.length > 0) {
          const hasAllTags = filters.lifestyleFriendly.every((tag: string) => 
            snapshot.lifestyleTags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
          );
          if (!hasAllTags) keep = false;
        }

        // Commute limits (duration in minutes)
        if (filters.maxCommuteAirport) {
          const est = snapshot.commuteHighlights.find(c => c.category === 'airport' && c.transportMode === 'driving');
          if (est && est.estimatedDuration > filters.maxCommuteAirport) keep = false;
        }
        if (filters.maxCommuteMetro) {
          const est = snapshot.commuteHighlights.find(c => c.category === 'metro');
          if (est && est.estimatedDuration > filters.maxCommuteMetro) keep = false;
        }
        if (filters.maxCommuteBusiness) {
          const est = snapshot.commuteHighlights.find(c => c.category === 'business_district' && c.transportMode === 'driving');
          if (est && est.estimatedDuration > filters.maxCommuteBusiness) keep = false;
        }

        if (keep) {
          filteredResults.push(item);
        }
      }
      results = filteredResults;
    }

    // Custom javascript sort fallbacks for derived attributes
    if (filters && filters.sortBy) {
      if (filters.sortBy === 'price-per-sqft') {
        results.sort((a, b) => (a.pricePerSqft || 0) - (b.pricePerSqft || 0));
      } else if (filters.sortBy === 'most-popular') {
        results.sort((a, b) => {
          const scoreA = (a.viewCount || 0) + (a.saveCount || 0) * 4;
          const scoreB = (b.viewCount || 0) + (b.saveCount || 0) * 4;
          return scoreB - scoreA;
        });
      } else if (filters.sortBy === 'recently-updated') {
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (filters.sortBy === 'area') {
        results.sort((a, b) => {
          const areaA = a.carpetArea || a.builtUpArea || 0;
          const areaB = b.carpetArea || b.builtUpArea || 0;
          return areaB - areaA;
        });
      }
    }

    return results;
  },
};
