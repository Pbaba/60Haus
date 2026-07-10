import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { useProperties } from '../../hooks/useProperties';
import { Theme } from '../../theme';
import { formatCurrency } from '../../utils';
import { ArrowLeft, MapPin } from 'lucide-react-native';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { properties } = useProperties();

  const property = properties.find((p) => p.id === id);

  if (!property) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.errorText}>Property listing not found.</Text>
        <Button variant="secondary" onPress={() => router.back()}>
          Go Back
        </Button>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {property.title}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Image
          source={{ uri: property.thumbnailUrl }}
          style={styles.heroImage}
          contentFit="cover"
        />
        
        <View style={styles.body}>
          <Text style={styles.price}>
            {formatCurrency(property.price)}
            <Text style={styles.perMonth}>/month</Text>
          </Text>
          <Text style={styles.location}>
            <MapPin size={14} color={Theme.colors.textSecondary} /> {property.address}, {property.city}
          </Text>

          <View style={styles.specs}>
            <View style={styles.specItem}>
              <Text style={styles.specValue}>{property.bedrooms} BHK</Text>
              <Text style={styles.specLabel}>Configuration</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specValue}>{property.bathrooms}</Text>
              <Text style={styles.specLabel}>Bathrooms</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specValue}>1,450 sq ft</Text>
              <Text style={styles.specLabel}>Size</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.desc}>{property.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenities}>
              {['WiFi Connection', 'Swimming Pool', 'Gymnasium', 'Reserved Parking'].map((a) => (
                <View key={a} style={styles.amenityChip}>
                  <Text style={styles.amenityText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Listing Agent</Text>
            <View style={styles.ownerCard}>
              <Avatar
                name="Vikram Malhotra"
                source="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80"
                size="md"
              />
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>Vikram Malhotra</Text>
                <Text style={styles.ownerTitle}>Property Owner / Manager</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Map</Text>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>
                [ Satellite Map Location View ]
              </Text>
            </View>
          </View>

          <Button
            variant="primary"
            style={styles.contactBtn}
            onPress={() => alert(`Connecting you to owner for ${property.title}`)}
          >
            Contact Owner
          </Button>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
  },
  errorText: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    gap: Theme.spacing.md,
  },
  backBtn: {
    padding: Theme.spacing.xs,
  },
  headerTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Theme.spacing.xxxl,
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  body: {
    paddingVertical: Theme.spacing.lg,
    gap: Theme.spacing.lg,
  },
  price: {
    fontSize: 26,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
  },
  perMonth: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontWeight: Theme.typography.weights.regular,
  },
  location: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -Theme.spacing.md,
  },
  specs: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  specItem: {
    alignItems: 'center',
    gap: 2,
  },
  specValue: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  specLabel: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  section: {
    gap: Theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    lineHeight: 22,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  amenityChip: {
    backgroundColor: Theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.full,
  },
  amenityText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  ownerTitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  mapPlaceholder: {
    height: 140,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
  },
  contactBtn: {
    width: '100%',
    marginTop: Theme.spacing.sm,
  },
});
