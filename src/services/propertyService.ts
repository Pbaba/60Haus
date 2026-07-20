import { supabase } from '../lib/supabase';
import { PropertyListing } from '../types';
import { enrichPropertyListing } from '../utils/propertyIntelligence';
import { deterministicLocationResolver } from '../domain/location/locationResolver';

export const propertyService = {
  // Create listing placeholder record to generate ID from database
  async createListingPlaceholder(
    listing: Omit<PropertyListing, 'id' | 'createdAt'>
  ): Promise<string> {
    const resolvedCoords = await deterministicLocationResolver.resolveAddress(
      listing.address,
      listing.locality || '',
      listing.city
    );

    const { data, error } = await supabase
      .from('properties')
      .insert({
        owner_id: listing.ownerId,
        title: listing.title,
        description: listing.description || '',
        price: listing.price,
        listing_type: listing.listingType,
        city: listing.city,
        address: listing.address,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        furnishing: listing.furnishing,
        thumbnail_url: 'placeholder', // Updated later with final upload path
        amenities: listing.amenities || [],
        status: listing.status || 'published',
        property_type: listing.propertyType,
        locality: listing.locality,
        carpet_area: listing.carpetArea || null,
        built_up_area: listing.builtUpArea || null,
        super_built_up_area: listing.superBuiltUpArea || null,
        plot_area: listing.plotArea || null,
        property_age: listing.propertyAge || null,
        possession_status: listing.possessionStatus || null,
        ownership_type: listing.ownershipType || null,
        security_deposit: listing.securityDeposit || null,
        monthly_maintenance: listing.monthlyMaintenance || null,
        brokerage: listing.brokerage || null,
        lease_duration: listing.leaseDuration || null,
        available_from: listing.availableFrom || null,
        preferred_tenant: listing.preferredTenant || null,
        latitude: resolvedCoords.latitude,
        longitude: resolvedCoords.longitude,
        state: listing.state || null,
        postal_code: listing.postalCode || null,
        formatted_address: listing.formattedAddress || `${listing.address}, ${listing.locality || ''}, ${listing.city}`.replace(/,\s*,/g, ','),
      })
      .select('id')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to retrieve generated property ID.');
    return data.id;
  },

  // Save final storage URLs to the database
  async updateListingUrls(
    propertyId: string,
    imageUrls: string[],
    videoUrl?: string,
    thumbnailUrl?: string
  ): Promise<void> {
    // 1. Update parent record thumbnail URL
    const { error: propError } = await supabase
      .from('properties')
      .update({
        thumbnail_url: thumbnailUrl || imageUrls[0] || '',
      })
      .eq('id', propertyId);

    if (propError) throw propError;

    // 2. Insert normalized gallery images
    if (imageUrls && imageUrls.length > 0) {
      const imgPayloads = imageUrls.map((url, index) => ({
        property_id: propertyId,
        image_url: url,
        display_order: index,
      }));

      const { error: imgError } = await supabase
        .from('property_images')
        .insert(imgPayloads);

      if (imgError) throw imgError;
    }

    // 3. Insert walkthrough video
    if (videoUrl) {
      const { error: videoError } = await supabase
        .from('property_videos')
        .insert({
          property_id: propertyId,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl || imageUrls[0] || '',
          processing_status: 'completed',
        });

      if (videoError) throw videoError;
    }
  },

  // Get property listing by ID
  async getListing(id: string): Promise<PropertyListing | null> {
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(image_url), property_videos(video_url, thumbnail_url)')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    const videoRecord = data.property_videos && data.property_videos[0];
    
    return {
      id: data.id,
      ownerId: data.owner_id,
      title: data.title,
      description: data.description,
      price: Number(data.price),
      listingType: data.listing_type,
      city: data.city,
      address: data.address,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      furnishing: data.furnishing,
      thumbnailUrl: videoRecord?.thumbnail_url || data.thumbnail_url,
      videoUrl: videoRecord?.video_url || '',
      createdAt: data.created_at,
      imageUrls: data.property_images ? data.property_images.map((img: any) => img.image_url) : [],
      status: data.status,
      propertyType: data.property_type,
      locality: data.locality,
      lastVerifiedAt: data.last_verified_at,
      verificationDueAt: data.verification_due_at,
      nextVerificationAt: data.next_verification_at,
      verificationStatus: data.verification_status,
      verificationMissCount: data.verification_miss_count,
      healthScore: data.health_score,
      healthStatus: data.health_status,
      healthBreakdown: data.health_breakdown,
      lastIntegrityCheckAt: data.last_integrity_check_at,
    };
  },

  // Update listing status
  async updateListingStatus(id: string, status: 'pending' | 'published' | 'archived'): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  },

  // Hard delete property
  async deleteListingHard(id: string): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Retrieve Owner Dashboard metrics & listings
  async getOwnerDashboardStats(ownerId: string): Promise<{
    totalListings: number;
    publishedListings: number;
    archivedListings: number;
    totalViews: number;
    totalSaves: number;
    totalContacts: number;
    listings: PropertyListing[];
  }> {
    const listings = await this.getOwnerListings(ownerId);
    
    const published = listings.filter((l) => l.status === 'published' || !l.status);
    const archived = listings.filter((l) => l.status === 'archived');
    
    const totalViews = listings.reduce((sum, l) => sum + (l.viewCount || 0), 0);
    const totalSaves = listings.reduce((sum, l) => sum + (l.saveCount || 0), 0);
    const totalContacts = listings.reduce((sum, l) => sum + (l.contactCount || 0), 0);

    return {
      totalListings: listings.length,
      publishedListings: published.length,
      archivedListings: archived.length,
      totalViews,
      totalSaves,
      totalContacts,
      listings,
    };
  },

  // Publish listing directly
  async createListing(
    listing: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUrl?: string,
    generatedThumbnailUrl?: string
  ): Promise<PropertyListing> {
    const propertyId = await this.createListingPlaceholder(listing);
    await this.updateListingUrls(propertyId, imageUrls, videoUrl, generatedThumbnailUrl);
    
    return enrichPropertyListing({
      id: propertyId,
      ownerId: listing.ownerId,
      title: listing.title,
      description: listing.description,
      price: Number(listing.price),
      listingType: listing.listingType,
      city: listing.city,
      address: listing.address,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      furnishing: listing.furnishing,
      thumbnailUrl: generatedThumbnailUrl || imageUrls[0] || '',
      videoUrl: videoUrl || '',
      createdAt: new Date().toISOString(),
      imageUrls,
      amenities: listing.amenities,
      propertyType: listing.propertyType,
      locality: listing.locality,
      carpetArea: listing.carpetArea,
      builtUpArea: listing.builtUpArea,
      superBuiltUpArea: listing.superBuiltUpArea,
      plotArea: listing.plotArea,
      propertyAge: listing.propertyAge,
      possessionStatus: listing.possessionStatus,
      ownershipType: listing.ownershipType,
      securityDeposit: listing.securityDeposit,
      monthlyMaintenance: listing.monthlyMaintenance,
      brokerage: listing.brokerage,
      leaseDuration: listing.leaseDuration,
      availableFrom: listing.availableFrom,
      preferredTenant: listing.preferredTenant,
    });
  },

  async updateListing(
    id: string,
    updates: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUrl?: string,
    generatedThumbnailUrl?: string
  ): Promise<PropertyListing> {
    // 1. Update core details
    const resolvedCoords = await deterministicLocationResolver.resolveAddress(
      updates.address,
      updates.locality || '',
      updates.city
    );

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
        property_type: updates.propertyType,
        locality: updates.locality,
        carpet_area: updates.carpetArea || null,
        built_up_area: updates.builtUpArea || null,
        super_built_up_area: updates.superBuiltUpArea || null,
        plot_area: updates.plotArea || null,
        property_age: updates.propertyAge || null,
        possession_status: updates.possessionStatus || null,
        ownership_type: updates.ownershipType || null,
        security_deposit: updates.securityDeposit || null,
        monthly_maintenance: updates.monthlyMaintenance || null,
        brokerage: updates.brokerage || null,
        lease_duration: updates.leaseDuration || null,
        available_from: updates.availableFrom || null,
        preferred_tenant: updates.preferredTenant || null,
        latitude: resolvedCoords.latitude,
        longitude: resolvedCoords.longitude,
        state: updates.state || null,
        postal_code: updates.postalCode || null,
        formatted_address: updates.formattedAddress || `${updates.address}, ${updates.locality || ''}, ${updates.city}`.replace(/,\s*,/g, ','),
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

    return enrichPropertyListing({
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
      propertyType: propData.property_type,
      locality: propData.locality,
      carpetArea: propData.carpet_area ? Number(propData.carpet_area) : undefined,
      builtUpArea: propData.built_up_area ? Number(propData.built_up_area) : undefined,
      superBuiltUpArea: propData.super_built_up_area ? Number(propData.super_built_up_area) : undefined,
      plotArea: propData.plot_area ? Number(propData.plot_area) : undefined,
      propertyAge: propData.property_age ? Number(propData.property_age) : undefined,
      possessionStatus: propData.possession_status || undefined,
      ownershipType: propData.ownership_type || undefined,
      securityDeposit: propData.security_deposit ? Number(propData.security_deposit) : undefined,
      monthlyMaintenance: propData.monthly_maintenance ? Number(propData.monthly_maintenance) : undefined,
      brokerage: propData.brokerage ? Number(propData.brokerage) : undefined,
      leaseDuration: propData.lease_duration ? Number(propData.lease_duration) : undefined,
      availableFrom: propData.available_from || undefined,
      preferredTenant: propData.preferred_tenant || undefined,
      latitude: propData.latitude ? Number(propData.latitude) : undefined,
      longitude: propData.longitude ? Number(propData.longitude) : undefined,
      state: propData.state || undefined,
      postalCode: propData.postal_code || undefined,
      formattedAddress: propData.formatted_address || undefined,
      lastVerifiedAt: propData.last_verified_at,
      verificationDueAt: propData.verification_due_at,
      nextVerificationAt: propData.next_verification_at,
      verificationStatus: propData.verification_status,
      verificationMissCount: propData.verification_miss_count,
      healthScore: propData.health_score,
      healthStatus: propData.health_status,
      healthBreakdown: propData.health_breakdown,
      lastIntegrityCheckAt: propData.last_integrity_check_at,
    });
  },

  async getOwnerListings(ownerId: string): Promise<PropertyListing[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(image_url), property_videos(video_url, thumbnail_url)')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((item: any) => {
      const videoRecord = item.property_videos && item.property_videos[0];
      return enrichPropertyListing({
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
        saveCount: item.save_count || 0,
        contactCount: item.contact_count || 0,
        propertyType: item.property_type,
        locality: item.locality,
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
        latitude: item.latitude ? Number(item.latitude) : undefined,
        longitude: item.longitude ? Number(item.longitude) : undefined,
        state: item.state || undefined,
        postalCode: item.postal_code || undefined,
        formattedAddress: item.formatted_address || undefined,
        lastVerifiedAt: item.last_verified_at,
        verificationDueAt: item.verification_due_at,
        nextVerificationAt: item.next_verification_at,
        verificationStatus: item.verification_status,
        verificationMissCount: item.verification_miss_count,
        healthScore: item.health_score,
        healthStatus: item.health_status,
        healthBreakdown: item.health_breakdown,
        lastIntegrityCheckAt: item.last_integrity_check_at,
      });
    });
  },

  async deleteListing(id: string): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async archiveListing(id: string): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) throw error;
  },

  async restoreListing(id: string): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .update({ status: 'published' })
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

  async incrementContactCount(id: string): Promise<void> {
    try {
      const { data: prop } = await supabase
        .from('properties')
        .select('contact_count')
        .eq('id', id)
        .single();

      const current = prop?.contact_count || 0;
      await supabase
        .from('properties')
        .update({ contact_count: current + 1 })
        .eq('id', id);
    } catch (e) {
      console.warn('Failed to increment contact count:', e);
    }
  },

  async getPendingVerifications(ownerId: string): Promise<PropertyListing[]> {
    const listings = await this.getOwnerListings(ownerId);
    return listings.filter(l => 
      l.verificationStatus === 'awaiting_verification' || 
      l.verificationStatus === 'grace_period'
    );
  },

  async submitVerification(
    listingId: string, 
    ownerId: string,
    action: 'verified_available' | 'marked_sold' | 'marked_rented' | 'paused',
    currentNextVerificationAt: string
  ): Promise<void> {
    const nextDate = new Date(currentNextVerificationAt);
    nextDate.setDate(nextDate.getDate() + 7); // Increment scheduled cadence by 7 days

    let newStatus = 'active';
    let newListingStatus = undefined;

    switch (action) {
      case 'verified_available':
        newStatus = 'active';
        break;
      case 'marked_sold':
      case 'marked_rented':
        newStatus = 'active';
        newListingStatus = action === 'marked_sold' ? 'sold' : 'rented';
        break;
      case 'paused':
        newStatus = 'inactive_unverified';
        newListingStatus = 'archived';
        break;
    }

    const updatePayload: any = {
      verification_status: newStatus,
      last_verified_at: new Date().toISOString(),
      next_verification_at: nextDate.toISOString(),
    };

    if (newListingStatus) {
      updatePayload.status = newListingStatus;
    }

    const { error } = await supabase
      .from('properties')
      .update(updatePayload)
      .eq('id', listingId)
      .eq('owner_id', ownerId);

    if (error) throw error;

    // Log the history
    await supabase.from('listing_verification_history').insert({
      property_id: listingId,
      owner_id: ownerId,
      action_taken: action,
      previous_status: 'awaiting_verification', // Or grace_period, assuming backend logic could be smarter here but we log action
      new_status: newStatus
    });
  },
};
