import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Bookmark } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Theme } from '../theme';
import { hapticsService } from '../services/hapticsService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageFeedItemProps {
  imageUrls: string[];
  thumbnailUrl?: string;
  onDoubleTapSave?: () => void;
}

export const ImageFeedItem: React.FC<ImageFeedItemProps> = ({
  imageUrls,
  thumbnailUrl,
  onDoubleTapSave,
}) => {
  const images = imageUrls && imageUrls.length > 0
    ? imageUrls
    : [thumbnailUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'];

  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef<number>(0);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const triggerHeartAnimation = () => {
    setShowHeart(true);
    heartScale.value = 0;
    heartOpacity.value = 0;

    heartScale.value = withSpring(1.3, { damping: 10, stiffness: 200 }, () => {
      heartScale.value = withSpring(1, { damping: 12 });
    });
    heartOpacity.value = withTiming(1, { duration: 180 }, () => {
      heartOpacity.value = withDelay(400, withTiming(0, { duration: 200 }, () => {
        runOnJS(setShowHeart)(false);
      }));
    });
  };

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      hapticsService.light();
      triggerHeartAnimation();
      onDoubleTapSave?.();
    }
    lastTap.current = now;
  };

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={styles.image}
            contentFit="cover"
          />
        )}
        style={StyleSheet.absoluteFill}
      />

      {/* Images Only Badge */}
      <View style={styles.imagesBadge}>
        <Text style={styles.imagesBadgeText}>Images Only 📸</Text>
      </View>

      {/* Double tap pop-up Heart */}
      {showHeart && (
        <Animated.View style={[styles.heartOverlay, heartStyle]}>
          <Bookmark size={72} color="#FFFFFF" fill="#FFFFFF" />
        </Animated.View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  imagesBadge: {
    position: 'absolute',
    top: 110,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 10,
  },
  imagesBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Theme.typography.fontFamily,
  },
  heartOverlay: {
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
