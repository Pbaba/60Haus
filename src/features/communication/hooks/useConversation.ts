import { useState, useEffect, useCallback } from 'react';
import { Message, MessageType } from '../../../types';
import { messagingService } from '../services/messagingService';
import { useCommunication } from '../providers/CommunicationProvider';
import { useAuth } from '../../../hooks/useAuth';

export const useConversation = (conversationId: string) => {
  const { user } = useAuth();
  const { incomingMessage } = useCommunication();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const data = await messagingService.getMessages(conversationId);
    setMessages(data);
    if (user) {
      messagingService.markAsRead(conversationId, user.id);
    }
    setLoading(false);
  }, [conversationId, user]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    if (incomingMessage && incomingMessage.conversation_id === conversationId) {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.find(m => m.id === incomingMessage.id)) return prev;
        return [incomingMessage, ...prev]; // Assumes list is inverted (newest first)
      });
      if (user) {
        messagingService.markAsRead(conversationId, user.id);
      }
    }
  }, [incomingMessage, conversationId, user]);

  const sendMessage = async (text: string, type: MessageType = 'text') => {
    if (!user) return;
    
    // Optimistic UI
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      text,
      type,
      status: 'sending',
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [optimisticMessage, ...prev]);

    const sent = await messagingService.sendMessage(conversationId, user.id, text, type);
    
    setMessages(prev => 
      prev.map(m => m.id === optimisticMessage.id ? (sent || { ...m, status: 'failed' }) : m)
    );
  };

  return {
    messages,
    loading,
    sendMessage,
    refresh: fetchMessages
  };
};
