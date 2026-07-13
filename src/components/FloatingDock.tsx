import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';

export interface TabItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}

export interface FloatingDockProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState(0);
  const [slideAnim] = useState(() => new Animated.Value(0));

  const activeIndex = tabs.findIndex((t) => t.key === activeTab);
  const tabWidth = containerWidth / tabs.length;

  useEffect(() => {
    if (containerWidth > 0 && activeIndex !== -1) {
      Animated.spring(slideAnim, {
        toValue: activeIndex * tabWidth,
        damping: Theme.motion.presets.floatingDock.damping,
        stiffness: Theme.motion.presets.floatingDock.stiffness,
        mass: Theme.motion.presets.floatingDock.mass,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, tabWidth, containerWidth, slideAnim]);

  const onLayout = (e: any) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const content = (
    <View style={styles.content} onLayout={onLayout}>
      {/* Sliding Active Tab Underline */}
      {containerWidth > 0 && activeIndex !== -1 && (
        <Animated.View
          style={[
            styles.underline,
            {
              width: tabWidth - 36,
              transform: [{ translateX: Animated.add(slideAnim, 18) }],
            },
          ]}
        />
      )}

      {/* Tabs */}
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const Icon = tab.icon;

        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={Theme.motion.presets.press.scale}
            onPress={() => onTabPress(tab.key)}
            style={styles.tabButton}
          >
            <View style={isActive ? styles.activeIconWrapper : styles.iconContainer}>
              <Icon
                size={Theme.iconSizes.lg}
                color={isActive ? Theme.colors.primary : Theme.colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View
      style={[
        styles.dockContainer,
        {
          bottom: Math.max(insets.bottom, Theme.spacing.md),
        },
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={Theme.blur.normal}
          tint="dark"
          style={styles.blurContainer}
        >
          {content}
        </BlurView>
      ) : (
        <View style={styles.androidContainer}>{content}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dockContainer: {
    position: 'absolute',
    alignSelf: 'center',
    width: 280, // Reduced, centered content wrapping width
    height: Theme.floatingDock.height,
    ...Theme.shadows.lg,
    zIndex: 100,
  },
  blurContainer: {
    width: '100%',
    height: '100%',
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  androidContainer: {
    width: '100%',
    height: '100%',
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(21, 21, 24, 0.96)',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
      },
      android: {
        // android glow simulator
      },
    }),
  },
  underline: {
    position: 'absolute',
    bottom: 8,
    height: 2,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.full,
    left: 0,
  },
});
