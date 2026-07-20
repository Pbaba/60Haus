import { PropertyListing } from '../types';
import { PROPERTY_INTELLIGENCE, TRUST_BADGES, LISTING_HEALTH_CONFIG } from '../constants/property';

/**
 * Calculates derived property intelligence values (Sqft prices, Tiers, Luxury status).
 */
export function calculatePropertyIntelligence(item: PropertyListing) {
  // Use carpetArea, fallback to builtUpArea, superBuiltUpArea, plotArea
  const area = item.carpetArea || item.builtUpArea || item.superBuiltUpArea || item.plotArea || 0;
  
  let pricePerSqft = 0;
  let pricePerSqm = 0;
  if (area > 0) {
    pricePerSqft = Math.round(item.price / area);
    pricePerSqm = Math.round(pricePerSqft * 10.764);
  }

  // Price Tier
  let priceTier: 'budget' | 'mid-range' | 'premium' | 'luxury' = 'budget';
  const thresholds = item.listingType === 'rent' 
    ? PROPERTY_INTELLIGENCE.pricing.rent 
    : PROPERTY_INTELLIGENCE.pricing.buy;
    
  if (item.price > thresholds.premium) {
    priceTier = 'luxury';
  } else if (item.price > thresholds.midRange) {
    priceTier = 'premium';
  } else if (item.price > thresholds.budget) {
    priceTier = 'mid-range';
  } else {
    priceTier = 'budget';
  }

  // Area Tier
  let areaTier: 'compact' | 'medium' | 'spacious' | 'villa' = 'compact';
  const areaConf = PROPERTY_INTELLIGENCE.area;
  if (area > areaConf.spacious) {
    areaTier = 'villa';
  } else if (area > areaConf.medium) {
    areaTier = 'spacious';
  } else if (area > areaConf.compact) {
    areaTier = 'medium';
  } else {
    areaTier = 'compact';
  }

  // Luxury Classification
  let luxuryClassification: 'standard' | 'luxury' | 'ultra-luxury' = 'standard';
  const luxuryLimits = PROPERTY_INTELLIGENCE.pricing.luxuryThresholds;
  
  // Luxury amenities check
  const hasLuxuryAmenities = item.amenities && (
    item.amenities.includes('pool') ||
    item.amenities.includes('gym') ||
    item.amenities.includes('clubhouse')
  );
  
  if (item.listingType === 'rent') {
    if (item.price >= luxuryLimits.rentUltra && item.videoUrl && hasLuxuryAmenities) {
      luxuryClassification = 'ultra-luxury';
    } else if (item.price >= luxuryLimits.rent && hasLuxuryAmenities) {
      luxuryClassification = 'luxury';
    }
  } else {
    if (item.price >= luxuryLimits.buyUltra && item.videoUrl && hasLuxuryAmenities) {
      luxuryClassification = 'ultra-luxury';
    } else if (item.price >= luxuryLimits.buy && hasLuxuryAmenities) {
      luxuryClassification = 'luxury';
    }
  }

  return {
    pricePerSqft,
    pricePerSqm,
    priceTier,
    areaTier,
    luxuryClassification,
  };
}

/**
 * Calculates deterministic trust signals for a property listing.
 */
