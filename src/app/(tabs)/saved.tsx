import React, { useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { FeedbackState } from '../../components/FeedbackState';
import { Theme } from '../../theme';
import { useProperties } from '../../hooks/useProperties';
import { formatCurrency } from '../../utils';
import { Trash2 } from 'lucide-react-native';

export default function SavedScreen() {
  const { properties, savedIds, toggleSave } = useProperties();

  const savedHomes = properties.filter((item) => savedIds.includes(item.id));

  const renderItem = useCallback(({ item }: { item: typeof properties[0] }) => (
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

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Homes</Text>
        <Text style={styles.headerSub}>{savedHomes.length} properties bookmarked</Text>
      </View>

      {savedHomes.length > 0 ? (
        <FlatList
          data={savedHomes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FeedbackState type="empty-saved" />
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
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
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
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
  },
  deleteBtn: {
    padding: Theme.spacing.xs,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: Theme.typography.weights.semiBold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
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
