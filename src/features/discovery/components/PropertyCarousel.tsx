import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { PropertyListing } from '../../../types';
import { PropertyCard } from '../../../components/PropertyCard';
import { Theme } from '../../../theme';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';

interface PropertyCarouselProps {
  title: string;
  properties: PropertyListing[];
  onViewAll?: () => void;
  emptyMessage?: string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

export const PropertyCarousel: React.FC<PropertyCarouselProps> = ({ 
  title, 
  properties, 
  onViewAll,
  emptyMessage = "No properties found." 
}) => {
  const router = useRouter();

  if (!properties || properties.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllBtn} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All</Text>
            <ArrowRight size={16} color={Theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + Theme.spacing.md}
        decelerationRate="fast"
      >
        {properties.map((property) => (
          <View key={property.id} style={{ width: CARD_WIDTH, marginRight: Theme.spacing.md }}>
            <PropertyCard 
              property={property} 
              onPress={() => router.push(`/property/${property.id}`)} 
              compact={true}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textPrimary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.primary,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.md,
  },
  emptyContainer: {
    padding: Theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.backgroundSecondary,
    marginHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
  },
});
