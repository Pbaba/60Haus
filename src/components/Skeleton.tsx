import React, { useEffect, useState } from 'react';
import { StyleSheet, Animated, ViewStyle } from 'react-native';
import { Theme } from '../theme';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: 'rect' | 'circle' | 'rounded';
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  variant = 'rounded',
  style,
}) => {
  const [pulseAnim] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: Theme.motion.duration.slow + 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: Theme.motion.duration.slow + 200,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();
    
    return () => pulse.stop();
  }, [pulseAnim]);

  const shapeStyle = {
    rect: { borderRadius: 0 },
    circle: { borderRadius: 9999 },
    rounded: { borderRadius: Theme.borderRadius.sm },
  }[variant];

  const skeletonStyle = [
    styles.skeleton,
    shapeStyle,
    {
      width,
      height,
      opacity: pulseAnim,
    },
    style,
  ] as any;

  return <Animated.View style={skeletonStyle} />;
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Theme.colors.surfaceElevated,
  },
});
