import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { Message } from '../../../types';

interface CommunicationContextType {
  incomingMessage: Message | null;
  unreadCount: number;
}

const CommunicationContext = createContext<CommunicationContextType>({
  incomingMessage: null,
  unreadCount: 0,
});

export const CommunicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [incomingMessage, setIncomingMessage] = useState<Message | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Listen for new messages across all conversations (where the user is a participant)
    // Note: In a real app with RLS, the user would only receive their own messages.
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as Message;
          // We don't filter locally here because RLS handles it, but for safety in mock:
          setIncomingMessage(newMessage);
          if (newMessage.sender_id !== user.id) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <CommunicationContext.Provider value={{ incomingMessage, unreadCount }}>
      {children}
    </CommunicationContext.Provider>
  );
};

export const useCommunication = () => useContext(CommunicationContext);
