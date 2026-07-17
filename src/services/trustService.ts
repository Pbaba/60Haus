import { supabase } from '../lib/supabase';
import {
  PropertyListing,
  PropertyVerification,
  PriceHistoryRecord,
  PropertyActivityLog,
  ListingQualityReport,
} from '../types';
import { calculateListingHealth } from '../utils/propertyIntelligence';

export interface MarketContextModel {
  valuationCategory: 'Above market price' | 'Fairly priced' | 'Excellent value';
  valuationDescription: string;
  localAveragePrice: number;
  localPriceMin: number;
  localPriceMax: number;
  priceDiffPercentage: number;
}

export const trustService = {
  /**
   * Fetches verifications for a property, fallback to deterministic mock verifications.
   */
  async getPropertyVerifications(propertyId: string): Promise<PropertyVerification[]> {
    try {
      const { data, error } = await supabase
        .from('property_verifications')
        .select('*')
        .eq('property_id', propertyId);

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          propertyId: item.property_id,
          verificationType: item.verification_type,
          verifiedAt: item.verified_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase verifications fetch error, falling back to mock:', e);
    }

    // Deterministic mock verification fallback
    const mockTypes: ('owner' | 'documents' | 'address' | 'photos' | 'contact')[] = [
      'owner',
      'documents',
      'contact',
      'address',
    ];
    let hash = 0;
    for (let i = 0; i < propertyId.length; i++) {
      hash = propertyId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const numVerifications = Math.min(mockTypes.length, (Math.abs(hash) % 3) + 2); // 2 to 4 verifications
    const selectedTypes = mockTypes.slice(0, numVerifications);

    return selectedTypes.map((type, idx) => ({
      id: `mock-verif-${type}-${propertyId}`,
      propertyId,
      verificationType: type,
      verifiedAt: new Date(Date.now() - (idx + 1) * 24 * 60 * 60 * 1000).toISOString(),
    }));
  },

  /**
   * Fetches price history records, fallback to deterministic mock history.
   */
  async getPropertyPriceHistory(propertyId: string, currentPrice: number): Promise<PriceHistoryRecord[]> {
    try {
      const { data, error } = await supabase
        .from('property_price_history')
        .select('*')
        .eq('property_id', propertyId)
        .order('changed_at', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          propertyId: item.property_id,
          price: Number(item.price),
          changedAt: item.changed_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase price history fetch error, falling back to mock:', e);
    }

    // Deterministic mock price history: e.g. price drop of 5% 15 days ago
    let hash = 0;
    for (let i = 0; i < propertyId.length; i++) {
      hash = propertyId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hadDrop = hash % 2 === 0;

    if (hadDrop) {
      const originalPrice = Math.round((currentPrice * 1.06) / 1000) * 1000;
      return [
        {
          id: `mock-price-1-${propertyId}`,
          propertyId,
          price: originalPrice,
          changedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `mock-price-2-${propertyId}`,
          propertyId,
          price: currentPrice,
          changedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
    }

    return [
      {
        id: `mock-price-single-${propertyId}`,
        propertyId,
        price: currentPrice,
        changedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  },

  /**
   * Fetches listing activity log events, fallback to mock timeline.
   */
  async getPropertyTimeline(propertyId: string): Promise<PropertyActivityLog[]> {
    try {
      const { data, error } = await supabase
        .from('property_activity_log')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          propertyId: item.property_id,
          eventType: item.event_type,
          description: item.description,
          createdAt: item.created_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase activity log fetch error, falling back to mock:', e);
    }

    // Deterministic mock timeline
    return [
      {
        id: `mock-timeline-1-${propertyId}`,
        propertyId,
        eventType: 'listed',
        description: 'Listing initially launched on 60Haus.',
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `mock-timeline-2-${propertyId}`,
        propertyId,
        eventType: 'photos_added',
        description: 'Verified listing photos added to the gallery.',
        createdAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `mock-timeline-3-${propertyId}`,
        propertyId,
        eventType: 'verification_completed',
        description: 'Owner background check and phone verifications successfully passed.',
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `mock-timeline-4-${propertyId}`,
        propertyId,
        eventType: 'price_updated',
        description: 'Listing price adjusted to match local market rates.',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  },

  /**
   * Submits a report to property_reports table.
   */
  async submitReport(
    propertyId: string,
    reporterId: string | null,
    category: string,
    details: string
  ): Promise<void> {
    const { error } = await supabase.from('property_reports').insert({
      property_id: propertyId,
      reporter_id: reporterId,
      category,
      details,
    });
    if (error) throw error;
  },

  /**
   * Builds the multi-dimensional Listing Quality Report.
   */
  compileListingQualityReport(
    property: PropertyListing,
    verifications: PropertyVerification[]
  ): ListingQualityReport {
    // 1. Trustworthiness Score (50% verifications count, 30% profile level, 20% video presence)
    const verifTypes = verifications.map((v) => v.verificationType);
    let trustScore = verifTypes.length * 20; // 5 verifications max = 100 points
    if (property.videoUrl && property.videoUrl.trim() !== '') {
      trustScore += 10;
    }
    const trustworthinessScore = Math.min(100, Math.max(10, trustScore));

    // 2. Transparency Score (Populated optional metadata inputs)
    let transCount = 0;
    const transTotal = 5;
    if (property.ownershipType) transCount++;
    if (property.propertyAge) transCount++;
    if (property.lastInspectionDate) transCount++;
    if (property.occupancyStatus) transCount++;
    if (property.reraNumber) transCount++;
    const transparencyScore = Math.round((transCount / transTotal) * 100);

    // 3. Completeness Score (Listing details health check)
    const completenessScore = calculateListingHealth(property).score;

    // 4. Overall Score
    const overallScore = Math.round(
      trustworthinessScore * 0.4 + transparencyScore * 0.3 + completenessScore * 0.3
    );

    const explanations = [
      {
        dimension: 'trustworthiness' as const,
        title: 'Trustworthiness',
        score: trustworthinessScore,
        description:
          trustworthinessScore >= 80
            ? 'Exceptional trust rating. Property ownership documents, contact details, and address records are verified.'
            : trustworthinessScore >= 50
            ? 'Moderately trusted. Standard verification steps passed, but document checks or walkthrough verification is pending.'
            : 'Basic trust rating. Only owner phone registration completed. Request verified files from the landlord before committing.',
        whyItMatters:
          'Verifications ensure you are negotiating with the rightful owner, protecting you from rental fraud, fake listings, and phantom landlords.',
      },
      {
        dimension: 'transparency' as const,
        title: 'Transparency',
        score: transparencyScore,
        description:
          transparencyScore >= 80
            ? 'High disclosure listing. Ownership deeds, RERA filings, property age stats, and inspector reports are fully published.'
            : transparencyScore >= 50
            ? 'Satisfactory disclosure. Key details are available, but specific indicators like occupancy rates or registration certificates are missing.'
            : 'Minimal disclosure. Key legal, age, and occupancy metadata fields have not been provided by the agent/owner.',
        whyItMatters:
          'Higher transparency reduces unexpected legal surprises, helps confirm the property is free of municipal litigation, and verifies current tenancy.',
      },
      {
        dimension: 'completeness' as const,
        title: 'Completeness',
        score: completenessScore,
        description:
          completenessScore >= 80
            ? 'Comprehensive cataloging. Listing has extensive descriptions, high-resolution photography, video footage, and detailed amenity lists.'
            : completenessScore >= 50
            ? 'Adequate listing contents. Primary information is provided, but lacking walk-around video clips or descriptive summaries.'
            : 'Bare minimum details. Photos are sparse and description is missing vital details about configurations or building rules.',
        whyItMatters:
          'A complete listing helps save you unnecessary visits by letting you evaluate the home layout, neighborhood, and specs from your phone first.',
      },
    ];

    return {
      overallScore,
      trustworthinessScore,
      transparencyScore,
      completenessScore,
      explanations,
    };
  },

  /**
   * Computes market context pricing stats with quantitative percentage offsets.
   */
  getMarketContext(property: PropertyListing, allProperties: PropertyListing[]): MarketContextModel {
    // Filter properties in the same locality/city with the same BHK
    const similarListings = allProperties.filter(
      (p) =>
        p.id !== property.id &&
        p.city.toLowerCase() === property.city.toLowerCase() &&
        p.locality?.toLowerCase() === property.locality?.toLowerCase() &&
        p.bedrooms === property.bedrooms &&
        p.listingType === property.listingType
    );

    const prices = similarListings.map((p) => p.price);

    // If no local comparison listings, mock average dynamically using the listing price as a baseline
    let localAveragePrice = property.price;
    let localPriceMin = Math.round(property.price * 0.85);
    let localPriceMax = Math.round(property.price * 1.15);

    if (prices.length > 0) {
      const sum = prices.reduce((a, b) => a + b, 0);
      localAveragePrice = Math.round(sum / prices.length);
      localPriceMin = Math.min(...prices);
      localPriceMax = Math.max(...prices);
    } else {
      // Deterministic locality offset for realistic demo stats
      let offsetHash = 0;
      const locality = property.locality || '';
      for (let i = 0; i < locality.length; i++) {
        offsetHash = locality.charCodeAt(i) + ((offsetHash << 5) - offsetHash);
      }
      const variance = (Math.abs(offsetHash) % 15) - 7; // -7% to +7% price offset
      localAveragePrice = Math.round(property.price * (1 + variance / 100));
      localPriceMin = Math.round(localAveragePrice * 0.82);
      localPriceMax = Math.round(localAveragePrice * 1.18);
    }

    const priceDiff = localAveragePrice - property.price;
    const priceDiffPercentage =
      localAveragePrice > 0 ? Math.round((priceDiff / localAveragePrice) * 100) : 0;

    let valuationCategory: 'Above market price' | 'Fairly priced' | 'Excellent value' = 'Fairly priced';
    let valuationDescription = '';

    if (priceDiffPercentage > 5) {
      valuationCategory = 'Excellent value';
      valuationDescription = `${priceDiffPercentage}% below local average of ${property.locality || property.city}`;
    } else if (priceDiffPercentage < -5) {
      valuationCategory = 'Above market price';
      valuationDescription = `${Math.abs(priceDiffPercentage)}% above local average of ${property.locality || property.city}`;
    } else {
      valuationCategory = 'Fairly priced';
      valuationDescription = 'Priced in-line with similar listings in this locality';
    }

    return {
      valuationCategory,
      valuationDescription,
      localAveragePrice,
      localPriceMin,
      localPriceMax,
      priceDiffPercentage,
    };
  },
};
