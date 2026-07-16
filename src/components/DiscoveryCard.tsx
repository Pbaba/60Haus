import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { hapticsService } from '../services/hapticsService';
import { Theme } from '../theme';
import { BlurView } from 'expo-blur';
import { LucideIcon } from 'lucide-react-native';

interface DiscoveryCardProps {
  title: string;
  description: string;
  IconComponent: LucideIcon;
  onPress: () => void;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  title,
  description,
  IconComponent,
  onPress,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const handlePress = () => {
    hapticsService.light();
    onPress();
  };

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={styles.pressable}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={description}
      >
        <BlurView intensity={25} tint="dark" style={styles.blur}>
          <View style={styles.iconWrapper}>
            <IconComponent size={24} color={Theme.colors.primary || '#FF5A5F'} />
          </View>
          <View style={styles.textWrapper}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    aspectRatio: 0.9,
    marginVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  pressable: {
    flex: 1,
  },
  blur: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    marginTop: Theme.spacing.sm,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    fontFamily: Theme.typography.fontFamily,
    marginTop: Theme.spacing.xs,
    lineHeight: Theme.typography.lineHeights.xs,
  },
});
