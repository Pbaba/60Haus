import { supabase } from '../lib/supabase';
import { PropertyReport } from '../types';

export const reportService = {
  /**
   * Submit a new listing report.
   * Supabase will handle uniqueness constraint via DB index to prevent duplicate reports.
   */
  async submitReport(propertyId: string, reason: string, details?: string): Promise<PropertyReport> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication is required to report listings.');

    const { data, error } = await supabase
      .from('listing_reports')
      .insert([
        {
          property_id: propertyId,
          reporter_id: user.id,
          reason,
          details,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Postgres unique violation code
        throw new Error('You have already reported this listing.');
      }
      throw error;
    }

    return {
      id: data.id,
      propertyId: data.property_id,
      reporterId: data.reporter_id,
      reason: data.reason,
      details: data.details,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
};
