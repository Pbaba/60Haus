import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { PropertyListing } from '../types';
import { Theme } from '../theme';
import { formatCurrency } from '../utils';

interface PropertyCardProps {
  property: PropertyListing;
  onPress?: () => void;
  compact?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onPress,
  compact = false,
}) => {
  return (
    <TouchableOpacity 
      style={[styles.container, compact && styles.compactContainer]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: property.thumbnailUrl || property.imageUrls?.[0] || 'https://via.placeholder.com/400' }}
        style={styles.image}
        contentFit="cover"
      />
      <View style={styles.info}>
        <Text style={styles.price}>{formatCurrency(property.price)}</Text>
        <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {property.bedrooms} BHK • {property.city}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  compactContainer: {
    width: '100%',
  },
  image: {
    width: '100%',
    height: 150,
  },
  info: {
    padding: Theme.spacing.md,
  },
  price: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  title: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.textSecondary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
  },
});
