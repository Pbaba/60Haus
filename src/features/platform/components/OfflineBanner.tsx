import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay } from 'react-native-reanimated';
import { WifiOff } from 'lucide-react-native';
import { useConnectivity } from '../hooks/useConnectivity';
import { Theme } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const isConnected = useConnectivity();
  const insets = useSafeAreaInsets();
  
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!isConnected) {
      height.value = withTiming(40, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      // Keep it green briefly to show restored, then hide
      opacity.value = withSequence(
        withTiming(1, { duration: 1500 }), // hold
        withTiming(0, { duration: 300 })
      );
      height.value = withDelay(1500, withTiming(0, { duration: 300 }));
    }
  }, [isConnected, height, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: height.value,
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[
      styles.container, 
      !isConnected ? styles.offlineBg : styles.onlineBg,
      animatedStyle,
      { paddingTop: Math.max(insets.top, 10) }
    ]}>
      {!isConnected ? (
        <>
          <WifiOff size={14} color="#fff" />
          <Text style={styles.text}>You are offline. Changes will be saved.</Text>
        </>
      ) : (
        <Text style={styles.text}>Connection Restored</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 8,
  },
  offlineBg: {
    backgroundColor: Theme.colors.danger,
  },
  onlineBg: {
    backgroundColor: Theme.colors.success,
  },
  text: {
    color: '#fff',
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
  }
});
