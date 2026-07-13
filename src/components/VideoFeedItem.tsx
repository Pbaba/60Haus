import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { Theme } from '../theme';
import { RefreshCw, Volume2, VolumeX, Heart } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, runOnJS } from 'react-native-reanimated';
import { hapticsService } from '../services/hapticsService';

interface VideoFeedItemProps {
  videoUrl: string;
  thumbnailUrl?: string;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onViewCountIncrement: () => void;
  onDoubleTapSave?: () => void;
  shouldLoad: boolean;
}

interface ActivePlayerProps {
  videoUrl: string;
  isMuted: boolean;
  isActive: boolean;
  onViewCountIncrement: () => void;
  setIsReady: (ready: boolean) => void;
  setHasError: (error: boolean) => void;
}

const ActiveVideoPlayer: React.FC<ActivePlayerProps> = ({
  videoUrl,
  isMuted,
  isActive,
  onViewCountIncrement,
  setIsReady,
  setHasError,
}) => {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = isMuted;
  });

  // Sync mute state
  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  // Sync play/pause and view counting
  useEffect(() => {
    let timer: any;

    if (isActive) {
      setHasError(false);
      player.play();
      
      // Increment view count only after remaining visible for at least 2 seconds
      timer = setTimeout(() => {
        onViewCountIncrement();
      }, 2000);
    } else {
      player.pause();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isActive, player, onViewCountIncrement, setHasError]);

  // Listen to player status
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
  }, [player, setIsReady, setHasError]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
};

const VideoFeedItemComponent: React.FC<VideoFeedItemProps> = ({
  videoUrl,
  thumbnailUrl,
  isActive,
  isMuted,
  onToggleMute,
  onViewCountIncrement,
  onDoubleTapSave,
  shouldLoad,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
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

  const handleRetry = () => {
    setHasError(false);
    setIsReady(false);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      {/* Conditionally mount ActiveVideoPlayer based on shouldLoad */}
      {shouldLoad && (
        <ActiveVideoPlayer
          videoUrl={videoUrl}
          isMuted={isMuted}
          isActive={isActive}
          onViewCountIncrement={onViewCountIncrement}
          setIsReady={setIsReady}
          setHasError={setHasError}
        />
      )}

      {/* Thumbnail loader layer (fades out when video starts playing) */}
      {(!isReady || hasError || !shouldLoad) && thumbnailUrl && (
        <Image
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      )}

      {/* Spinner state while loading */}
      {shouldLoad && !isReady && !hasError && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      )}

      {/* Playback Error overlay */}
      {shouldLoad && hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load video</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <RefreshCw size={16} color="#FFF" style={styles.retryIcon} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sound toggle control */}
      <TouchableOpacity style={styles.muteBtn} onPress={onToggleMute}>
        {isMuted ? (
          <VolumeX size={18} color="#FFF" />
        ) : (
          <Volume2 size={18} color="#FFF" />
        )}
      </TouchableOpacity>

      {/* Double tap pop-up Heart */}
      {showHeart && (
        <Animated.View style={[styles.heartOverlay, heartStyle]}>
          <Heart size={72} color="#FFFFFF" fill="#FFFFFF" />
        </Animated.View>
      )}
    </Pressable>
  );
};

export const VideoFeedItem = React.memo(VideoFeedItemComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: Theme.typography.weights.medium,
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
    fontWeight: Theme.typography.weights.bold,
    fontFamily: Theme.typography.fontFamily,
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
});
