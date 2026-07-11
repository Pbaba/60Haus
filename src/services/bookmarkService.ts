import { supabase } from '../lib/supabase';
import { PropertyListing } from '../types';

export const bookmarkService = {
  async saveProperty(userId: string, propertyId: string): Promise<void> {
    const { error } = await supabase
      .from('saved_properties')
      .upsert({ user_id: userId, property_id: propertyId }, { onConflict: 'user_id,property_id' });

    if (error) throw error;
  },

  async removeSavedProperty(userId: string, propertyId: string): Promise<void> {
    const { error } = await supabase
      .from('saved_properties')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);

    if (error) throw error;
  },

  async isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('saved_properties')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('property_id', propertyId);

    if (error) throw error;
    return (count || 0) > 0;
  },

  async getSavedProperties(userId: string): Promise<PropertyListing[]> {
    const { data, error } = await supabase
      .from('saved_properties')
      .select('*, properties(*, property_images(image_url), property_videos(video_url, thumbnail_url))')
      .eq('user_id', userId);

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
