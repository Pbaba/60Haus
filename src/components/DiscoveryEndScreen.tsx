import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Compass, Heart, Settings, SlidersHorizontal } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Theme } from '../theme';
import { DiscoveryCard } from './DiscoveryCard';
import { DiscoveryMode } from '../types';
import { useProperties } from '../hooks/useProperties';
import { analyticsService } from '../services/analyticsService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DiscoveryEndScreenProps {
  isActive: boolean;
  onOpenFilters: () => void;
}

export const DiscoveryEndScreen: React.FC<DiscoveryEndScreenProps> = ({
  isActive,
  onOpenFilters,
}) => {
  const router = useRouter();
  const { filters, setFilters, setDiscoveryMode, setFlexibleLevel } = useProperties();
  const [transitioning, setTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('');

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (transitionIntervalRef.current) clearInterval(transitionIntervalRef.current);
    };
  }, []);

  // Reanimated values for staggered spring entry and subtle fade
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const supportOpacity = useSharedValue(0);
  
  const cardScale1 = useSharedValue(0.7);
  const cardScale2 = useSharedValue(0.7);
  const cardScale3 = useSharedValue(0.7);
  const cardScale4 = useSharedValue(0.7);

  const cardOpacity1 = useSharedValue(0);
  const cardOpacity2 = useSharedValue(0);
  const cardOpacity3 = useSharedValue(0);
  const cardOpacity4 = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Fire analytics hook
      analyticsService.trackDiscoveryEndReached();

      // Reset and run animations
      titleOpacity.value = withTiming(1, { duration: 600 });
      subtitleOpacity.value = withDelay(150, withTiming(1, { duration: 600 }));
      
      cardOpacity1.value = withDelay(300, withTiming(1, { duration: 400 }));
      cardScale1.value = withDelay(300, withSpring(1, { damping: 12 }));

      cardOpacity2.value = withDelay(400, withTiming(1, { duration: 400 }));
      cardScale2.value = withDelay(400, withSpring(1, { damping: 12 }));

      cardOpacity3.value = withDelay(500, withTiming(1, { duration: 400 }));
      cardScale3.value = withDelay(500, withSpring(1, { damping: 12 }));

      cardOpacity4.value = withDelay(600, withTiming(1, { duration: 400 }));
      cardScale4.value = withDelay(600, withSpring(1, { damping: 12 }));

      // Softly reveal supporting copy after delay
      supportOpacity.value = withDelay(1000, withTiming(1, { duration: 600 }));
    } else {
      titleOpacity.value = 0;
      subtitleOpacity.value = 0;
      supportOpacity.value = 0;
      
      cardScale1.value = 0.7;
      cardScale2.value = 0.7;
      cardScale3.value = 0.7;
      cardScale4.value = 0.7;

      cardOpacity1.value = 0;
      cardOpacity2.value = 0;
      cardOpacity3.value = 0;
      cardOpacity4.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const runModeTransition = (mode: DiscoveryMode, action: () => void, messages: string[]) => {
    analyticsService.trackDiscoveryModeSelected(mode);
    setTransitioning(true);
    
    // Cycle messages over the transition period
    setTransitionMessage(messages[0]);
    
    let msgIdx = 1;
    transitionIntervalRef.current = setInterval(() => {
      if (msgIdx < messages.length) {
        setTransitionMessage(messages[msgIdx]);
        msgIdx++;
      }
    }, 200);

    transitionTimerRef.current = setTimeout(() => {
      if (transitionIntervalRef.current) clearInterval(transitionIntervalRef.current);
      action();
      setTransitioning(false);
    }, 650);
  };


  const handleExpandSearch = () => {
    const messages = [
      'Finding more homes...',
      '✨ Expanding your search...',
      'Refreshing recommendations...',
    ];
    
    runModeTransition(DiscoveryMode.FLEXIBLE_MATCH, () => {
      // If there is a maxPrice, expand it by 20%
      if (filters.maxPrice) {
        setFilters({
          ...filters,
          maxPrice: Math.round(filters.maxPrice * 1.2),
        });
      } else {
        setFlexibleLevel((prev) => Math.min(prev + 1, 3));
      }
      setDiscoveryMode(DiscoveryMode.FLEXIBLE_MATCH);
    }, messages);
  };

  const handleExploreNearby = () => {
    const messages = [
      'Locating neighboring homes...',
      '✨ Exploring nearby areas...',
      'Updating recommendations...',
    ];

    runModeTransition(DiscoveryMode.NEARBY, () => {
      setDiscoveryMode(DiscoveryMode.NEARBY);
    }, messages);
  };

  const handleSavedHomes = () => {
    analyticsService.trackDiscoveryModeSelected(DiscoveryMode.REVISIT);
    router.replace('/(tabs)/saved' as any);
  };

  const handleAdjustPreferences = () => {
    analyticsService.trackDiscoveryModeSelected(DiscoveryMode.EXACT_MATCH);
    onOpenFilters();
  };

  // Animated style hooks
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const supportStyle = useAnimatedStyle(() => ({ opacity: supportOpacity.value }));

  const cardStyle1 = useAnimatedStyle(() => ({
    opacity: cardOpacity1.value,
    transform: [{ scale: cardScale1.value }],
  }));
  const cardStyle2 = useAnimatedStyle(() => ({
    opacity: cardOpacity2.value,
    transform: [{ scale: cardScale2.value }],
  }));
  const cardStyle3 = useAnimatedStyle(() => ({
    opacity: cardOpacity3.value,
    transform: [{ scale: cardScale3.value }],
  }));
  const cardStyle4 = useAnimatedStyle(() => ({
    opacity: cardOpacity4.value,
    transform: [{ scale: cardScale4.value }],
  }));

  const relaxedBudgetLabel = filters.maxPrice 
    ? `Relax budget limit to ₹${Math.round(filters.maxPrice * 1.2 / 1000)}k to view more properties.`
    : 'Relax your preferences slightly to discover more relevant homes.';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.Text style={[styles.header, titleStyle]}>
          ✨ You're all caught up
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          We've shown you every property matching your preferences. Explore contextual options below.
        </Animated.Text>

        <View style={styles.grid}>
          <Animated.View style={[styles.cardWrapper, cardStyle1]}>
            <DiscoveryCard
              title={filters.maxPrice ? "Expand Budget by 20%" : "Expand My Search"}
              description={relaxedBudgetLabel}
              IconComponent={Compass}
              onPress={handleExpandSearch}
            />
          </Animated.View>

          <Animated.View style={[styles.cardWrapper, cardStyle2]}>
            <DiscoveryCard
              title="Show Nearby Localities"
              description={`Discover homes in neighbouring localities near ${filters.city}.`}
              IconComponent={SlidersHorizontal}
              onPress={handleExploreNearby}
            />
          </Animated.View>

          <Animated.View style={[styles.cardWrapper, cardStyle3]}>
            <DiscoveryCard
              title="Browse Saved Homes"
              description="Review the listings you have bookmarked previously."
              IconComponent={Heart}
              onPress={handleSavedHomes}
            />
          </Animated.View>

          <Animated.View style={[styles.cardWrapper, cardStyle4]}>
            <DiscoveryCard
              title="Update Preferences"
              description="Change city, bedroom configuration, or budget constraints."
              IconComponent={Settings}
              onPress={handleAdjustPreferences}
            />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.supportMessage, supportStyle]}>
          ✨ Tap any card to refresh your marketplace recommendation feed.
        </Animated.Text>
      </View>

      {transitioning && (
        <View style={styles.overlay}>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary || '#FF5A5F'} />
            <Text style={styles.loaderText}>{transitionMessage}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#0F0F12',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  header: {
    fontSize: Theme.typography.sizes.h2,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Theme.typography.fontFamilyEditorialBold,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: Theme.typography.lineHeights.md,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
    fontFamily: Theme.typography.fontFamily,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardWrapper: {
    width: '48%',
    marginVertical: 4,
  },
  supportMessage: {
    fontSize: Theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 24,
    fontStyle: 'italic',
    textAlign: 'center',
    fontFamily: Theme.typography.fontFamily,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 15, 18, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loaderContainer: {
    alignItems: 'center',
  },
  loaderText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
});
