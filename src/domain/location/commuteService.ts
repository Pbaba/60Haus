import { CommuteEstimate, Coordinate, CommuteDestination, DataSource } from './interfaces';
import { getDistance, estimateTravelTime } from './nearbyPlaces';

// Commute destination anchors by city
export const CITY_COMMUTE_ANCHORS: Record<string, Record<CommuteDestination['category'], Coordinate>> = {
  mumbai: {
    city_centre: { latitude: 18.9647, longitude: 72.8258 }, // South Bombay
    airport: { latitude: 19.0896, longitude: 72.8656 }, // CSIA T2
    metro: { latitude: 19.1157, longitude: 72.8715 }, // Andheri Metro
    business_district: { latitude: 19.0600, longitude: 72.8600 }, // BKC
    railway: { latitude: 18.9400, longitude: 72.8350 }, // CSMT
  },
  bangalore: {
    city_centre: { latitude: 12.9738, longitude: 77.6119 }, // MG Road
    airport: { latitude: 13.1986, longitude: 77.7066 }, // KIA
    metro: { latitude: 12.9719, longitude: 77.6412 }, // Indiranagar Metro
    business_district: { latitude: 12.9400, longitude: 77.6900 }, // Tech Parks
    railway: { latitude: 12.9780, longitude: 77.5690 }, // Majestic
  },
  hyderabad: {
    city_centre: { latitude: 17.3850, longitude: 78.4867 }, // Koti
    airport: { latitude: 17.2403, longitude: 78.4294 }, // RGIA
    metro: { latitude: 17.4483, longitude: 78.3741 }, // Hitech City Metro
    business_district: { latitude: 17.4401, longitude: 78.3489 }, // Gachibowli
    railway: { latitude: 17.4340, longitude: 78.5010 }, // Secunderabad
  },
  pune: {
    city_centre: { latitude: 18.5204, longitude: 73.8567 }, // Shivajinagar
    airport: { latitude: 18.5822, longitude: 73.9197 }, // Lohegaon
    metro: { latitude: 18.5362, longitude: 73.8940 }, // KP Station
    business_district: { latitude: 18.5913, longitude: 73.7386 }, // Hinjewadi
    railway: { latitude: 18.5280, longitude: 73.8730 }, // Pune Junction
  },
  delhi: {
    city_centre: { latitude: 28.6304, longitude: 77.2177 }, // Connaught Place
    airport: { latitude: 28.5562, longitude: 77.1000 }, // IGI T3
    metro: { latitude: 28.6258, longitude: 77.3685 }, // Sector 62 Metro
    business_district: { latitude: 28.4595, longitude: 77.0266 }, // CyberCity
    railway: { latitude: 28.6430, longitude: 77.2220 }, // New Delhi Rly
  },
};

export const commuteService = {
  async getCommuteEstimates(propertyCoord: Coordinate, city: string): Promise<CommuteEstimate[]> {
    const cleanCity = city.trim().toLowerCase();
    
    // Default fallback to mumbai if city not found
    const anchors = CITY_COMMUTE_ANCHORS[cleanCity] || CITY_COMMUTE_ANCHORS['mumbai'];
    const estimates: CommuteEstimate[] = [];

    // Calculate estimates for all destinations
    Object.entries(anchors).forEach(([catKey, destCoord]) => {
      const distance = getDistance(propertyCoord, destCoord);
      const category = catKey as CommuteDestination['category'];

      // Assign user-friendly labels
      let destName = '';
      switch (category) {
        case 'city_centre':
          destName = 'City Centre';
          break;
        case 'airport':
          destName = 'Airport Terminal';
          break;
        case 'metro':
          destName = 'Metro Station';
          break;
        case 'business_district':
          destName = 'Major Business District';
          break;
        case 'railway':
          destName = 'Railway Station';
          break;
      }

      // Add walking commute if within 1.2km, else transit and driving
      if (distance < 1200) {
        estimates.push({
          destination: destName,
          category,
          transportMode: 'walking',
          distance,
          estimatedDuration: estimateTravelTime(distance, 'walking'),
          source: DataSource.MOCK,
        });
      } else {
        estimates.push(
          {
            destination: destName,
            category,
            transportMode: 'driving',
            distance,
            estimatedDuration: estimateTravelTime(distance, 'driving'),
            source: DataSource.MOCK,
          },
          {
            destination: destName,
            category,
            transportMode: 'transit',
            distance,
            estimatedDuration: estimateTravelTime(distance, 'transit'),
            source: DataSource.MOCK,
          }
        );
      }
    });

    return estimates;
  },
};
