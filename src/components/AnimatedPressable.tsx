import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Theme } from '../theme';

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  activeOpacity?: number;
}

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  style,
  scaleTo = Theme.motion.presets.press.scale,
  activeOpacity = 1,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = (e: any) => {
    scale.value = withSpring(scaleTo, Theme.motion.springs.fast);
    if (activeOpacity < 1) {
      opacity.value = withSpring(activeOpacity, Theme.motion.springs.fast);
    }
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, Theme.motion.springs.bouncy);
    if (activeOpacity < 1) {
      opacity.value = withSpring(1, Theme.motion.springs.fast);
    }
    if (onPressOut) onPressOut(e);
  };

  return (
    <AnimatedPressableComponent
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressableComponent>
  );
};
