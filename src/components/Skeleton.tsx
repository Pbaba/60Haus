import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Animated, ViewStyle, View, LayoutChangeEvent } from 'react-native';
import { Theme } from '../theme';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: 'rect' | 'circle' | 'rounded';
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  variant = 'rounded',
  style,
}) => {
  const [layoutWidth, setLayoutWidth] = useState(0);
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (layoutWidth > 0) {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [layoutWidth, shimmerAnim]);

  const onLayout = (e: LayoutChangeEvent) => {
    setLayoutWidth(e.nativeEvent.layout.width);
  };

  const shapeStyle = {
    rect: { borderRadius: 0 },
    circle: { borderRadius: 9999 },
    rounded: { borderRadius: Theme.borderRadius.md },
  }[variant];

  // Interpolate translation value
  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-layoutWidth - 40, layoutWidth + 40],
  });

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.skeleton,
        shapeStyle,
        { width, height } as any,
        style,
      ]}
    >
      {layoutWidth > 0 && (
        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              width: layoutWidth / 2,
              transform: [{ translateX }, { skewX: '-20deg' }],
            },
          ]}
        />
      )}
    </View>
  );
};

// 1. Reusable Skeleton Card (Property List Card)
export const SkeletonCard: React.FC = () => {
  return (
    <View style={styles.cardContainer}>
      <Skeleton height={180} variant="rect" />
      <View style={styles.cardContent}>
        <View style={styles.cardRow}>
          <Skeleton height={22} width="40%" />
          <Skeleton height={22} width="10%" />
        </View>
        <Skeleton height={16} width="70%" style={{ marginTop: 10 }} />
        <Skeleton height={14} width="50%" style={{ marginTop: 6 }} />
        <View style={styles.cardTagRow}>
          <Skeleton height={20} width={60} style={{ borderRadius: 6 }} />
          <Skeleton height={20} width={90} style={{ borderRadius: 6 }} />
          <Skeleton height={20} width={50} style={{ borderRadius: 6 }} />
        </View>
      </View>
    </View>
  );
};

// 2. Reusable Skeleton Gallery (Walkthrough Media Sliders)
export const SkeletonGallery: React.FC = () => {
  return (
    <View style={styles.galleryContainer}>
      <Skeleton height={280} variant="rect" style={{ borderRadius: Theme.borderRadius.lg }} />
      <View style={styles.thumbRow}>
        <Skeleton height={60} width={60} style={{ borderRadius: Theme.borderRadius.md }} />
        <Skeleton height={60} width={60} style={{ borderRadius: Theme.borderRadius.md }} />
        <Skeleton height={60} width={60} style={{ borderRadius: Theme.borderRadius.md }} />
        <Skeleton height={60} width={60} style={{ borderRadius: Theme.borderRadius.md }} />
      </View>
    </View>
  );
};

// 3. Reusable Skeleton Profile (Hunter/Owner Dashboards)
export const SkeletonProfile: React.FC = () => {
  return (
    <View style={styles.profileContainer}>
      <View style={styles.profileHeader}>
        <Skeleton height={80} width={80} variant="circle" />
        <View style={styles.profileHeaderText}>
          <Skeleton height={22} width="60%" />
          <Skeleton height={14} width="40%" style={{ marginTop: 8 }} />
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Skeleton height={24} width={40} />
          <Skeleton height={12} width={50} style={{ marginTop: 6 }} />
        </View>
        <View style={styles.statBox}>
          <Skeleton height={24} width={40} />
          <Skeleton height={12} width={50} style={{ marginTop: 6 }} />
        </View>
        <View style={styles.statBox}>
          <Skeleton height={24} width={40} />
          <Skeleton height={12} width={50} style={{ marginTop: 6 }} />
        </View>
      </View>
      <View style={styles.profileSection}>
        <Skeleton height={20} width="35%" />
        <Skeleton height={50} style={{ marginTop: 12, borderRadius: Theme.borderRadius.md }} />
        <Skeleton height={50} style={{ marginTop: 8, borderRadius: Theme.borderRadius.md }} />
      </View>
    </View>
  );
};

// 4. Reusable Skeleton Dashboard (Analytics dashboard details)
export const SkeletonDashboard: React.FC = () => {
  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.statsGrid}>
        <View style={styles.gridBox}>
          <Skeleton height={18} width="50%" />
          <Skeleton height={30} width="40%" style={{ marginTop: 10 }} />
        </View>
        <View style={styles.gridBox}>
          <Skeleton height={18} width="50%" />
          <Skeleton height={30} width="40%" style={{ marginTop: 10 }} />
        </View>
        <View style={styles.gridBox}>
          <Skeleton height={18} width="50%" />
          <Skeleton height={30} width="40%" style={{ marginTop: 10 }} />
        </View>
      </View>
      <View style={styles.listSection}>
        <Skeleton height={20} width="40%" style={{ marginBottom: 16 }} />
        <Skeleton height={72} style={{ marginVertical: 6, borderRadius: Theme.borderRadius.md }} />
        <Skeleton height={72} style={{ marginVertical: 6, borderRadius: Theme.borderRadius.md }} />
        <Skeleton height={72} style={{ marginVertical: 6, borderRadius: Theme.borderRadius.md }} />
      </View>
    </View>
  );
};

// 5. Reusable Skeleton Feed (Swipe recommendations view)
export const SkeletonFeed: React.FC = () => {
  return (
    <View style={styles.feedContainer}>
      <Skeleton height="100%" width="100%" variant="rect" />
      <View style={styles.feedOverlay}>
        <Skeleton height={32} width="45%" />
        <Skeleton height={20} width="75%" style={{ marginTop: 10 }} />
        <Skeleton height={16} width="60%" style={{ marginTop: 8 }} />
        <View style={styles.feedTagRow}>
          <Skeleton height={22} width={70} style={{ borderRadius: Theme.borderRadius.sm }} />
          <Skeleton height={22} width={110} style={{ borderRadius: Theme.borderRadius.sm }} />
        </View>
        <Skeleton height={46} width="100%" style={{ marginTop: 24, borderRadius: Theme.borderRadius.md }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#1E1E22',
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardContainer: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardContent: {
    padding: Theme.spacing.lg,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTagRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
  galleryContainer: {
    gap: Theme.spacing.md,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  profileContainer: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.lg,
  },
  profileHeaderText: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.xxl,
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  profileSection: {
    marginTop: Theme.spacing.xxxl,
  },
  dashboardContainer: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
    justifyContent: 'space-between',
  },
  gridBox: {
    width: '47%',
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  listSection: {
    marginTop: Theme.spacing.xxxl,
  },
  feedContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#0F0F12',
  },
  feedOverlay: {
    position: 'absolute',
    bottom: Theme.floatingDock.height + 40,
    left: Theme.spacing.lg,
    right: Theme.spacing.lg,
    gap: Theme.spacing.xs,
  },
  feedTagRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },
});