export function calculateTrustSignals(item: PropertyListing): string[] {
  const signals: string[] = [];
  const now = new Date();
  const createdDate = new Date(item.createdAt);
  const diffHours = Math.abs(now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

  // 1. Verified Owner
  if (item.ownerId) {
    signals.push(TRUST_BADGES.verified.label);
  }

  // 2. Listed Today: < 24 hours
  if (diffHours < 24) {
    signals.push(TRUST_BADGES.today.label);
  } else if (diffHours < 72) {
    // 3. Recently Updated: < 72 hours
    signals.push(TRUST_BADGES.updated.label);
  }

  // 4. Premium Walkthrough
  if (item.videoUrl && item.videoUrl.trim() !== '') {
    signals.push(TRUST_BADGES.walkthrough.label);
  }

  // 5. Complete Listing
  const descriptionLength = item.description?.length || 0;
  const imageCount = item.imageUrls?.length || 0;
  const hasArea = !!(item.carpetArea || item.builtUpArea);
  const amenityCount = item.amenities?.length || 0;

  if (descriptionLength > 100 && imageCount >= 4 && hasArea && amenityCount >= 3) {
    signals.push(TRUST_BADGES.complete.label);
  }

  // 6. Popular Listing
  const popularScore = (item.viewCount || 0) + (item.saveCount || 0) * 4;
  if (popularScore > 25) {
    signals.push(TRUST_BADGES.popular.label);
  }

  // 7. Excellent Photos
  if (imageCount >= 4) {
    signals.push(TRUST_BADGES.photos.label);
  }

  return signals;
}

/**
 * Computes listing health score and dynamic improvement suggestions.
 */
export function calculateListingHealth(item: PropertyListing): {
  score: number;
  suggestions: { text: string; boost: number }[];
} {
  const weights = LISTING_HEALTH_CONFIG.weights;
  const boosts = LISTING_HEALTH_CONFIG.boosts;
  
  let scoreFraction = 0;
  const suggestions: { text: string; boost: number }[] = [];

  // 1. Images (20%)
  const imgCount = item.imageUrls?.length || 0;
  const imgFraction = Math.min(4, imgCount) * 0.05; // 5% per image, max 20%
  scoreFraction += imgFraction;
  if (imgCount < 4) {
    suggestions.push({
      text: `Add at least ${4 - imgCount} more photos of the property`,
      boost: boosts.images,
    });
  }

  // 2. Video Walkthrough (20%)
  if (item.videoUrl && item.videoUrl.trim() !== '') {
    scoreFraction += weights.video;
  } else {
    suggestions.push({
      text: 'Upload a video walkthrough',
      boost: boosts.video,
    });
  }

  // 3. Description (15%)
  const descLen = item.description?.trim().length || 0;
  if (descLen > 100) {
    scoreFraction += weights.description;
  } else if (descLen >= 50) {
    scoreFraction += 0.10;
    suggestions.push({
      text: 'Extend listing description to more than 100 characters',
      boost: boosts.description,
    });
  } else {
    scoreFraction += 0.05;
    suggestions.push({
      text: 'Write a comprehensive property description',
      boost: boosts.description,
    });
  }

  // 4. Amenities (15%)
  const amenityCount = item.amenities?.length || 0;
  const amenityFraction = Math.min(5, amenityCount) * 0.03; // 3% per amenity, max 15%
  scoreFraction += amenityFraction;
  if (amenityCount < 5) {
    suggestions.push({
      text: `Select at least ${5 - amenityCount} more amenities`,
      boost: boosts.amenities,
    });
  }

  // 5. Property Details (10%)
  const detailsCompleted = !!(item.bedrooms && item.bathrooms && item.furnishing && item.propertyType && item.city);
  if (detailsCompleted) {
    scoreFraction += weights.details;
  } else {
    suggestions.push({
      text: 'Complete all property configurations (BHK, bathrooms, furnishing)',
      boost: 5,
    });
  }

  // 6. Ownership Information (10%)
  if (item.ownershipType) {
    scoreFraction += weights.ownership;
  } else if (item.listingType === 'buy') {
    suggestions.push({
      text: 'Select property ownership type (Freehold/Leasehold)',
      boost: boosts.ownership,
    });
  } else {
    scoreFraction += weights.ownership; // Autofill ownership credit for rentals
  }

  // 7. Area Information (10%)
  const hasArea = !!(item.carpetArea || item.builtUpArea || item.superBuiltUpArea);
  if (hasArea) {
    scoreFraction += weights.area;
  } else {
    suggestions.push({
      text: 'Specify carpet or built-up area measurements',
      boost: boosts.area,
    });
  }

  const computedScore = Math.round(scoreFraction * 100);
  const finalScore = item.healthScore !== undefined ? item.healthScore : Math.min(100, Math.max(0, computedScore));

  return {
    score: finalScore,
    suggestions,
  };
}

/**
 * Enriches a raw property listing object with computed intelligence fields.
 */
export function enrichPropertyListing(item: PropertyListing): PropertyListing {
  const intel = calculatePropertyIntelligence(item);
  const trustSignals = calculateTrustSignals(item);
  const health = calculateListingHealth(item);

  return {
    ...item,
    ...intel,
    trustSignals,
    // Prefer backend computed health fields, fallback to local compute
    healthScore: item.healthScore !== undefined ? item.healthScore : health.score,
    healthSuggestions: health.suggestions,
  };
}
