import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View, Text, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { BottomSheetProps } from './types';
import { Theme } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const context = useSharedValue({ y: 0 });

  // Snap configurations relative to top of viewport
  const SNAP_POINTS = {
    CLOSED: SCREEN_HEIGHT,
    PEEK: SCREEN_HEIGHT * 0.55,  // Covers bottom 45%
    OPEN: SCREEN_HEIGHT * 0.15,   // Covers bottom 85%
  };

  const snapTo = (targetY: number) => {
    'worklet';
    translateY.value = withSpring(targetY, Theme.motion.presets.bottomSheet, (finished) => {
      if (finished && targetY === SNAP_POINTS.CLOSED) {
        runOnJS(onClose)();
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      translateY.value = withSpring(SNAP_POINTS.PEEK, Theme.motion.presets.bottomSheet);
    } else {
      translateY.value = withSpring(SNAP_POINTS.CLOSED, Theme.motion.presets.bottomSheet);
    }
  }, [isOpen, translateY, SNAP_POINTS.CLOSED, SNAP_POINTS.PEEK]);

  // Gesture definition
  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = Math.max(
        SNAP_POINTS.OPEN - 20,
        context.value.y + event.translationY
      );
    })
    .onEnd((event) => {
      const currentY = translateY.value;
      const velocity = event.velocityY;

      if (velocity > 500) {
        if (currentY < SNAP_POINTS.PEEK) {
          snapTo(SNAP_POINTS.PEEK);
        } else {
          snapTo(SNAP_POINTS.CLOSED);
        }
      } else if (velocity < -500) {
        if (currentY > SNAP_POINTS.PEEK) {
          snapTo(SNAP_POINTS.PEEK);
        } else {
          snapTo(SNAP_POINTS.OPEN);
        }
      } else {
        const diffOpen = Math.abs(currentY - SNAP_POINTS.OPEN);
        const diffPeek = Math.abs(currentY - SNAP_POINTS.PEEK);
        const diffClosed = Math.abs(currentY - SNAP_POINTS.CLOSED);

        const minDiff = Math.min(diffOpen, diffPeek, diffClosed);

        if (minDiff === diffOpen) {
          snapTo(SNAP_POINTS.OPEN);
        } else if (minDiff === diffPeek) {
          snapTo(SNAP_POINTS.PEEK);
        } else {
          snapTo(SNAP_POINTS.CLOSED);
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    const opacity = 1 - (translateY.value - SNAP_POINTS.OPEN) / (SNAP_POINTS.CLOSED - SNAP_POINTS.OPEN);
    return {
      opacity: Math.max(0, Math.min(0.6, opacity * 0.6)),
    };
  });

  if (!isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={styles.backdropPressable} onPress={() => snapTo(SNAP_POINTS.CLOSED)} accessibilityRole="button" accessibilityLabel="Close sheet" />
      </Animated.View>

      {/* Sheet Body Container */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheetContainer, animatedStyle]} accessibilityViewIsModal={true} accessibilityLabel={title || 'Bottom sheet'}>
          <View style={styles.dragIndicator} />
          {title && <Text style={styles.sheetTitle}>{title}</Text>}
          <View style={styles.contentContainer}>{children}</View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    paddingTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.lg,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.xs,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
  sheetTitle: {
    fontSize: Theme.typography.sizes.lg,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    marginBottom: Theme.spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
});
