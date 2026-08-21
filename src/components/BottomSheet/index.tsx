import React, { useEffect, useMemo } from 'react';
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

// Top offset when fully open (15% from top of screen)
const SHEET_TOP_OPEN = SCREEN_HEIGHT * 0.15;
// Sheet container height covering bottom 85% of screen
const SHEET_HEIGHT = SCREEN_HEIGHT - SHEET_TOP_OPEN;

// Snap points relative to translateY offset from SHEET_TOP_OPEN:
// 0 = fully OPEN (top at 15%, bottom at 100% of viewport)
// SCREEN_HEIGHT * 0.40 = PEEK (top at 55%, bottom at 140% of viewport)
// SHEET_HEIGHT = CLOSED (top at 100%, sheet completely below viewport)
const SNAP_POINTS = {
  OPEN: 0,
  PEEK: SCREEN_HEIGHT * 0.40,
  CLOSED: SHEET_HEIGHT,
};

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  initialSnap = 'peek',
}) => {
  const translateY = useSharedValue(SNAP_POINTS.CLOSED);
  const context = useSharedValue({ y: 0 });

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
      const targetSnap = initialSnap === 'open' ? SNAP_POINTS.OPEN : SNAP_POINTS.PEEK;
      translateY.value = withSpring(targetSnap, Theme.motion.presets.bottomSheet);
    } else {
      translateY.value = withSpring(SNAP_POINTS.CLOSED, Theme.motion.presets.bottomSheet);
    }
  }, [isOpen, translateY, initialSnap]);

  // Gesture definition
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
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
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    const opacity = 1 - translateY.value / SNAP_POINTS.CLOSED;
    return {
      opacity: Math.max(0, Math.min(0.6, opacity * 0.6)),
    };
  });

  if (!isOpen) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.modalWrapper]}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={styles.backdropPressable}
          onPress={() => snapTo(SNAP_POINTS.CLOSED)}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
        />
      </Animated.View>

      {/* Sheet Body Container */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.sheetContainer, animatedStyle]}
          accessibilityViewIsModal={true}
          accessibilityLabel={title || 'Bottom sheet'}
        >
          <View style={styles.dragIndicator} />
          {title && <Text style={styles.sheetTitle}>{title}</Text>}
          <View style={styles.contentContainer}>{children}</View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  modalWrapper: {
    zIndex: 1000,
    elevation: 1000,
  },
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
    top: SHEET_TOP_OPEN,
    height: SHEET_HEIGHT,
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
