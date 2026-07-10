import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { Theme } from '../theme';
import { RefreshCw, Volume2, VolumeX } from 'lucide-react-native';

interface VideoFeedItemProps {
  videoUrl: string;
  thumbnailUrl?: string;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onViewCountIncrement: () => void;
}

export const VideoFeedItem: React.FC<VideoFeedItemProps> = ({
  videoUrl,
  thumbnailUrl,
  isActive,
  isMuted,
  onToggleMute,
  onViewCountIncrement,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Initialize expo-video player
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
      player.currentTime = 0; // Restart playback on revisit
      setIsReady(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isActive, player, onViewCountIncrement]);

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
  }, [player]);

  const handleRetry = () => {
    setHasError(false);
    setIsReady(false);
    player.play();
  };

  return (
    <View style={styles.container}>
      {/* Video view component */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Thumbnail loader layer (fades out when video starts playing) */}
      {(!isReady || hasError) && thumbnailUrl && (
        <Image
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      )}

      {/* Spinner state while loading */}
      {!isReady && !hasError && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      )}

      {/* Playback Error overlay */}
      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load video</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <RefreshCw size={16} color="#FFF" style={styles.retryIcon} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Global sound toggle floating control */}
      <TouchableOpacity style={styles.muteBtn} onPress={onToggleMute}>
        {isMuted ? (
          <VolumeX size={18} color="#FFF" />
        ) : (
          <Volume2 size={18} color="#FFF" />
        )}
      </TouchableOpacity>
    </View>
  );
};

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
