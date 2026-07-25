import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Map, List } from 'lucide-react-native';
import { Theme } from '../../../theme';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

interface MapToggleProps {
  isMapView: boolean;
  onToggle: () => void;
}

export const MapToggle: React.FC<MapToggleProps> = ({ isMapView, onToggle }) => {
  return (
    <Animated.View 
      entering={FadeInUp.delay(300)} 
      exiting={FadeOutDown}
      style={styles.container}
    >
      <TouchableOpacity 
        style={styles.button} 
        activeOpacity={0.8} 
        onPress={onToggle}
      >
        {isMapView ? (
          <>
            <List size={20} color="#fff" />
            <Text style={styles.text}>Show List</Text>
          </>
        ) : (
          <>
            <Map size={20} color="#fff" />
            <Text style={styles.text}>Show Map</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.textPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.full,
    gap: 8,
  },
  text: {
    color: '#fff',
    fontFamily: Theme.typography.fontFamilyBold,
    fontSize: Theme.typography.sizes.sm,
  },
});
