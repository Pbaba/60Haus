import React from 'react';
import { StyleSheet, Text, TouchableOpacity, FlatList } from 'react-native';
import { BottomSheet } from '../../../components/BottomSheet';
import { Theme } from '../../../theme';

interface QuickReplySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReply: (text: string) => void;
}

const DEFAULT_REPLIES = [
  "Yes, this property is available.",
  "Parking is included.",
  "Pets are allowed.",
  "Please schedule a visit.",
  "Thank you for your interest.",
  "I'll get back to you shortly."
];

export const QuickReplySheet: React.FC<QuickReplySheetProps> = ({ isOpen, onClose, onSelectReply }) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Quick Replies">
      <FlatList
        data={DEFAULT_REPLIES}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.replyItem}
            onPress={() => {
              onSelectReply(item);
              onClose();
            }}
          >
            <Text style={styles.replyText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  list: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  replyItem: {
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  replyText: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
  }
});
