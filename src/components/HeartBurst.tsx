import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Heart } from 'lucide-react-native';
import { Theme } from '../theme';

export interface HeartBurstRef {
  trigger: () => void;
}

interface HeartBurstProps {
  size?: number;
  color?: string;
  fill?: string;
}

export const HeartBurst = forwardRef<HeartBurstRef, HeartBurstProps>(({
  size = 72,
  color = '#FFFFFF',
  fill = '#FFFFFF',
}, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    trigger: () => {
      setIsVisible(true);
      
      // Reset values
      scale.value = 0;
      opacity.value = 1;
      translateY.value = 0;

      // Scale up rapidly with bounce
      scale.value = withSpring(1.2, Theme.motion.springs.bouncy, () => {
        scale.value = withSpring(1, Theme.motion.springs.gentle);
      });

      // Float up slightly
      translateY.value = withTiming(-20, { duration: 600 });

      // Fade out after a delay
      opacity.value = withDelay(400, withTiming(0, { duration: 200 }, () => {
        runOnJS(setIsVisible)(false);
      }));
    }
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value }
    ],
  }));

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      <Heart size={size} color={color} fill={fill} />
    </Animated.View>
  );
});

HeartBurst.displayName = 'HeartBurst';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 110,
    height: 110,
    borderRadius: 55,
  },
});
