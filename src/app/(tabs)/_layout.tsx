import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Dimensions, Animated, ScrollView } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { FloatingDock, TabItem } from '../../components/FloatingDock';
import { Home, Heart, User } from 'lucide-react-native';
import FeedScreen from './index';
import SavedScreen from './saved';
import ProfileScreen from './profile';
import { hapticsService } from '../../services/hapticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const defaultTabs: TabItem[] = [
  { key: 'index', label: 'Feed', icon: Home },
  { key: 'saved', label: 'Saved', icon: Heart },
  { key: 'profile', label: 'Profile', icon: User },
];

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollXRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Sync scrollX ref with animated value
  useEffect(() => {
    const listenerId = scrollX.addListener(({ value }) => {
      scrollXRef.current = value;
    });
    return () => {
      scrollX.removeListener(listenerId);
    };
  }, [scrollX]);

  // Sync scroll view position when pathname changes (e.g. from redirect or direct navigation)
  useEffect(() => {
    let key = 'index';
    if (pathname.includes('/saved')) key = 'saved';
    else if (pathname.includes('/profile')) key = 'profile';

    const index = defaultTabs.findIndex((t) => t.key === key);
    if (index !== -1) {
      setActiveIndex((prev) => (prev !== index ? index : prev));
      const targetX = index * SCREEN_WIDTH;
      if (Math.abs(scrollXRef.current - targetX) > 10) {
        scrollRef.current?.scrollTo({ x: targetX, animated: true });
      }
    }
  }, [pathname]);

  const onMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    const key = defaultTabs[index].key;
    
    let currentKey = 'index';
    if (pathname.includes('/saved')) currentKey = 'saved';
    else if (pathname.includes('/profile')) currentKey = 'profile';

    if (key !== currentKey) {
      hapticsService.selection();
      setActiveIndex(index);
      
      const targetPath = key === 'index' ? '/(tabs)' : `/(tabs)/${key}`;
      router.replace(targetPath as any);
    }
  };

  const handleTabPress = (key: string) => {
    const index = defaultTabs.findIndex((t) => t.key === key);
    if (index !== -1) {
      let currentKey = 'index';
      if (pathname.includes('/saved')) currentKey = 'saved';
      else if (pathname.includes('/profile')) currentKey = 'profile';

      if (key !== currentKey) {
        hapticsService.selection();
        setActiveIndex(index);
        
        const targetX = index * SCREEN_WIDTH;
        scrollRef.current?.scrollTo({ x: targetX, animated: true });
        
        const targetPath = key === 'index' ? '/(tabs)' : `/(tabs)/${key}`;
        router.replace(targetPath as any);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={styles.swiper}
      >
        <View style={styles.page}>
          <FeedScreen />
        </View>
        <View style={styles.page}>
          <SavedScreen />
        </View>
        <View style={styles.page}>
          <ProfileScreen />
        </View>
      </Animated.ScrollView>

      <FloatingDock
        tabs={defaultTabs}
        activeTab={defaultTabs[activeIndex].key}
        onTabPress={handleTabPress}
        scrollX={scrollX}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
  swiper: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
});
