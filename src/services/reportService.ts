import { supabase } from '../lib/supabase';

export const reportService = {
  async submitReport(propertyId: string, reason: string, details?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication is required to report listings.');

    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        property_id: propertyId,
        reason,
        details: details || '',
      });

    if (error) throw error;
  },
};
