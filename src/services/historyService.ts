import { supabase } from '../lib/supabase';
import { PropertyListing } from '../types';

export const historyService = {
  async recordView(userId: string, propertyId: string): Promise<void> {
    // 1. Upsert viewed timestamp
    const { error } = await supabase
      .from('recently_viewed')
      .upsert(
        { user_id: userId, property_id: propertyId, viewed_at: new Date().toISOString() },
        { onConflict: 'user_id,property_id' }
      );

    if (error) throw error;

    // 2. Prune old records (keep only the 10 most recent)
    try {
      const { data: records, error: listError } = await supabase
        .from('recently_viewed')
        .select('id')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false });

      if (!listError && records && records.length > 10) {
        const idsToPrune = records.slice(10).map((r: any) => r.id);
        await supabase
          .from('recently_viewed')
          .delete()
          .in('id', idsToPrune);
      }
    } catch (e) {
      console.warn('Pruning recently viewed history failed:', e);
    }
  },

  async getRecentViews(userId: string, limit: number = 10): Promise<PropertyListing[]> {
    const { data, error } = await supabase
      .from('recently_viewed')
      .select('*, properties(*, property_images(image_url), property_videos(video_url, thumbnail_url))')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data) return [];

    return data
      .filter((item: any) => item.properties && item.properties.deleted_at === null)
      .map((item: any) => {
        const p = item.properties;
        const videoRecord = p.property_videos && p.property_videos[0];
        return {
          id: p.id,
          ownerId: p.owner_id,
          title: p.title,
          description: p.description,
          price: Number(p.price),
          listingType: p.listing_type,
          city: p.city,
          locality: p.locality,
          address: p.address,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          furnishing: p.furnishing,
          thumbnailUrl: videoRecord?.thumbnail_url || p.thumbnail_url,
          videoUrl: videoRecord?.video_url || '',
          createdAt: p.created_at,
          imageUrls: p.property_images ? p.property_images.map((img: any) => img.image_url) : [],
          amenities: p.amenities,
          viewCount: p.view_count || 0,
        };
      });
  },
};
