import { useState, useEffect, useCallback } from 'react';
import { Conversation } from '../../../types';
import { conversationService } from '../services/conversationService';
import { useCommunication } from '../providers/CommunicationProvider';
import { useAuth } from '../../../hooks/useAuth';

export const useInbox = () => {
  const { user } = useAuth();
  const { incomingMessage } = useCommunication();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInbox = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await conversationService.getUserConversations(user.id);
    setConversations(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  // Optimistic update for incoming messages
  useEffect(() => {
    if (incomingMessage) {
      setConversations((prev) => {
        const idx = prev.findIndex(c => c.id === incomingMessage.conversation_id);
        if (idx === -1) {
          // If a completely new conversation is created, we should re-fetch.
          fetchInbox();
          return prev;
        }
        
        // Bump conversation to the top and update preview
        const updated = [...prev];
        const conv = updated.splice(idx, 1)[0];
        conv.last_message_preview = incomingMessage.type === 'text' ? incomingMessage.text : `[${incomingMessage.type}]`;
        conv.updated_at = incomingMessage.created_at;
        return [conv, ...updated];
      });
    }
  }, [incomingMessage, fetchInbox]);

  return {
    conversations,
    loading,
    refresh: fetchInbox
  };
};
