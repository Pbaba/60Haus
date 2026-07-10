import { supabase } from '../lib/supabase';
import { PropertyListing } from '../types';
import { SearchFilters } from '../components/SearchOverlay';

export const propertySearchService = {
  async getFeedListings(
    cursor?: string,
    limit: number = 10,
    filters?: SearchFilters
  ): Promise<PropertyListing[]> {
    let query = supabase
      .from('properties')
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
      if (filters.bhk !== null) {
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
    }

    // Cursor-based Pagination
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    // Default pagination ordering
    query = query.order('created_at', { ascending: false });

    // Limit chunk size
    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    return data.map((item: any) => {
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
      };
    });
  },
};
