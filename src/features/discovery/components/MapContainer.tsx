import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { PropertyListing } from '../../../types';
import { Theme } from '../../../theme';
import { Image } from 'expo-image';
import { formatCurrency } from '../../../utils';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

interface MapContainerProps {
  properties: PropertyListing[];
}


export const MapContainer: React.FC<MapContainerProps> = ({ properties }) => {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);

  // Center map on the first property or a default location (e.g. Mumbai)
  const initialRegion = {
    latitude: properties[0]?.latitude || 19.0760,
    longitude: properties[0]?.longitude || 72.8777,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  useEffect(() => {
    if (properties.length > 0 && mapRef.current) {
      const coords = properties
        .filter(p => p.latitude && p.longitude)
        .map(p => ({ latitude: p.latitude!, longitude: p.longitude! }));
      
      if (coords.length > 0) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 50, right: 50, bottom: 200, left: 50 },
          animated: true,
        });
      }
    }
  }, [properties]);

  const handleMarkerPress = (property: PropertyListing) => {
    setSelectedProperty(property);
  };

  const handlePreviewPress = () => {
    if (selectedProperty) {
      router.push(`/property/${selectedProperty.id}`);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT} // Apple Maps on iOS, Google on Android
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelectedProperty(null)}
      >
        {properties.map(property => {
          if (!property.latitude || !property.longitude) return null;
          
          const isSelected = selectedProperty?.id === property.id;
          
          return (
            <Marker
              key={property.id}
              coordinate={{ latitude: property.latitude, longitude: property.longitude }}
              onPress={(e) => {
                e.stopPropagation();
                handleMarkerPress(property);
              }}
              style={{ zIndex: isSelected ? 10 : 1 }}
            >
              <View style={[styles.markerContainer, isSelected && styles.markerSelected]}>
                <Text style={[styles.markerText, isSelected && styles.markerTextSelected]}>
                  {formatCurrency(property.price)}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Bottom Preview Card */}
      {selectedProperty && (
        <Animated.View 
          entering={FadeInDown.springify()} 
          exiting={FadeOutDown}
          style={styles.previewContainer}
        >
          <TouchableOpacity 
            activeOpacity={0.9} 
            style={styles.previewCard}
            onPress={handlePreviewPress}
          >
            <Image 
              source={{ uri: selectedProperty.thumbnailUrl || selectedProperty.imageUrls?.[0] }} 
              style={styles.previewImage}
              contentFit="cover"
            />
            <View style={styles.previewInfo}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewPrice}>{formatCurrency(selectedProperty.price)}</Text>
                <Text style={styles.previewType}>{selectedProperty.listingType === 'rent' ? '/mo' : ''}</Text>
              </View>
              <Text style={styles.previewTitle} numberOfLines={1}>{selectedProperty.title}</Text>
              <Text style={styles.previewSpecs} numberOfLines={1}>
                {selectedProperty.bedrooms} BHK • {selectedProperty.locality}, {selectedProperty.city}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  markerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  markerSelected: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
    transform: [{ scale: 1.1 }],
  },
  markerText: {
    fontSize: 12,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textPrimary,
  },
  markerTextSelected: {
    color: '#fff',
  },
  previewContainer: {
    position: 'absolute',
    bottom: 90, // Above MapToggle and Tabs
    left: Theme.spacing.md,
    right: Theme.spacing.md,
    zIndex: 50,
  },
  previewCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    flexDirection: 'row',
    padding: Theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  previewInfo: {
    flex: 1,
    marginLeft: Theme.spacing.md,
    justifyContent: 'center',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textPrimary,
  },
  previewType: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    marginLeft: 2,
  },
  previewTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.textSecondary,
    marginBottom: 4,
  },
  previewSpecs: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
  },
});
