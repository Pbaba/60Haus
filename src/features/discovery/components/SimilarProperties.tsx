import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PropertyListing } from '../../../types';
import { discoveryRankingService } from '../services/discoveryRankingService';
import { PropertyCarousel } from './PropertyCarousel';
import { Theme } from '../../../theme';

interface SimilarPropertiesProps {
  property: PropertyListing;
}

export const SimilarProperties: React.FC<SimilarPropertiesProps> = ({ property }) => {
  const [similarProperties, setSimilarProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilar = async () => {
      setLoading(true);
      try {
        const results = await discoveryRankingService.getSimilarProperties(property, 6);
        setSimilarProperties(results);
      } catch (e) {
        console.warn('Failed to fetch similar properties', e);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilar();
  }, [property]); // re-fetch if property id changes

  if (loading || similarProperties.length === 0) {
    return null; // or return a skeleton loader if preferred
  }

  return (
    <View style={styles.container}>
      <PropertyCarousel
        title="Similar Properties"
        properties={similarProperties}
        emptyMessage="No similar properties found."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: Theme.spacing.lg,
  },
});
