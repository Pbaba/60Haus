export enum DataSource {
  MOCK = 'mock',
  CACHED = 'cached',
  GOOGLE_PLACES = 'google_places',
  OPENSTREETMAP = 'openstreetmap',
  MANUAL = 'manual',
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: 'transport' | 'education' | 'healthcare' | 'essentials' | 'lifestyle';
  subcategory: string; // e.g. 'Metro', 'School', 'Hospital', 'Cafe'
  coordinate: Coordinate;
  distance: number; // in meters
  estimatedTravelTime: number; // in minutes
  optionalRating?: number;
  source: DataSource;
}

export interface CommuteDestination {
  id: string;
  name: string;
  coordinate: Coordinate;
  category: 'city_centre' | 'airport' | 'metro' | 'business_district' | 'railway';
}

export interface CommuteEstimate {
  destination: string;
  category: 'city_centre' | 'airport' | 'metro' | 'business_district' | 'railway';
  transportMode: 'driving' | 'walking' | 'transit';
  distance: number; // in meters
  estimatedDuration: number; // in minutes
  source: DataSource;
}

export interface LocalityMetrics {
  averageSalePrice: number;
  medianSalePrice: number;
  averageRent: number;
  medianRent: number;
  averagePricePerSqft: number;
  activeListings: number;
  listingDensity: number; // listings per sq km
  source: DataSource;
}

export interface NeighborhoodSnapshot {
  nearbyPlaces: NearbyPlace[];
  commuteHighlights: CommuteEstimate[];
  localityMetrics: LocalityMetrics | null;
  lifestyleTags: string[];
}

export interface LocationProvider {
  resolveAddress(address: string, locality: string, city: string): Promise<Coordinate>;
}

export interface MapProvider {
  renderMap(
    propertyCoordinate: Coordinate,
    nearbyPlaces: NearbyPlace[],
    onMarkerSelect?: (place: NearbyPlace) => void
  ): React.ReactElement;
}
