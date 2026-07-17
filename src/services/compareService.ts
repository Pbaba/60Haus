import { PropertyListing } from '../types';
import { NeighborhoodSnapshot } from '../domain/location';

export interface ComparisonValue {
  propertyId: string;
  rawValue: any;
  formattedValue: string;
  isBest?: boolean;
}

export interface ComparisonRow {
  label: string;
  key: string;
  values: ComparisonValue[];
}

export interface ComparisonCategory {
  title: string;
  rows: ComparisonRow[];
}

export interface AmenitiesMatrix {
  shared: string[];
  missing: { [propertyId: string]: string[] };
  unique: { [propertyId: string]: string[] };
}

export interface ComparisonModel {
  properties: PropertyListing[];
  categories: ComparisonCategory[];
  amenitiesMatrix: AmenitiesMatrix;
}

// In-memory cache for computed comparisons
const comparisonCache = new Map<string, ComparisonModel>();

export const compareService = {
  /**
   * Generates a cache key based on sorted, comma-joined property IDs.
   */
  getCacheKey(properties: PropertyListing[]): string {
    return properties
      .map((p) => p.id)
      .sort()
      .join(',');
  },

  /**
   * Clears the comparison calculations cache.
   */
  clearCache(): void {
    comparisonCache.clear();
  },

  /**
   * Builds the comprehensive side-by-side comparison model.
   * Caches results to avoid repeated calculations.
   */
  buildComparisonModel(
    properties: PropertyListing[],
    snapshots: { [propertyId: string]: NeighborhoodSnapshot },
  ): ComparisonModel {
    if (properties.length === 0) {
      return { properties: [], categories: [], amenitiesMatrix: { shared: [], missing: {}, unique: {} } };
    }

    const cacheKey = this.getCacheKey(properties);
    if (comparisonCache.has(cacheKey)) {
      if (__DEV__) {
        console.log('[CompareService] Returning cached comparison model for:', cacheKey);
      }
      return comparisonCache.get(cacheKey)!;
    }

    const ids = properties.map((p) => p.id);

    // Helpers to find best indices
    const getBestValueIndex = (
      vals: number[],
      comparison: 'min' | 'max',
    ): number[] => {
      if (vals.length === 0 || vals.every((v) => v === undefined || v === null)) return [];
      const filtered = vals.filter((v) => v !== undefined && v !== null);
      const target = comparison === 'min' ? Math.min(...filtered) : Math.max(...filtered);
      return vals
        .map((v, i) => (v === target ? i : -1))
        .filter((idx) => idx !== -1);
    };

    // 1. Build Pricing Category
    const priceRowVals = properties.map((p) => p.price);
    const bestPrices = getBestValueIndex(priceRowVals, 'min');
    const priceRow: ComparisonRow = {
      label: 'Price',
      key: 'price',
      values: properties.map((p, idx) => ({
        propertyId: p.id,
        rawValue: p.price,
        formattedValue: `$${p.price.toLocaleString()}/mo`,
        isBest: bestPrices.includes(idx),
      })),
    };

    const pricePerSqftVals = properties.map((p) => p.pricePerSqft || 0);
    const bestSqftPrices = getBestValueIndex(
      pricePerSqftVals.map((v) => (v > 0 ? v : Infinity)),
      'min',
    );
    const pricePerSqftRow: ComparisonRow = {
      label: 'Price / Sq.ft',
      key: 'price_sqft',
      values: properties.map((p, idx) => ({
        propertyId: p.id,
        rawValue: p.pricePerSqft || 0,
        formattedValue: p.pricePerSqft ? `$${p.pricePerSqft}/sqft` : 'N/A',
        isBest: pricePerSqftVals[idx] > 0 && bestSqftPrices.includes(idx),
      })),
    };

    const typeRow: ComparisonRow = {
      label: 'Transaction Type',
      key: 'listing_type',
      values: properties.map((p) => ({
        propertyId: p.id,
        rawValue: p.listingType,
        formattedValue: p.listingType === 'rent' ? 'For Rent' : 'For Sale',
      })),
    };

    const pricingCategory: ComparisonCategory = {
      title: 'Pricing',
      rows: [priceRow, pricePerSqftRow, typeRow],
    };

    // 2. Build Property Specifications Category
    const bhkRow: ComparisonRow = {
      label: 'BHK Layout',
      key: 'bedrooms',
      values: properties.map((p) => ({
        propertyId: p.id,
        rawValue: p.bedrooms,
        formattedValue: `${p.bedrooms} BHK`,
      })),
    };

    const bathRow: ComparisonRow = {
      label: 'Bathrooms',
      key: 'bathrooms',
      values: properties.map((p) => ({
        propertyId: p.id,
        rawValue: p.bathrooms,
        formattedValue: `${p.bathrooms} Bath`,
      })),
    };

    const areaVals = properties.map((p) => p.carpetArea || p.builtUpArea || 0);
    const bestAreas = getBestValueIndex(areaVals, 'max');
    const areaRow: ComparisonRow = {
      label: 'Super Area',
      key: 'area',
      values: properties.map((p, idx) => ({
        propertyId: p.id,
        rawValue: areaVals[idx],
        formattedValue: areaVals[idx] > 0 ? `${areaVals[idx]} sqft` : 'N/A',
        isBest: areaVals[idx] > 0 && bestAreas.includes(idx),
      })),
    };

    const ageRow: ComparisonRow = {
      label: 'Property Age',
      key: 'property_age',
      values: properties.map((p) => ({
        propertyId: p.id,
        rawValue: p.propertyAge,
        formattedValue: p.propertyAge !== undefined ? `${p.propertyAge} Years` : 'New',
      })),
    };

    const furnishingRow: ComparisonRow = {
      label: 'Furnishing',
      key: 'furnishing',
      values: properties.map((p) => ({
        propertyId: p.id,
        rawValue: p.furnishing,
        formattedValue: p.furnishing.replace('-', ' '),
      })),
    };

    const propertyCategory: ComparisonCategory = {
      title: 'Property details',
      rows: [bhkRow, bathRow, areaRow, ageRow, furnishingRow],
    };

    // 3. Build Intelligence Category
    const healthVals = properties.map((p) => p.healthScore || 0);
    const bestHealths = getBestValueIndex(healthVals, 'max');
    const healthRow: ComparisonRow = {
      label: 'Listing Health',
      key: 'health_score',
      values: properties.map((p, idx) => ({
        propertyId: p.id,
        rawValue: p.healthScore || 0,
        formattedValue: `${p.healthScore || 0}%`,
        isBest: healthVals[idx] > 0 && bestHealths.includes(idx),
      })),
    };

    const trustVals = properties.map((p) => p.trustSignals?.length || 0);
    const bestTrusts = getBestValueIndex(trustVals, 'max');
    const trustRow: ComparisonRow = {
      label: 'Trust Signals',
      key: 'trust_signals',
      values: properties.map((p, idx) => ({
        propertyId: p.id,
        rawValue: p.trustSignals || [],
        formattedValue: `${trustVals[idx]} Signals`,
        isBest: trustVals[idx] > 0 && bestTrusts.includes(idx),
      })),
    };

    const luxuryRow: ComparisonRow = {
      label: 'Luxury Tier',
      key: 'luxury_classification',
      values: properties.map((p) => ({
        propertyId: p.id,
        rawValue: p.luxuryClassification || 'standard',
        formattedValue: p.luxuryClassification || 'standard',
      })),
    };

    const intelCategory: ComparisonCategory = {
      title: 'Property Intelligence',
      rows: [healthRow, trustRow, luxuryRow],
    };

    // 4. Build Location & Neighborhood Category
    const getCommuteMinutes = (pId: string): number => {
      const snap = snapshots[pId];
      if (!snap || !snap.commuteHighlights || snap.commuteHighlights.length === 0) return 999;
      return snap.commuteHighlights[0].estimatedDuration;
    };
    const commuteVals = ids.map((id) => getCommuteMinutes(id));
    const bestCommutes = getBestValueIndex(commuteVals, 'min');
    const commuteRow: ComparisonRow = {
      label: 'Primary Commute',
      key: 'commute',
      values: properties.map((p, idx) => {
        const duration = commuteVals[idx];
        const snap = snapshots[p.id];
        const dest = snap?.commuteHighlights?.[0]?.destination || 'Hub';
        return {
          propertyId: p.id,
          rawValue: duration === 999 ? null : duration,
          formattedValue: duration === 999 ? 'N/A' : `${duration}m to ${dest}`,
          isBest: duration !== 999 && bestCommutes.includes(idx),
        };
      }),
    };

    const getMetroMeters = (pId: string): number => {
      const snap = snapshots[pId];
      if (!snap || !snap.nearbyPlaces) return 9999;
      const metros = snap.nearbyPlaces.filter((pl) => pl.subcategory === 'Metro Station');
      if (metros.length === 0) return 9999;
      return Math.min(...metros.map((m) => m.distance));
    };
    const metroVals = ids.map((id) => getMetroMeters(id));
    const bestMetros = getBestValueIndex(metroVals, 'min');
    const metroRow: ComparisonRow = {
      label: 'Metro Distance',
      key: 'metro_dist',
      values: properties.map((p, idx) => {
        const dist = metroVals[idx];
        return {
          propertyId: p.id,
          rawValue: dist === 9999 ? null : dist,
          formattedValue: dist === 9999 ? 'N/A' : `${dist} meters`,
          isBest: dist !== 9999 && bestMetros.includes(idx),
        };
      }),
    };

    const countPois = (pId: string, type: string): number => {
      const snap = snapshots[pId];
      if (!snap || !snap.nearbyPlaces) return 0;
      return snap.nearbyPlaces.filter((pl) => pl.subcategory === type).length;
    };

    const schoolVals = ids.map((id) => countPois(id, 'School'));
    const bestSchools = getBestValueIndex(schoolVals, 'max');
    const schoolRow: ComparisonRow = {
      label: 'Nearby Schools',
      key: 'schools_count',
      values: properties.map((p, idx) => ({
        propertyId: p.id,
        rawValue: schoolVals[idx],
        formattedValue: `${schoolVals[idx]} Schools`,
        isBest: schoolVals[idx] > 0 && bestSchools.includes(idx),
      })),
    };

    const hospitalVals = ids.map((id) => countPois(id, 'Hospital'));
    const bestHospitals = getBestValueIndex(hospitalVals, 'max');
    const hospitalRow: ComparisonRow = {
      label: 'Nearby Hospitals',
      key: 'hospitals_count',
      values: properties.map((p, idx) => ({
        propertyId: p.id,
        rawValue: hospitalVals[idx],
        formattedValue: `${hospitalVals[idx]} Hospitals`,
        isBest: hospitalVals[idx] > 0 && bestHospitals.includes(idx),
      })),
    };

    const parkVals = ids.map((id) => countPois(id, 'Park'));
    const bestParks = getBestValueIndex(parkVals, 'max');
    const parkRow: ComparisonRow = {
      label: 'Nearby Parks',
      key: 'parks_count',
      values: properties.map((p, idx) => ({
        propertyId: p.id,
        rawValue: parkVals[idx],
        formattedValue: `${parkVals[idx]} Parks`,
        isBest: parkVals[idx] > 0 && bestParks.includes(idx),
      })),
    };

    const locationCategory: ComparisonCategory = {
      title: 'Location & Connectivity',
      rows: [commuteRow, metroRow, schoolRow, hospitalRow, parkRow],
    };

    // 5. Build Amenities Matrix
    const allAmenities = Array.from(
      new Set(properties.flatMap((p) => p.amenities || [])),
    );

    const shared: string[] = [];
    const unique: { [propertyId: string]: string[] } = {};
    const missing: { [propertyId: string]: string[] } = {};

    ids.forEach((id) => {
      unique[id] = [];
      missing[id] = [];
    });

    allAmenities.forEach((amenity) => {
      const owners = properties.filter((p) => p.amenities?.includes(amenity));
      if (owners.length === properties.length) {
        shared.push(amenity);
      } else if (owners.length === 1) {
        unique[owners[0].id].push(amenity);
      } else {
        // Missing for anyone who doesn't have it
        properties.forEach((p) => {
          if (!p.amenities?.includes(amenity)) {
            missing[p.id].push(amenity);
          }
        });
      }
    });

    const model: ComparisonModel = {
      properties,
      categories: [pricingCategory, propertyCategory, intelCategory, locationCategory],
      amenitiesMatrix: { shared, missing, unique },
    };

    // Cache the model
    comparisonCache.set(cacheKey, model);

    return model;
  },
};
