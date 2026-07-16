import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Coordinate, NearbyPlace, MapProvider } from './interfaces';

// Lazily load MapView & Marker to protect startup speed
let MapView: any = null;
let Marker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const MapModule = require('react-native-maps');
  MapView = MapModule.default;
  Marker = MapModule.Marker;
} catch (e) {
  console.warn('React Native Maps module not available, using placeholder view.', e);
}

// Premium dark map layout styling
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#151518' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#151518' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#747474' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c4c4c4' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#909090' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#122014' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2b2b2b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212121' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#383838' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0d161d' }],
  },
];

export class ReactNativeMapProvider implements MapProvider {
  renderMap(
    propertyCoordinate: Coordinate,
    nearbyPlaces: NearbyPlace[],
    onMarkerSelect?: (place: NearbyPlace) => void
  ): React.ReactElement {
    if (!MapView || !propertyCoordinate) {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>Map layout is preparing or unavailable offline.</Text>
        </View>
      );
    }

    return (
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: propertyCoordinate.latitude,
          longitude: propertyCoordinate.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Main Property Marker */}
        <Marker
          coordinate={propertyCoordinate}
          title="Listing Property"
          description="Exact location"
          pinColor="#B71C1C"
        />

        {/* Nearby Markers */}
        {nearbyPlaces.map((place) => {
          let pinColor = '#3b82f6';
          if (place.category === 'healthcare') pinColor = '#10b981';
          if (place.category === 'education') pinColor = '#8b5cf6';
          if (place.category === 'lifestyle') pinColor = '#f59e0b';

          return (
            <Marker
              key={place.id}
              coordinate={place.coordinate}
              title={place.name}
              description={`${place.subcategory} • ${place.distance}m`}
              pinColor={pinColor}
              onPress={() => onMarkerSelect?.(place)}
            />
          );
        })}
      </MapView>
    );
  }
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFill,
  },
  placeholderContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#151518',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#8a8a8a',
    fontSize: 14,
    textAlign: 'center',
  },
});

export const reactNativeMapProvider = new ReactNativeMapProvider();
