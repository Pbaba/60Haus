import { supabase } from '../lib/supabase';
import { PropertyListing } from '../types';

/**
 * MOCK BACKEND SERVICE
 * In production, this runs asynchronously on a backend worker or Supabase Edge Function
 * triggered by an insert/update on the `properties` or `owner_reliability_metrics` tables.
 */
export const healthScoreService = {
  
  async computeHealthScore(property: PropertyListing) {
    let score = 50;
    const breakdown: Record<string, any> = {};

    // Positive Signals
    if (property.verificationStatus === 'active') {
      score += 15;
      breakdown['verification'] = '+15 (Active)';
    }

    if (property.videoUrl) {
      score += 20;
      breakdown['media'] = '+20 (Walkthrough Video)';
    } else if (property.imageUrls && property.imageUrls.length >= 3) {
      score += 10;
      breakdown['media'] = '+10 (Good Images)';
    }

    if (property.carpetArea && property.monthlyMaintenance) {
      score += 10;
      breakdown['completeness'] = '+10 (Complete Specs)';
    }

    // Negative Signals
    if (property.verificationMissCount && property.verificationMissCount > 0) {
      const penalty = Math.min(30, property.verificationMissCount * 10);
      score -= penalty;
      breakdown['verification_misses'] = `-${penalty} (${property.verificationMissCount} misses)`;
    }

    // Reports penalty (mock - we would normally join the reports table)
    // if (reportCount > 0) score -= (reportCount * 15);

    // Normalize
    score = Math.max(0, Math.min(100, score));

    let status: 'excellent' | 'good' | 'needs_attention' | 'poor' = 'needs_attention';
    if (score >= 80) status = 'excellent';
    else if (score >= 60) status = 'good';
    else if (score < 40) status = 'poor';

    await supabase
      .from('properties')
      .update({
        health_score: score,
        health_status: status,
        health_breakdown: breakdown,
        last_integrity_check_at: new Date().toISOString()
      })
      .eq('id', property.id);
  }
};
