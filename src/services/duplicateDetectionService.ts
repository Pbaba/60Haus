import { supabase } from '../lib/supabase';
import { PropertyListing } from '../types';

/**
 * MOCK BACKEND SERVICE
 * In production, this runs asynchronously on a backend worker or Supabase Edge Function
 * triggered by an insert/update on the `properties` table.
 */
export const duplicateDetectionService = {
  
  async runDuplicateDetection(newProperty: PropertyListing) {
    // 1. Fetch active properties in the same city
    const { data: candidates, error } = await supabase
      .from('properties')
      .select('id, title, price, bedrooms, carpet_area, owner_id')
      .eq('city', newProperty.city)
      .neq('id', newProperty.id)
      .eq('status', 'published');

    if (error || !candidates) return;

    for (const candidate of candidates) {
      const score = this.calculateSimilarity(newProperty, candidate);
      
      if (score >= 0.85) {
        let confidence: 'low' | 'medium' | 'high' = 'low';
        if (score >= 0.95) confidence = 'high';
        else if (score >= 0.90) confidence = 'medium';

        // 2. Insert into duplicate_listing_candidates
        await supabase.from('duplicate_listing_candidates').insert({
          property_id: newProperty.id,
          duplicate_of_id: candidate.id,
          similarity_score: score,
          confidence_level: confidence,
          status: 'pending'
        });
      }
    }
  },

  calculateSimilarity(a: any, b: any): number {
    let score = 0;
    let weight = 0;

    // Same owner is a huge red flag
    weight += 0.3;
    if (a.ownerId === b.owner_id) score += 0.3;

    // Price similarity
    weight += 0.2;
    if (Math.abs(a.price - b.price) < (a.price * 0.05)) score += 0.2;

    // Configuration
    weight += 0.2;
    if (a.bedrooms === b.bedrooms) score += 0.2;

    // Area
    if (a.carpetArea && b.carpet_area) {
      weight += 0.15;
      if (Math.abs(a.carpetArea - b.carpet_area) < 50) score += 0.15;
    }

    return weight > 0 ? (score / weight) : 0;
  }
};
