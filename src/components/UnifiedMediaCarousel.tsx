import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { Heart, Volume2, VolumeX, RefreshCw } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, runOnJS } from 'react-native-reanimated';
import { Theme } from '../theme';
import { hapticsService } from '../services/hapticsService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UnifiedMediaCarouselProps {
  item: {
    id: string;
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
    imageUrls?: string[];
  };
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onViewCountIncrement: () => void;
  onDoubleTapSave?: () => void;
  shouldLoad: boolean;
}

interface MediaSlide {
  type: 'video' | 'image';
  url: string;
  thumbnailUrl?: string;
}

const ActiveVideoSlide = React.memo(({
  videoUrl,
  thumbnailUrl,
  isActive,
  isCarouselActive,
  isMuted,
  onToggleMute,
  onViewCountIncrement,
}: any) => {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const shouldPlay = isActive && isCarouselActive;

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = isMuted;
  });

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  const incrementRef = useRef(onViewCountIncrement);
  useEffect(() => {
    incrementRef.current = onViewCountIncrement;
  }, [onViewCountIncrement]);

  useEffect(() => {
    let timer: any;
    if (shouldPlay) {
      setHasError(false);
      player.play();

      timer = setTimeout(() => {
        incrementRef.current();
      }, 2000);
    } else {
      player.pause();
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [shouldPlay, player]);

  useEffect(() => {
    const playSub = player.addListener('playingChange', (isPlaying) => {
      if (isPlaying) {
        setIsReady(true);
        setHasError(false);
      }
    });

    const errorSub = player.addListener('statusChange', (statusChange) => {
      if (statusChange.status === 'error') {
        setHasError(true);
      }
    });

    return () => {
      playSub.remove();
      errorSub.remove();
    };
  }, [player]);

  const handleRetry = () => {
    setHasError(false);
    setIsReady(false);
  };

  return (
    <View style={styles.slideWrapper}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {(!isReady || hasError) && thumbnailUrl && (
        <Image source={{ uri: thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}

      {!isReady && !hasError && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      )}

      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load video</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <RefreshCw size={16} color="#FFF" style={styles.retryIcon} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.muteBtn} onPress={onToggleMute}>
        {isMuted ? <VolumeX size={18} color="#FFF" /> : <Volume2 size={18} color="#FFF" />}
      </TouchableOpacity>
    </View>
  );
});

const VideoSlide = React.memo(({
  videoUrl,
  thumbnailUrl,
  isActive,
  isCarouselActive,
  isMuted,
  onToggleMute,
  onViewCountIncrement,
  shouldLoad,
}: any) => {
  if (shouldLoad) {
    return (
      <ActiveVideoSlide
        videoUrl={videoUrl}
        thumbnailUrl={thumbnailUrl}
        isActive={isActive}
        isCarouselActive={isCarouselActive}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onViewCountIncrement={onViewCountIncrement}
      />
    );
  }

  return (
    <View style={styles.slideWrapper}>
      {thumbnailUrl && (
        <Image source={{ uri: thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}
    </View>
  );
});

export const UnifiedMediaCarousel: React.FC<UnifiedMediaCarouselProps> = React.memo(({
  item,
  isActive,
  isMuted,
  onToggleMute,
  onViewCountIncrement,
  onDoubleTapSave,
  shouldLoad,
}) => {
  const slides = useMemo(() => {
    const list: MediaSlide[] = [];
    if (item.videoUrl) {
      list.push({ type: 'video', url: item.videoUrl, thumbnailUrl: item.thumbnailUrl || undefined });
    }
    if (item.imageUrls && item.imageUrls.length > 0) {
      item.imageUrls.forEach((img) => {
        list.push({ type: 'image', url: img });
      });
    } else if (!item.videoUrl && item.thumbnailUrl) {
      list.push({ type: 'image', url: item.thumbnailUrl });
    }
    if (list.length === 0) {
      list.push({
        type: 'image',
        url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
      });
    }
    return list;
  }, [item.videoUrl, item.thumbnailUrl, item.imageUrls]);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef<number>(0);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const triggerHeartAnimation = React.useCallback(() => {
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
  }, [heartScale, heartOpacity]);

  const handlePress = React.useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      hapticsService.light();
      triggerHeartAnimation();
      onDoubleTapSave?.();
    }
    lastTap.current = now;
  }, [triggerHeartAnimation, onDoubleTapSave]);

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const handleScroll = React.useCallback((event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== currentSlideIndex) {
      setCurrentSlideIndex(index);
    }
  }, [currentSlideIndex]);

  const renderItem = React.useCallback(({ item: slide, index, extraData: activeSlideIndex }: any) => {
    if (slide.type === 'video') {
      return (
        <Pressable style={styles.slideWrapper} onPress={handlePress}>
          <VideoSlide
            videoUrl={slide.url}
            thumbnailUrl={slide.thumbnailUrl}
            isActive={isActive}
            isCarouselActive={index === activeSlideIndex}
            isMuted={isMuted}
            onToggleMute={onToggleMute}
            onViewCountIncrement={onViewCountIncrement}
            shouldLoad={shouldLoad}
          />
        </Pressable>
      );
    } else {
      return (
        <Pressable style={styles.slideWrapper} onPress={handlePress}>
          <Image
            source={{ uri: slide.url }}
            style={styles.backgroundImage}
            contentFit="cover"
            blurRadius={32}
          />
          <View style={styles.darkOverlay} />
          <Image
            source={{ uri: slide.url }}
            style={styles.foregroundImage}
            contentFit="contain"
          />
        </Pressable>
      );
    }
  }, [handlePress, isActive, isMuted, onToggleMute, onViewCountIncrement, shouldLoad]);

  return (
    <View style={styles.container}>
      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        scrollEnabled={true}
        nestedScrollEnabled={true}
        directionalLockEnabled={true}
        extraData={currentSlideIndex}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(slide, index) => `${slide.type}-${index}`}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        renderItem={renderItem}
        style={StyleSheet.absoluteFill}
      />

      {slides.length > 1 && (
        <View style={styles.indicatorContainer}>
          {slides.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.indicatorDot,
                idx === currentSlideIndex && styles.indicatorDotActive,
              ]}
            />
          ))}
        </View>
      )}

      {showHeart && (
        <Animated.View style={[styles.heartOverlay, heartStyle]} pointerEvents="none">
          <Heart size={72} color="#FFFFFF" fill="#FFFFFF" />
        </Animated.View>
      )}
    </View>
  );
});

ActiveVideoSlide.displayName = 'ActiveVideoSlide';
VideoSlide.displayName = 'VideoSlide';
UnifiedMediaCarousel.displayName = 'UnifiedMediaCarousel';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slideWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    transform: [{ scale: 1.15 }],
  },
  darkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
  },
  foregroundImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  loaderContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
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
  errorContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  errorText: {
    color: '#FFF',
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.full,
  },
  retryIcon: {
    marginRight: Theme.spacing.xs,
  },
  retryText: {
    color: '#FFF',
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    fontWeight: 'bold',
  },
  muteBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 24,
    zIndex: 10,
  },
  indicatorContainer: {
    position: 'absolute',
    top: 66,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorDotActive: {
    backgroundColor: Theme.colors.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
