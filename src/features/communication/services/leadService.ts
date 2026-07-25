import { supabase } from '../../../lib/supabase';
import { LeadStatus } from '../../../types';

export const leadService = {
  async updateLeadStatus(conversationId: string, status: LeadStatus): Promise<boolean> {
    const { error } = await supabase
      .from('conversations')
      .update({ lead_status: status, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (error) {
      console.warn('Failed to update lead status', error);
      return false;
    }
    
    // Fire & forget system message
    supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: null,
      text: `Lead status updated to ${status.replace('_', ' ')}`,
      type: 'system',
      status: 'sent'
    }).then();

    return true;
  }
};
