export const AMENITY_CATEGORIES = {
  building: 'Building Amenities',
  security: 'Security Features',
  lifestyle: 'Lifestyle & Sports',
  outdoor: 'Outdoor Space',
  home: 'Home Features',
  family: 'Family & Tenant Focus',
} as const;

export const AMENITIES = [
  // Building
  { id: 'lift', category: 'building', label: 'Elevator/Lift', icon: 'ArrowUpCircle' },
  { id: 'covered-parking', category: 'building', label: 'Covered Parking', icon: 'Car' },
  { id: 'visitor-parking', category: 'building', label: 'Visitor Parking', icon: 'CarFront' },
  { id: 'ev-charging', category: 'building', label: 'EV Charging Station', icon: 'Zap' },
  { id: 'wheelchair', category: 'building', label: 'Wheelchair Friendly', icon: 'Accessibility' },
  
  // Security
  { id: 'guards', category: 'security', label: 'Security Guard', icon: 'ShieldAlert' },
  { id: 'cctv', category: 'security', label: 'CCTV surveillance', icon: 'Cctv' },
  { id: 'video-phone', category: 'security', label: 'Video Door Phone', icon: 'Tv' },
  { id: 'fire-safety', category: 'security', label: 'Fire Extinguisher/Safety', icon: 'Flame' },
  { id: 'gated', category: 'security', label: 'Gated Community', icon: 'Fence' },

  // Lifestyle
  { id: 'gym', category: 'lifestyle', label: 'Modern Gym', icon: 'Dumbbell' },
  { id: 'pool', category: 'lifestyle', label: 'Swimming Pool', icon: 'Waves' },
  { id: 'clubhouse', category: 'lifestyle', label: 'Clubhouse', icon: 'Building2' },
  { id: 'indoor-games', category: 'lifestyle', label: 'Indoor Games Arena', icon: 'Gamepad2' },
  { id: 'outdoor-sports', category: 'lifestyle', label: 'Outdoor Sports Courts', icon: 'Trophy' },
  { id: 'jogging', category: 'lifestyle', label: 'Jogging Track', icon: 'Footprints' },
  { id: 'yoga', category: 'lifestyle', label: 'Yoga & Meditation Deck', icon: 'Sprout' },
  { id: 'play-area', category: 'lifestyle', label: 'Children Play Zone', icon: 'Smile' },

  // Outdoor
  { id: 'garden', category: 'outdoor', label: 'Landscaped Garden', icon: 'Trees' },
  { id: 'terrace', category: 'outdoor', label: 'Common Terrace', icon: 'Sunset' },
  { id: 'balcony', category: 'outdoor', label: 'Balcony', icon: 'Maximize2' },
  { id: 'private-garden', category: 'outdoor', label: 'Private Garden', icon: 'Flower2' },
  { id: 'rooftop', category: 'outdoor', label: 'Rooftop Lounge Access', icon: 'Crown' },

  // Home Features
  { id: 'modular-kitchen', category: 'home', label: 'Modular Kitchen', icon: 'ChefHat' },
  { id: 'ac', category: 'home', label: 'Air Conditioning', icon: 'Wind' },
  { id: 'power-backup', category: 'home', label: '100% Power Backup', icon: 'BatteryCharging' },
  { id: 'gas-pipeline', category: 'home', label: 'Gas Pipeline Link', icon: 'FlameKindling' },
  { id: 'water-supply', category: 'home', label: '24 Hours Water Supply', icon: 'Droplets' },
  { id: 'smart-home', category: 'home', label: 'Smart Automation Features', icon: 'Smartphone' },
  { id: 'study', category: 'home', label: 'Study Room', icon: 'BookOpen' },
  { id: 'store', category: 'home', label: 'Storage Room', icon: 'Archive' },
  { id: 'servant', category: 'home', label: 'Servant Quarters', icon: 'UserCog' },

  // Family
  { id: 'pet-friendly', category: 'family', label: 'Pet Friendly', icon: 'Dog' },
  { id: 'family-friendly', category: 'family', label: 'Family Preferred', icon: 'Users' },
  { id: 'bachelor-friendly', category: 'family', label: 'Bachelors Welcome', icon: 'UserPlus' },
  { id: 'senior-friendly', category: 'family', label: 'Senior Citizen Friendly', icon: 'Heart' },
] as const;

export const TRUST_BADGES = {
  verified: { id: 'verified', label: 'Verified Owner', priority: 1, color: '#DFB978' },
  today: { id: 'today', label: 'Listed Today', priority: 2, color: '#38A169' },
  updated: { id: 'updated', label: 'Recently Updated', priority: 3, color: '#4299E1' },
  walkthrough: { id: 'walkthrough', label: 'Premium Walkthrough', priority: 4, color: '#805AD5' },
  complete: { id: 'complete', label: 'Complete Listing', priority: 5, color: '#319795' },
  popular: { id: 'popular', label: 'Popular Listing', priority: 6, color: '#DD6B20' },
  photos: { id: 'photos', label: 'Excellent Photos', priority: 7, color: '#B7791F' },
} as const;

export const DISCOVERY_WEIGHTS = {
  personalization: 0.35,
  health: 0.25,
  trust: 0.20,
  freshness: 0.20,
} as const;

export const PROPERTY_INTELLIGENCE = {
  pricing: {
    rent: {
      budget: 15000,
      midRange: 45000,
      premium: 100000,
    },
    buy: {
      budget: 5000000, // 50L
      midRange: 15000000, // 1.5Cr
      premium: 40000000, // 4Cr
    },
    luxuryThresholds: {
      rent: 75000,
      rentUltra: 150000,
      buy: 25000000, // 2.5Cr
      buyUltra: 60000000, // 6Cr
    }
  },
  area: {
    compact: 600,
    medium: 1200,
    spacious: 2400,
  }
} as const;

export const LISTING_HEALTH_CONFIG = {
  weights: {
    images: 0.20,        // 5% per image, max 4 (20%)
    video: 0.20,         // Walkthrough video present (20%)
    description: 0.15,   // > 100 chars (15%), 50-100 (10%), otherwise (5%)
    amenities: 0.15,     // 3% per amenity, max 5 (15%)
    details: 0.10,       // BHK, bathrooms, furnishing, type completed (10%)
    ownership: 0.10,     // Ownership type selected (10%)
    area: 0.10,          // Carpet or built-up area entered (10%)
  },
  boosts: {
    video: 30,           // Expected visibility improvement (%)
    images: 15,
    description: 10,
    amenities: 10,
    area: 10,
    ownership: 5,
  }
} as const;
