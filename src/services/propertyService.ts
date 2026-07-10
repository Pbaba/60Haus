import { supabase } from '../lib/supabase';
import { PropertyListing } from '../types';

export const propertyService = {
  async createListing(
    listing: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUrl?: string,
    generatedThumbnailUrl?: string
  ): Promise<PropertyListing> {
    // 1. Insert Core Property listing
    const { data: propData, error: propError } = await supabase
      .from('properties')
      .insert({
        owner_id: listing.ownerId,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        listing_type: listing.listingType,
        city: listing.city,
        address: listing.address,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        furnishing: listing.furnishing,
        thumbnail_url: generatedThumbnailUrl || listing.thumbnailUrl,
        amenities: listing.amenities || [],
      })
      .select()
      .single();

    if (propError) throw propError;

    // 2. Insert Normalized Gallery Images
    if (imageUrls && imageUrls.length > 0) {
      const imgPayloads = imageUrls.map((url, index) => ({
        property_id: propData.id,
        image_url: url,
        display_order: index,
      }));

      const { error: imgError } = await supabase
        .from('property_images')
        .insert(imgPayloads);

      if (imgError) throw imgError;
    }

    // 3. Insert Normalized Listing Video
    if (videoUrl) {
      const { error: videoError } = await supabase
        .from('property_videos')
        .insert({
          property_id: propData.id,
          video_url: videoUrl,
          thumbnail_url: generatedThumbnailUrl || listing.thumbnailUrl,
          processing_status: 'completed',
        });

      if (videoError) throw videoError;
    }

    return {
      id: propData.id,
      ownerId: propData.owner_id,
      title: propData.title,
      description: propData.description,
      price: Number(propData.price),
      listingType: propData.listing_type,
      city: propData.city,
      address: propData.address,
      bedrooms: propData.bedrooms,
      bathrooms: propData.bathrooms,
      furnishing: propData.furnishing,
      thumbnailUrl: generatedThumbnailUrl || propData.thumbnail_url,
      videoUrl: videoUrl || '',
      createdAt: propData.created_at,
      imageUrls,
      amenities: propData.amenities,
    };
  },

  async updateListing(
    id: string,
    updates: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUrl?: string,
    generatedThumbnailUrl?: string
  ): Promise<PropertyListing> {
    // 1. Update Core parameters
    const { data: propData, error: propError } = await supabase
      .from('properties')
      .update({
        title: updates.title,
        description: updates.description,
        price: updates.price,
        listing_type: updates.listingType,
        city: updates.city,
        address: updates.address,
        bedrooms: updates.bedrooms,
        bathrooms: updates.bathrooms,
        furnishing: updates.furnishing,
        thumbnail_url: generatedThumbnailUrl || updates.thumbnailUrl,
        status: updates.status || 'published',
      })
      .eq('id', id)
      .select()
      .single();

    if (propError) throw propError;

    // 2. Refresh Gallery images
    const { error: deleteImgError } = await supabase
      .from('property_images')
      .delete()
      .eq('property_id', id);

    if (deleteImgError) throw deleteImgError;

    if (imageUrls && imageUrls.length > 0) {
      const imgPayloads = imageUrls.map((url, index) => ({
        property_id: id,
        image_url: url,
        display_order: index,
      }));

      const { error: imgError } = await supabase
        .from('property_images')
        .insert(imgPayloads);

      if (imgError) throw imgError;
    }

    // 3. Refresh Listing videos
    if (videoUrl) {
      const { error: deleteVideoError } = await supabase
        .from('property_videos')
        .delete()
        .eq('property_id', id);

      if (deleteVideoError) throw deleteVideoError;

      const { error: videoError } = await supabase
        .from('property_videos')
        .insert({
          property_id: id,
          video_url: videoUrl,
          thumbnail_url: generatedThumbnailUrl || updates.thumbnailUrl,
          processing_status: 'completed',
        });

      if (videoError) throw videoError;
    }

    return {
      id: propData.id,
      ownerId: propData.owner_id,
      title: propData.title,
      description: propData.description,
      price: Number(propData.price),
      listingType: propData.listing_type,
      city: propData.city,
      address: propData.address,
      bedrooms: propData.bedrooms,
      bathrooms: propData.bathrooms,
      furnishing: propData.furnishing,
      thumbnailUrl: generatedThumbnailUrl || propData.thumbnail_url,
      videoUrl: videoUrl || '',
      createdAt: propData.created_at,
      status: propData.status,
      imageUrls,
      amenities: propData.amenities,
    };
  },

  async getOwnerListings(ownerId: string): Promise<PropertyListing[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(image_url), property_videos(video_url, thumbnail_url)')
      .eq('owner_id', ownerId)
      .is('deleted_at', null) // Filter out soft deletes
      .order('created_at', { ascending: false });

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
        status: item.status,
        imageUrls: item.property_images ? item.property_images.map((img: any) => img.image_url) : [],
        amenities: item.amenities,
        viewCount: item.view_count || 0,
      };
    });
  },

  async deleteListing(id: string): Promise<void> {
    // Soft delete: set deleted_at instead of hard delete
    const { error } = await supabase
      .from('properties')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async incrementViewCount(id: string): Promise<void> {
    try {
      const { data: prop } = await supabase
        .from('properties')
        .select('view_count')
        .eq('id', id)
        .single();

      const current = prop?.view_count || 0;
      await supabase
        .from('properties')
        .update({ view_count: current + 1 })
        .eq('id', id);
    } catch (e) {
      console.warn('Failed to increment view count:', e);
    }
  },
};
