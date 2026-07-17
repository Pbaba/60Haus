import { supabase } from '../lib/supabase';
import { Collection, CollectionProperty } from '../types';

export const collectionService = {
  /**
   * Creates a new collection for a user.
   */
  async createCollection(
    userId: string,
    name: string,
    description?: string,
  ): Promise<Collection> {
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: userId, name, description })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      createdAt: data.created_at,
    };
  },

  /**
   * Renames an existing collection.
   */
  async renameCollection(collectionId: string, name: string): Promise<void> {
    const { error } = await supabase
      .from('collections')
      .update({ name })
      .eq('id', collectionId);

    if (error) throw error;
  },

  /**
   * Deletes a collection (cascade delete will remove property mappings).
   */
  async deleteCollection(collectionId: string): Promise<void> {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId);

    if (error) throw error;
  },

  /**
   * Adds a property listing to a collection with optional notes.
   */
  async addPropertyToCollection(
    collectionId: string,
    propertyId: string,
    notes?: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('collection_properties')
      .upsert(
        { collection_id: collectionId, property_id: propertyId, notes },
        { onConflict: 'collection_id,property_id' },
      );

    if (error) throw error;
  },

  /**
   * Removes a property listing from a collection.
   */
  async removePropertyFromCollection(collectionId: string, propertyId: string): Promise<void> {
    const { error } = await supabase
      .from('collection_properties')
      .delete()
      .eq('collection_id', collectionId)
      .eq('property_id', propertyId);

    if (error) throw error;
  },

  /**
   * Updates personal notes for a property in a collection.
   */
  async updatePropertyNote(
    collectionId: string,
    propertyId: string,
    notes: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('collection_properties')
      .update({ notes })
      .eq('collection_id', collectionId)
      .eq('property_id', propertyId);

    if (error) throw error;
  },

  /**
   * Fetches all collections for a user, deriving the cover image from the first property.
   */
  async getCollections(userId: string): Promise<Collection[]> {
    const { data, error } = await supabase
      .from('collections')
      .select('*, collection_properties(property_id, properties(thumbnail_url))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((col: any) => {
      // Find the first property thumbnail_url for the cover image
      let coverImageUrl: string | undefined;
      const items = col.collection_properties || [];
      if (items.length > 0) {
        coverImageUrl = items[0]?.properties?.thumbnail_url;
      }

      return {
        id: col.id,
        userId: col.user_id,
        name: col.name,
        description: col.description,
        createdAt: col.created_at,
        propertiesCount: items.length,
        coverImageUrl,
      };
    });
  },

  /**
   * Fetches all properties mapped to a specific collection.
   */
  async getCollectionProperties(collectionId: string): Promise<CollectionProperty[]> {
    const { data, error } = await supabase
      .from('collection_properties')
      .select('*, properties(*, property_images(image_url), property_videos(video_url, thumbnail_url))')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data) return [];

    return data
      .filter((item: any) => item.properties && item.properties.deleted_at === null)
      .map((item: any) => {
        const p = item.properties;
        const videoRecord = p.property_videos && p.property_videos[0];
        return {
          id: item.id,
          collectionId: item.collection_id,
          propertyId: item.property_id,
          notes: item.notes,
          createdAt: item.created_at,
          property: {
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
            saveCount: p.save_count || 0,
            latitude: p.latitude,
            longitude: p.longitude,
            propertyType: p.property_type,
          },
        };
      });
  },
};
