import { supabase } from '../../../lib/supabase';
import { Message, MessageType } from '../../../types';

export const messagingService = {
  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`*, attachments:message_attachments(*)`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn('Failed to fetch messages', error);
      return [];
    }

    return (data || []) as unknown as Message[];
  },

  async sendMessage(conversationId: string, senderId: string, text: string, type: MessageType = 'text'): Promise<Message | null> {
    // 1. Insert message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        text,
        type,
        status: 'sent'
      })
      .select(`*, attachments:message_attachments(*)`)
      .single();

    if (error) {
      console.warn('Failed to send message', error);
      return null;
    }

    // 2. Update conversation updated_at and preview (fire & forget)
    supabase.from('conversations').update({ 
      updated_at: new Date().toISOString(),
      last_message_preview: type === 'text' ? text : `[${type}]`
    }).eq('id', conversationId).then();

    return data as unknown as Message;
  },
  
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await supabase.from('conversation_participants').upsert({
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: new Date().toISOString()
    });
  }
};
