import { NearbyPlace, Coordinate, DataSource } from './interfaces';

// Helper: Haversine distance in meters
export function getDistance(c1: Coordinate, c2: Coordinate): number {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (c2.latitude - c1.latitude) * rad;
  const dLng = (c2.longitude - c1.longitude) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1.latitude * rad) * Math.cos(c2.latitude * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Map travel times: Driving (40km/h), Walking (5km/h), Transit (30km/h)
export function estimateTravelTime(distanceMeters: number, mode: 'walking' | 'driving' | 'transit'): number {
  switch (mode) {
    case 'walking':
      return Math.round(distanceMeters / (5000 / 60)); // 5 km/h
    case 'transit':
      return Math.round(distanceMeters / (30000 / 60)) + 6; // 30 km/h + 6 min wait
    case 'driving':
    default:
      return Math.round(distanceMeters / (40000 / 60)) + 2; // 40 km/h + traffic
  }
}

// Templates of places we can seed deterministically near property coords
const SEED_PLACES_TEMPLATES: {
  category: NearbyPlace['category'];
  subcategory: string;
  names: string[];
}[] = [
  { category: 'transport', subcategory: 'Metro Station', names: ['Central Line Metro', 'Blue Line Transit', 'Metro Station West', 'Junction Metro Hub'] },
  { category: 'transport', subcategory: 'Bus Stop', names: ['Local Bus Depot', 'Main Road Transit Stop', 'Locality Bus Stand'] },
  { category: 'education', subcategory: 'School', names: ['St. Xavier International School', 'City Heights Academy', 'Greenwood Global School', 'Springdale Primary School'] },
  { category: 'education', subcategory: 'College', names: ['National Institute of Tech', 'Imperial College of Science', 'Metropolitan Arts & Science'] },
  { category: 'healthcare', subcategory: 'Hospital', names: ['City Care General Hospital', 'LifeLine Multi-Specialty Clinic', 'Max Health Wellness Centre'] },
  { category: 'healthcare', subcategory: 'Pharmacy', names: ['Apollo Pharmacy Outlet', 'MedPlus Drug Store', 'Wellness Drug Pharmacy'] },
  { category: 'essentials', subcategory: 'Grocery Store', names: ['Reliance Fresh Express', 'Big Bazaar Supermarket', 'Local Corner Mart', 'Nature\'s Basket Organic'] },
  { category: 'essentials', subcategory: 'ATM', names: ['HDFC Bank ATM Lobby', 'ICICI Express ATM', 'State Bank of India cash point'] },
  { category: 'lifestyle', subcategory: 'Cafe', names: ['Blue Tokai Coffee Roasters', 'Starbucks Cafe Lounge', 'Third Wave Coffee House', 'The Local Bean Bistro'] },
  { category: 'lifestyle', subcategory: 'Gym', names: ['Gold\'s Fitness Gym', 'Cult.Fit Elite Centre', 'Core Strength Studio'] },
  { category: 'lifestyle', subcategory: 'Park', names: ['Municipal Children\'s Park', 'Joggers Green Belt', 'Locality Botanical Gardens'] },
  { category: 'lifestyle', subcategory: 'Shopping Mall', names: ['Phoenix Marketcity Galleria', 'The Grand Plaza Mall', 'Central Square Shopping Center'] },
];

export const nearbyPlacesService = {
  async getNearbyPlaces(propertyCoord: Coordinate, propertyId: string): Promise<NearbyPlace[]> {
    const seed = propertyId || `${propertyCoord.latitude}_${propertyCoord.longitude}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    const places: NearbyPlace[] = [];

    // Let's generate exactly 1-2 places from each category template deterministically
    SEED_PLACES_TEMPLATES.forEach((tmpl, index) => {
      const uniqueHash = hash + index;
      const count = (Math.abs(uniqueHash) % 2) + 1; // 1 or 2 items

      for (let k = 0; k < count; k++) {
        const itemHash = uniqueHash * (k + 1);
        
        // Offset coords from property between 150m to 1200m
        const angle = ((Math.abs(itemHash) % 360) * Math.PI) / 180;
        const radiusDeg = (150 + (Math.abs(itemHash >> 4) % 1050)) / 111300; // degrees

        const placeCoord: Coordinate = {
          latitude: Number((propertyCoord.latitude + radiusDeg * Math.sin(angle)).toFixed(6)),
          longitude: Number((propertyCoord.longitude + radiusDeg * Math.cos(angle)).toFixed(6)),
        };

        const distance = getDistance(propertyCoord, placeCoord);
        const preferredMode = distance < 600 ? 'walking' : 'driving';
        const travelTime = estimateTravelTime(distance, preferredMode);

        const nameIndex = Math.abs(itemHash >> 2) % tmpl.names.length;
        const finalName = tmpl.names[nameIndex] + (count > 1 ? ` (Sec ${k + 1})` : '');
        const rating = Number((4.0 + ((Math.abs(itemHash >> 6) % 11) / 10)).toFixed(1));

        places.push({
          id: `place_${index}_${k}_${Math.abs(itemHash).toString(16)}`,
          name: finalName,
          category: tmpl.category,
          subcategory: tmpl.subcategory,
          coordinate: placeCoord,
          distance,
          estimatedTravelTime: travelTime,
          optionalRating: rating,
          source: DataSource.MOCK,
        });
      }
    });

    // Sort by distance ascending
    return places.sort((a, b) => a.distance - b.distance);
  },
};
