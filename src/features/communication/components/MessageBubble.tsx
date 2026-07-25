import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Theme } from '../../../theme';
import { Message } from '../../../types';
import { VisitRequestCard } from './VisitRequestCard';
import { Image } from 'expo-image';
import { Check, CheckCheck } from 'lucide-react-native';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onVisitAction?: (action: 'accept' | 'decline' | 'reschedule', payload?: any) => void;
  isOwner?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage, onVisitAction, isOwner }) => {
  if (message.type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  if (message.type === 'visit_request') {
    let payload;
    try {
      payload = JSON.parse(message.text);
    } catch {
      payload = null;
    }
    return (
      <View style={[styles.container, isOwnMessage ? styles.ownContainer : styles.otherContainer, { backgroundColor: 'transparent', padding: 0 }]}>
        <VisitRequestCard 
          visitRequest={payload} 
          isOwner={!!isOwner}
          onAction={onVisitAction}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, isOwnMessage ? styles.ownContainer : styles.otherContainer]}>
      {message.type === 'attachment' && message.attachments && message.attachments.length > 0 && (
        <Image 
          source={{ uri: message.attachments[0].url }} 
          style={styles.attachmentImage} 
          contentFit="cover" 
        />
      )}
      {message.text ? (
        <Text style={[styles.text, isOwnMessage ? styles.ownText : styles.otherText]}>
          {message.text}
        </Text>
      ) : null}
      
      <View style={styles.metaRow}>
        <Text style={[styles.time, isOwnMessage ? styles.ownTime : styles.otherTime]}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {isOwnMessage && (
          <View style={styles.statusIcon}>
            {message.status === 'read' ? (
              <CheckCheck size={12} color="#fff" />
            ) : (
              <Check size={12} color="rgba(255,255,255,0.7)" />
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    marginVertical: Theme.spacing.xs,
  },
  ownContainer: {
    alignSelf: 'flex-end',
    backgroundColor: Theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  otherContainer: {
    alignSelf: 'flex-start',
    backgroundColor: Theme.colors.surface,
    borderBottomLeftRadius: 4,
  },
  systemContainer: {
    alignSelf: 'center',
    marginVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.border,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  systemText: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
  },
  text: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.md,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: Theme.colors.textPrimary,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: Theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: 10,
  },
  ownTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherTime: {
    color: Theme.colors.textMuted,
  },
  statusIcon: {
    marginLeft: 2,
  }
});
