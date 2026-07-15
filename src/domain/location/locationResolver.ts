import { LocationProvider, Coordinate } from './interfaces';

// Center coordinates for core localities
export const LOCALITY_COORDINATES: Record<string, Coordinate> = {
  // Mumbai
  'bandra': { latitude: 19.0607, longitude: 72.8362 },
  'bandra west': { latitude: 19.0607, longitude: 72.8362 },
  'bandra east': { latitude: 19.0617, longitude: 72.8519 },
  'juhu': { latitude: 19.1026, longitude: 72.8270 },
  'andheri': { latitude: 19.1136, longitude: 72.8697 },
  'andheri west': { latitude: 19.1171, longitude: 72.8338 },
  'andheri east': { latitude: 19.1157, longitude: 72.8715 },
  'worli': { latitude: 19.0030, longitude: 72.8172 },
  'colaba': { latitude: 18.9067, longitude: 72.8147 },
  'powai': { latitude: 19.1176, longitude: 72.9060 },
  // Bangalore
  'indiranagar': { latitude: 12.9719, longitude: 77.6412 },
  'koramangala': { latitude: 12.9352, longitude: 77.6245 },
  'whitefield': { latitude: 12.9698, longitude: 77.7500 },
  'mg road': { latitude: 12.9738, longitude: 77.6119 },
  'jayanagar': { latitude: 12.9307, longitude: 77.5824 },
  // Hyderabad
  'gachibowli': { latitude: 17.4401, longitude: 78.3489 },
  'jubilee hills': { latitude: 17.4325, longitude: 78.4070 },
  'hitech city': { latitude: 17.4483, longitude: 78.3741 },
  'banjara hills': { latitude: 17.4169, longitude: 78.4382 },
  // Pune
  'koregaon park': { latitude: 18.5362, longitude: 73.8940 },
  'kalyani nagar': { latitude: 18.5475, longitude: 73.9034 },
  'hinjewadi': { latitude: 18.5913, longitude: 73.7386 },
  'viman nagar': { latitude: 18.5679, longitude: 73.9143 },
  // Delhi / NCR
  'connaught place': { latitude: 28.6304, longitude: 77.2177 },
  'dlf phase 3': { latitude: 28.4891, longitude: 77.0886 },
  'gurgaon': { latitude: 28.4595, longitude: 77.0266 },
  'noida sector 62': { latitude: 28.6258, longitude: 77.3685 },
  'indirapuram': { latitude: 28.6375, longitude: 77.3719 },
  'indrapuri': { latitude: 23.2384, longitude: 77.4589 },
};

// Default coordinates for major cities
export const CITY_COORDINATES: Record<string, Coordinate> = {
  'mumbai': { latitude: 19.0760, longitude: 72.8777 },
  'delhi': { latitude: 28.6139, longitude: 77.2090 },
  'bangalore': { latitude: 12.9716, longitude: 77.5946 },
  'bengaluru': { latitude: 12.9716, longitude: 77.5946 },
  'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
  'pune': { latitude: 18.5204, longitude: 73.8567 },
  'chennai': { latitude: 13.0827, longitude: 80.2707 },
  'kolkata': { latitude: 22.5726, longitude: 88.3639 },
};

export class DeterministicLocationProvider implements LocationProvider {
  async resolveAddress(address: string, locality: string, city: string): Promise<Coordinate> {
    const cleanCity = city.trim().toLowerCase();
    const cleanLocality = locality.trim().toLowerCase();
    const cleanAddress = address.trim().toLowerCase();

    // 1. Match exact locality coordinates
    if (LOCALITY_COORDINATES[cleanLocality]) {
      return this.addDeterministicOffset(LOCALITY_COORDINATES[cleanLocality], cleanAddress);
    }

    // 2. Prefix / substring match of locality
    for (const [key, coord] of Object.entries(LOCALITY_COORDINATES)) {
      if (cleanLocality.includes(key) || key.includes(cleanLocality)) {
        return this.addDeterministicOffset(coord, cleanAddress);
      }
    }

    // 3. Fallback to city center coordinates
    if (CITY_COORDINATES[cleanCity]) {
      return this.addDeterministicOffset(CITY_COORDINATES[cleanCity], cleanAddress + ' ' + cleanLocality);
    }

    // 4. Default global fallback (Mumbai center)
    return this.addDeterministicOffset(CITY_COORDINATES['mumbai'], cleanAddress + ' ' + cleanCity);
  }

  // Generate a stable small geographic offset based on a string hash
  private addDeterministicOffset(center: Coordinate, seedStr: string): Coordinate {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Limit offset to approx ~500 meters (0.004 degrees latitude/longitude)
    const latOffset = ((Math.abs(hash) % 100) / 100) * 0.003 - 0.0015;
    const lngOffset = (((Math.abs(hash) >> 8) % 100) / 100) * 0.003 - 0.0015;

    return {
      latitude: Number((center.latitude + latOffset).toFixed(6)),
      longitude: Number((center.longitude + lngOffset).toFixed(6)),
    };
  }
}

export const deterministicLocationResolver = new DeterministicLocationProvider();
