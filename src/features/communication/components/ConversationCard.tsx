import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '../../../theme';
import { Conversation } from '../../../types';
import { formatCurrency } from '../../../utils';

interface ConversationCardProps {
  conversation: Conversation;
  currentUserId: string;
  onPress: () => void;
}

export const ConversationCard: React.FC<ConversationCardProps> = ({ conversation, currentUserId, onPress }) => {
  const isOwner = currentUserId === conversation.owner_id;
  const otherUser = isOwner ? conversation.buyer : conversation.owner;
  const property = conversation.property;

  if (!property || !otherUser) return null;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: property.thumbnailUrl }} style={styles.thumbnail} contentFit="cover" />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.propertyName} numberOfLines={1}>{property.title}</Text>
          <Text style={styles.timestamp}>
            {new Date(conversation.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        
        <View style={styles.subHeader}>
          <Text style={styles.otherUser} numberOfLines={1}>{otherUser.fullName || otherUser.username}</Text>
          <Text style={styles.price}>{formatCurrency(property.price)}/mo</Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.preview} numberOfLines={1}>
            {conversation.last_message_preview || 'No messages yet'}
          </Text>
          {(conversation.unread_count || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conversation.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: Theme.borderRadius.md,
    marginRight: Theme.spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  propertyName: {
    fontFamily: Theme.typography.fontFamilyBold,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  timestamp: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textMuted,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  otherUser: {
    fontFamily: Theme.typography.fontFamilyMedium,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    flex: 1,
  },
  price: {
    fontFamily: Theme.typography.fontFamilyBold,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textMuted,
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  badge: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Theme.typography.fontFamilyBold,
  }
});
