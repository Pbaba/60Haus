import { LocalityMetrics, DataSource } from './interfaces';
import { PropertyListing } from '../../types';

export const localityIntelligence = {
  calculateLocalityMetrics(
    listings: PropertyListing[],
    localityName: string
  ): LocalityMetrics {
    const cleanLocality = localityName.trim().toLowerCase();
    
    // Filter listings in this locality
    const localListings = listings.filter(
      (p) => p.locality && p.locality.trim().toLowerCase() === cleanLocality
    );

    const activeListings = localListings.length;

    // Calculate averages & medians
    const salePrices: number[] = [];
    const rentPrices: number[] = [];
    const pricesPerSqft: number[] = [];

    localListings.forEach((p) => {
      if (p.listingType === 'buy') {
        salePrices.push(p.price);
        if (p.pricePerSqft) pricesPerSqft.push(p.pricePerSqft);
      } else {
        rentPrices.push(p.price);
      }
    });

    const averageSalePrice = salePrices.length > 0 ? Math.round(salePrices.reduce((a, b) => a + b, 0) / salePrices.length) : 0;
    const medianSalePrice = this.calculateMedian(salePrices);

    const averageRent = rentPrices.length > 0 ? Math.round(rentPrices.reduce((a, b) => a + b, 0) / rentPrices.length) : 0;
    const medianRent = this.calculateMedian(rentPrices);

    const averagePricePerSqft = pricesPerSqft.length > 0 ? Math.round(pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length) : 0;

    // Deterministic listing density: items per square kilometer
    const listingDensity = Number((activeListings / 2.5 + 1.2).toFixed(1));

    return {
      averageSalePrice,
      medianSalePrice,
      averageRent,
      medianRent,
      averagePricePerSqft,
      activeListings,
      listingDensity,
      source: DataSource.MOCK,
    };
  },

  calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const half = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[half];
    }
    return Math.round((sorted[half - 1] + sorted[half]) / 2.0);
  },
};
