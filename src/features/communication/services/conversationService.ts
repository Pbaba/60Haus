import { supabase } from '../../../lib/supabase';
import { Conversation } from '../../../types';

export const conversationService = {
  async getUserConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        property:properties(*),
        owner:profiles!conversations_owner_id_fkey(*),
        buyer:profiles!conversations_buyer_id_fkey(*)
      `)
      .or(`owner_id.eq.${userId},buyer_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch user conversations', error);
      return [];
    }
    return (data || []) as unknown as Conversation[];
  },

  async findOrCreateConversation(propertyId: string, ownerId: string, buyerId: string): Promise<Conversation | null> {
    // 1. Try to find existing
    const { data: existing } = await supabase
      .from('conversations')
      .select(`
        *,
        property:properties(*),
        owner:profiles!conversations_owner_id_fkey(*),
        buyer:profiles!conversations_buyer_id_fkey(*)
      `)
      .eq('property_id', propertyId)
      .eq('buyer_id', buyerId)
      .single();

    if (existing) {
      return existing as unknown as Conversation;
    }

    // 2. Create new if not found
    const { data: newConv, error: insertError } = await supabase
      .from('conversations')
      .insert({
        property_id: propertyId,
        owner_id: ownerId,
        buyer_id: buyerId,
        lead_status: 'new_inquiry',
      })
      .select(`
        *,
        property:properties(*),
        owner:profiles!conversations_owner_id_fkey(*),
        buyer:profiles!conversations_buyer_id_fkey(*)
      `)
      .single();

    if (insertError) {
      console.warn('Failed to create conversation', insertError);
      return null;
    }

    return newConv as unknown as Conversation;
  }
};
