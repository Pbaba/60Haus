import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '../../../theme';
import { Collection } from '../../../types';
import { Folder } from 'lucide-react-native';

interface CollectionCardProps {
  collection: Collection;
  onPress: (collection: Collection) => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Theme.spacing.md * 3) / 2;

export const CollectionCard: React.FC<CollectionCardProps> = ({ collection, onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(collection)}
      style={styles.container}
    >
      <View style={styles.imageContainer}>
        {collection.coverImageUrl ? (
          <Image
            source={{ uri: collection.coverImageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Folder size={32} color={Theme.colors.textSecondary} opacity={0.5} />
          </View>
        )}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{collection.propertiesCount || 0}</Text>
        </View>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>{collection.name}</Text>
        {collection.description ? (
          <Text style={styles.description} numberOfLines={1}>{collection.description}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginBottom: Theme.spacing.md,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Theme.colors.backgroundSecondary,
    marginBottom: Theme.spacing.sm,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
  },
  countText: {
    color: '#fff',
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  infoContainer: {
    paddingHorizontal: 4,
  },
  title: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textPrimary,
    marginBottom: 2,
  },
  description: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
  },
});
