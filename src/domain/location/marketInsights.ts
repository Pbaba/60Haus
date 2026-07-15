import { PropertyListing } from '../../types';
import { LocalityMetrics } from './interfaces';

export interface MarketInsights {
  priceVsLocalityAveragePct: number; // e.g. -6 for 6% below average, +12 for 12% above
  sizeVsLocalityAveragePct: number;  // size comparison vs average
  qualityPercentile: number;         // health score rank percentile
}

export const marketInsights = {
  calculateMarketInsights(
    property: PropertyListing,
    metrics: LocalityMetrics,
    localityListings: PropertyListing[]
  ): MarketInsights {
    // 1. Price comparison
    const targetAvg = property.listingType === 'buy' ? metrics.averageSalePrice : metrics.averageRent;
    let priceVsLocalityAveragePct = 0;
    if (targetAvg > 0) {
      priceVsLocalityAveragePct = Math.round(((property.price - targetAvg) / targetAvg) * 100);
    }

    // 2. Size comparison
    const sizes = localityListings
      .map((p) => p.carpetArea || p.builtUpArea || 0)
      .filter((s) => s > 0);
    const avgSize = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
    const propSize = property.carpetArea || property.builtUpArea || 0;
    
    let sizeVsLocalityAveragePct = 0;
    if (avgSize > 0 && propSize > 0) {
      sizeVsLocalityAveragePct = Math.round(((propSize - avgSize) / avgSize) * 100);
    }

    // 3. Quality Percentile (based on healthScore)
    const healthScores = localityListings
      .map((p) => p.healthScore || 50)
      .sort((a, b) => b - a); // descending
    const propHealth = property.healthScore || 50;
    
    const rank = healthScores.indexOf(propHealth);
    let qualityPercentile = 15; // default top 15%
    if (healthScores.length > 0 && rank !== -1) {
      qualityPercentile = Math.max(5, Math.round(((rank + 1) / healthScores.length) * 100));
    }

    return {
      priceVsLocalityAveragePct,
      sizeVsLocalityAveragePct,
      qualityPercentile,
    };
  },
};
