import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { FeedbackState } from '../../components/FeedbackState';
import { Skeleton } from '../../components/Skeleton';
import { Theme } from '../../theme';
import { useProperties } from '../../hooks/useProperties';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { formatCurrency } from '../../utils';
import { Trash2 } from 'lucide-react-native';

export default function SavedScreen() {
  const router = useRouter();
  const { savedProperties, toggleSave, loading, fetchFeed } = useProperties();
  const { user, isGuest } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleRetry = async () => {
    setError(false);
    setLocalLoading(true);
    try {
      await fetchFeed();
    } catch {
      setError(true);
    } finally {
      setLocalLoading(false);
    }
  };

  const renderItem = useCallback(({ item }: { item: typeof savedProperties[0] }) => (
    <Card elevated={false} style={styles.card}>
      <Image
        source={{ uri: item.thumbnailUrl }}
        style={styles.cardImage}
        contentFit="cover"
      />
      <View style={styles.cardDetails}>
        <View style={styles.row}>
          <Text style={styles.price}>{formatCurrency(item.price)}/mo</Text>
          <TouchableOpacity
            onPress={() => toggleSave(item.id)}
            style={styles.deleteBtn}
          >
            <Trash2 size={18} color={Theme.colors.danger} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.location}>{item.address}, {item.city}</Text>
        
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {item.bedrooms} BHK  •  {item.bathrooms} Bath  •  {item.furnishing.replace('-', ' ')}
          </Text>
        </View>
      </View>
    </Card>
  ), [toggleSave]);

  const renderSkeletons = () => (
    <View style={styles.skeletonList}>
      {[1, 2, 3].map((key) => (
        <Card key={key} elevated={false} style={styles.card}>
          <Skeleton height={160} width="100%" />
          <View style={styles.cardDetails}>
            <View style={styles.row}>
              <Skeleton height={24} width="40%" />
              <Skeleton height={24} width={24} />
            </View>
            <Skeleton height={20} width="80%" style={{ marginTop: 8 }} />
            <Skeleton height={16} width="60%" style={{ marginTop: 4 }} />
            <View style={[styles.metaRow, { borderTopWidth: 0 }]}>
              <Skeleton height={14} width="50%" />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );

  if (isGuest || !user) {
    return (
      <ScreenContainer style={styles.container}>
        <FeedbackState
          type="empty-saved"
          title="Sign In to Save Properties"
          subtitle="Keep track of your favorite home walkthroughs by creating an account."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Homes</Text>
        <Text style={styles.headerSub}>
          {loading || localLoading ? 'Loading saved items...' : `${savedProperties.length} properties bookmarked`}
        </Text>
      </View>

      {error ? (
        <FeedbackState type="error" onRetry={handleRetry} />
      ) : loading || localLoading ? (
        renderSkeletons()
      ) : savedProperties.length > 0 ? (
        <FlatList
          data={savedProperties}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FeedbackState
          type="empty-saved"
          title="You haven't saved any homes yet."
          onRetry={() => router.replace('/(tabs)' as any)}
          actionText="Browse Properties"
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.md,
  },
  headerTitle: {
    fontSize: Theme.typography.sizes.h1,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
  },
  headerSub: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: Theme.spacing.xs,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.floatingDock.height + Theme.spacing.xxxl,
    gap: Theme.spacing.lg,
  },
  skeletonList: {
    paddingHorizontal: Theme.spacing.xl,
    gap: Theme.spacing.lg,
  },
  card: {
    padding: 0,
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Theme.colors.surface,
    borderColor: Theme.colors.border,
    borderWidth: 1,
  },
  cardImage: {
    height: 160,
    width: '100%',
  },
  cardDetails: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: Theme.typography.sizes.xl,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  deleteBtn: {
    padding: Theme.spacing.xs,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    marginTop: Theme.spacing.xs,
  },
  location: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  metaRow: {
    marginTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: Theme.spacing.sm,
  },
  metaText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'capitalize',
  },
});
