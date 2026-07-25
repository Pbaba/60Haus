import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '../../../theme';
import { PropertyListing } from '../../../types';
import { formatCurrency } from '../../../utils';
import { ChevronRight, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface PropertyHeaderProps {
  property: PropertyListing;
}

export const PropertyHeader: React.FC<PropertyHeaderProps> = ({ property }) => {
  const router = useRouter();

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => router.push(`/property/${property.id}` as any)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: property.thumbnailUrl }} style={styles.image} contentFit="cover" />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
          {property.verificationStatus === 'active' && (
            <ShieldCheck size={14} color={Theme.colors.success} style={styles.badge} />
          )}
        </View>
        <Text style={styles.locality}>{property.locality || property.city}</Text>
        <Text style={styles.price}>{formatCurrency(property.price)}/mo</Text>
      </View>
      <ChevronRight size={20} color={Theme.colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.md,
    marginRight: Theme.spacing.md,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: Theme.typography.fontFamilyBold,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    flexShrink: 1,
  },
  badge: {
    marginLeft: 4,
  },
  locality: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  price: {
    fontFamily: Theme.typography.fontFamilyBold,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.primary,
    marginTop: 2,
  }
});
