import React from 'react';
import { StyleSheet, Text, View, Share, BackHandler, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { Theme } from '../../theme';
import { CheckCircle, Share2, Compass, Eye } from 'lucide-react-native';
import { useProperties } from '../../hooks/useProperties';

export default function PublishSuccessScreen() {
  const router = useRouter();
  const { setFilters } = useProperties();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    price: string;
    city: string;
    locality?: string;
    propertyType: string;
    bedrooms: string;
    furnishing: string;
    listingType: 'rent' | 'buy';
  }>();

  // Prevent back action from returning to the upload form page
  React.useEffect(() => {
    const onBackPress = () => {
      router.replace('/(tabs)/profile' as any);
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [router]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my new listing: "${params.title}" in ${params.locality || params.city} on 60Haus! https://60haus.app/property/${params.id}`,
        title: '60Haus Listing',
      });
    } catch (e) {
      console.warn('Share sheet failed:', e);
    }
  };

  const handleViewSimilar = () => {
    const listingPrice = parseFloat(params.price) || 0;
    // Derive price range of similar properties at +/- 20%
    const minPrice = Math.round(listingPrice * 0.8);
    const maxPrice = Math.round(listingPrice * 1.2);

    setFilters({
      city: params.city || 'Mumbai',
      localities: params.locality ? [params.locality] : undefined,
      bhk: params.bedrooms ? parseInt(params.bedrooms) : null,
      propertyType: params.propertyType || null,
      minPrice,
      maxPrice,
      listingType: params.listingType || 'rent',
      furnishing: (params.furnishing as any) || null,
      petFriendly: false,
    });

    // Navigate to Search filters page or Feed main
    router.replace('/(tabs)' as any);
  };

  return (
    <ScreenContainer style={styles.container} scrollable>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <CheckCircle size={64} color={Theme.colors.primary} />
        </View>

        <Text style={styles.title}>Listing Published!</Text>
        <Text style={styles.description}>
          Your listing has been successfully transcoded, validated, and published to the live 60Haus marketplace.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {params.title}
          </Text>
          <Text style={styles.cardSub}>
            {params.locality ? `${params.locality}, ` : ''}
            {params.city}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            variant="primary"
            style={styles.btn}
            onPress={() => router.push(`/property/${params.id}` as any)}
          >
            <View style={styles.btnContent}>
              <Eye size={18} color={Theme.colors.background} />
              <Text style={styles.btnText}>View Listing</Text>
            </View>
          </Button>

          <Button
            variant="secondary"
            style={styles.btn}
            onPress={handleShare}
          >
            <View style={styles.btnContent}>
              <Share2 size={18} color={Theme.colors.textPrimary} />
              <Text style={styles.btnSecondaryText}>Share Listing</Text>
            </View>
          </Button>

          <Button
            variant="secondary"
            style={styles.btn}
            onPress={handleViewSimilar}
          >
            <View style={styles.btnContent}>
              <Compass size={18} color={Theme.colors.textPrimary} />
              <Text style={styles.btnSecondaryText}>View Similar Properties</Text>
            </View>
          </Button>
        </View>

        <TouchableOpacity
          style={styles.doneLink}
          onPress={() => router.replace('/(tabs)/profile' as any)}
        >
          <Text style={styles.doneText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

// Inline Touchables override for styling standard done links

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.xxl,
    gap: Theme.spacing.md,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(212, 163, 89, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.sizes.h1,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: '#151518',
    borderRadius: 12,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textPrimary,
  },
  cardSub: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    marginTop: 4,
  },
  actions: {
    width: '100%',
    gap: Theme.spacing.md,
  },
  btn: {
    width: '100%',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  btnText: {
    color: Theme.colors.background,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  btnSecondaryText: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  doneLink: {
    marginTop: Theme.spacing.xl,
    padding: Theme.spacing.sm,
  },
  doneText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
});
