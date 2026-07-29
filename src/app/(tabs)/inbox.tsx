import React from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Theme } from '../../theme';
import { useInbox } from '../../features/communication/hooks/useInbox';
import { useAuth } from '../../hooks/useAuth';
import { ConversationCard } from '../../features/communication/components/ConversationCard';
import { EmptyState } from '../../components/EmptyState';
import { MessageSquare } from 'lucide-react-native';
import { FeedbackState } from '../../components/FeedbackState';

export default function InboxScreen() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const { conversations, loading, refresh } = useInbox();

  if (isGuest || !user) {
    return (
      <ScreenContainer style={styles.container}>
        <FeedbackState
          type="empty-saved" // Reusing this illustration style
          title="Sign In to Message"
          subtitle="Keep track of your conversations with owners and buyers by creating an account."
        />
      </ScreenContainer>
    );
  }

  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <EmptyState
        icon={MessageSquare}
        title="No Conversations Yet"
        description="When you contact an owner or receive an inquiry, your conversations will appear here."
      />
    );
  };

  return (
    <ScreenContainer style={styles.container} safeAreaBottom={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
      </View>
      
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationCard 
            conversation={item} 
            currentUserId={user.id} 
            onPress={() => router.push(`/chat/${item.id}` as any)} 
          />
        )}
        contentContainerStyle={conversations.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Theme.colors.primary} />
        }
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={renderEmptyState}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  title: {
    fontFamily: Theme.typography.fontFamilyBold,
    fontSize: Theme.typography.sizes.xxl,
    color: Theme.colors.textPrimary,
  }
});
