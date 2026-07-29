import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, FlatList, TextInput, 
  KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { useConversation } from '../../features/communication/hooks/useConversation';
import { useLeadManagement } from '../../features/communication/hooks/useLeadManagement';
import { MessageBubble } from '../../features/communication/components/MessageBubble';
import { PropertyHeader } from '../../features/communication/components/PropertyHeader';
import { LeadStatusChip } from '../../features/communication/components/LeadStatusChip';
import { QuickReplySheet } from '../../features/communication/components/QuickReplySheet';
import { Send, Image as ImageIcon, ArrowLeft, MoreVertical } from 'lucide-react-native';
import { supabase } from '../../lib/supabase'; // to fetch conversation context if needed
import { Conversation } from '../../types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const { messages, sendMessage } = useConversation(id as string);
  const { updateStatus, isUpdating } = useLeadManagement();
  
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isQuickReplyOpen, setIsQuickReplyOpen] = useState(false);

  useEffect(() => {
    // Fetch conversation context for header
    const fetchContext = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*, property:properties(*), owner:profiles!conversations_owner_id_fkey(*), buyer:profiles!conversations_buyer_id_fkey(*)')
        .eq('id', id)
        .single();
      if (data) {
        setConversation(data as unknown as Conversation);
      }
    };
    fetchContext();
  }, [id]);

  const isOwner = user?.id === conversation?.owner_id;
  const otherUser = isOwner ? conversation?.buyer : conversation?.owner;

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim(), 'text');
    setInputText('');
  };

  const handleVisitAction = (action: 'accept' | 'decline' | 'reschedule', payload?: any) => {
    // In a real app, call visitRequestService
    sendMessage(`Visit request ${action}ed`, 'system');
  };

  const cycleLeadStatus = async () => {
    if (!conversation || !isOwner) return;
    const statuses: any[] = ['new_inquiry', 'responded', 'visit_scheduled', 'negotiating', 'closed'];
    const currentIdx = statuses.indexOf(conversation.lead_status);
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];
    
    await updateStatus(conversation.id, nextStatus);
    setConversation(prev => prev ? { ...prev, lead_status: nextStatus } : prev);
  };

  if (!conversation || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Text style={styles.userName} numberOfLines={1}>
            {otherUser?.fullName || otherUser?.username || 'User'}
          </Text>
          <Text style={styles.userStatus}>Online</Text>
        </View>

        <TouchableOpacity style={styles.moreBtn}>
          <MoreVertical size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Property Context Header */}
      {conversation.property && (
        <PropertyHeader property={conversation.property} />
      )}

      {/* Lead Status Bar (Owner Only) */}
      {isOwner && (
        <View style={styles.leadBar}>
          <Text style={styles.leadLabel}>Lead Status:</Text>
          <LeadStatusChip 
            status={conversation.lead_status} 
            onPress={cycleLeadStatus}
            disabled={isUpdating}
          />
        </View>
      )}

      {/* Messages List */}
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        inverted
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => (
          <MessageBubble 
            message={item} 
            isOwnMessage={item.sender_id === user.id}
            isOwner={isOwner}
            onVisitAction={handleVisitAction}
          />
        )}
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews={true}
      />

      {/* Input Area */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, Theme.spacing.md) }]}>
        {isOwner && (
          <TouchableOpacity style={styles.attachBtn} onPress={() => setIsQuickReplyOpen(true)}>
            <Text style={styles.quickReplyText}>✨</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.attachBtn}>
          <ImageIcon size={24} color={Theme.colors.textSecondary} />
        </TouchableOpacity>
        
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={Theme.colors.textMuted}
            multiline
            maxLength={500}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Owner Quick Replies Sheet */}
      <QuickReplySheet 
        isOpen={isQuickReplyOpen}
        onClose={() => setIsQuickReplyOpen(false)}
        onSelectReply={(text) => {
          setInputText(text);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    zIndex: 10,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  userName: {
    fontFamily: Theme.typography.fontFamilyBold,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
  },
  userStatus: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.success,
  },
  moreBtn: {
    padding: 4,
    marginLeft: 8,
  },
  leadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  leadLabel: {
    fontFamily: Theme.typography.fontFamilyMedium,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
  },
  messageList: {
    padding: Theme.spacing.md,
    gap: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  attachBtn: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickReplyText: {
    fontSize: 20,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: 20,
    marginHorizontal: Theme.spacing.sm,
    marginBottom: 8,
    minHeight: 40,
    maxHeight: 100,
    justifyContent: 'center',
  },
  input: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sendBtnDisabled: {
    backgroundColor: Theme.colors.border,
  }
});
