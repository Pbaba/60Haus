import { Coordinate, NeighborhoodSnapshot } from './interfaces';
import { locationCache } from './locationCache';
import { deterministicLocationResolver } from './locationResolver';
import { nearbyPlacesService } from './nearbyPlaces';
import { commuteService } from './commuteService';
import { localityIntelligence } from './localityIntelligence';
import { PropertyListing } from '../../types';

export * from './interfaces';
export { locationCache } from './locationCache';
export { deterministicLocationResolver } from './locationResolver';
export { reactNativeMapProvider } from './maps';

export const locationDomain = {
  // Lazily resolve neighborhood snapshot for a property listing
  async getNeighborhoodSnapshot(
    property: PropertyListing,
    allListings: PropertyListing[]
  ): Promise<NeighborhoodSnapshot> {
    const cacheKey = property.id;
    const cached = locationCache.getNeighborhoodSnapshot(cacheKey);
    if (cached) {
      return cached;
    }

    // Resolve coordinates deterministically if missing
    let coord: Coordinate = { latitude: property.latitude || 0, longitude: property.longitude || 0 };
    if (!coord.latitude || !coord.longitude) {
      coord = await deterministicLocationResolver.resolveAddress(
        property.address,
        property.locality || '',
        property.city
      );
      // Keep resolved coordinates in memory
      property.latitude = coord.latitude;
      property.longitude = coord.longitude;
    }

    // 1. Load nearby places
    const nearbyPlaces = await nearbyPlacesService.getNearbyPlaces(coord, property.id);

    // 2. Load commute estimates
    const commuteHighlights = await commuteService.getCommuteEstimates(coord, property.city);

    // 3. Load locality metrics
    const metrics = property.locality
      ? localityIntelligence.calculateLocalityMetrics(allListings, property.locality)
      : null;

    // 4. Derive lifestyle tags based on local nearby characteristics
    const lifestyleTags: string[] = [];
    
    // Family Friendly: school & healthcare close by
    const hasSchool = nearbyPlaces.some(p => p.subcategory === 'School' && p.distance <= 1500);
    const hasHospital = nearbyPlaces.some(p => p.subcategory === 'Hospital' && p.distance <= 1500);
    if (hasSchool && hasHospital) {
      lifestyleTags.push('Family Friendly');
    }

    // Walkable: essentials close by
    const hasGroceryClose = nearbyPlaces.some(p => p.subcategory === 'Grocery Store' && p.distance <= 600);
    const hasCafeClose = nearbyPlaces.some(p => p.subcategory === 'Cafe' && p.distance <= 600);
    if (hasGroceryClose && hasCafeClose) {
      lifestyleTags.push('Walkable');
    }

    // Quiet Neighborhood: low listings density
    if (metrics && metrics.listingDensity < 2.0) {
      lifestyleTags.push('Quiet Neighborhood');
    }

    // Green Areas
    const hasParkClose = nearbyPlaces.some(p => p.subcategory === 'Park' && p.distance <= 600);
    if (hasParkClose) {
      lifestyleTags.push('Green Areas');
      lifestyleTags.push('Pet Friendly');
    }

    const snapshot: NeighborhoodSnapshot = {
      nearbyPlaces,
      commuteHighlights,
      localityMetrics: metrics,
      lifestyleTags,
    };

    // Store in cache
    locationCache.setNeighborhoodSnapshot(cacheKey, snapshot);

    return snapshot;
  },
};
