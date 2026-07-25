import { supabase } from '../../../lib/supabase';
import { VisitRequest, VisitStatus } from '../../../types';

export const visitRequestService = {
  async createVisitRequest(conversationId: string, buyerId: string, date: string, time: string, note?: string): Promise<VisitRequest | null> {
    const { data, error } = await supabase
      .from('visit_requests')
      .insert({
        conversation_id: conversationId,
        buyer_id: buyerId,
        requested_date: date,
        requested_time: time,
        note,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.warn('Failed to create visit request', error);
      return null;
    }

    // Insert system message about visit request (fire & forget)
    supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: buyerId,
      text: JSON.stringify(data), // Using text to store the visit request payload for now, real app would use a join or proper JSONB column
      type: 'visit_request',
      status: 'sent'
    }).then();

    return data as unknown as VisitRequest;
  },

  async updateVisitStatus(visitId: string, conversationId: string, newStatus: VisitStatus): Promise<boolean> {
    const { error } = await supabase
      .from('visit_requests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', visitId);

    if (error) {
      console.warn('Failed to update visit status', error);
      return false;
    }

    // Insert system message about the change (fire & forget)
    supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: null, // system message
      text: `Visit request ${newStatus}`,
      type: 'system',
      status: 'sent'
    }).then();

    return true;
  }
};
