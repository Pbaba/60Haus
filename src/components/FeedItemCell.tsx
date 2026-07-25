import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PropertyListing } from '../types';
import { Theme } from '../theme';
import { formatCurrency } from '../utils';
import { MapPin, Sparkles, Phone, Flag, Bookmark } from 'lucide-react-native';
import { UnifiedMediaCarousel } from './UnifiedMediaCarousel';
import { AnimatedPressable } from './AnimatedPressable';
import { Button } from './Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedBookmark = Animated.createAnimatedComponent(Bookmark);

interface FeedItemCellProps {
  item: PropertyListing;
  isActive: boolean;
  isSaved: boolean;
  isMuted: boolean;
  shouldLoad: boolean;
  onToggleMute: () => void;
  onViewCountIncrement: () => void;
  onSavePress: (id: string) => void;
  onQuickCall: (item: PropertyListing) => void;
  onReportPress: (id: string) => void;
  onPropertyPress: (item: PropertyListing) => void;
}

const FeedItemCellComponent: React.FC<FeedItemCellProps> = ({
  item,
  isActive,
  isSaved,
  isMuted,
  shouldLoad,
  onToggleMute,
  onViewCountIncrement,
  onSavePress,
  onQuickCall,
  onReportPress,
  onPropertyPress,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <UnifiedMediaCarousel
        item={item}
        isActive={isActive}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onViewCountIncrement={onViewCountIncrement}
        onDoubleTapSave={() => onSavePress(item.id)}
        shouldLoad={shouldLoad}
      />

      <View style={styles.gradientOverlay} pointerEvents="none" />

      <View
        pointerEvents="box-none"
        style={[
          styles.overlayContent,
          { paddingBottom: insets.bottom + Theme.floatingDock.height + Theme.spacing.xs },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onPropertyPress(item)}
          style={styles.bottomInfo}
        >
          <Text style={styles.price}>
            {formatCurrency(item.price)}
            <Text style={styles.perMonth}>/month</Text>
          </Text>

          <View style={styles.metadataRow}>
            {(() => {
              // 1. Trust Signals fallback
              const hasOldBadge = item.trustSignals && item.trustSignals.some((s) => s.toLowerCase().includes('verified'));
              // 2. New Verification Lifecycle Logic
              if (!item.lastVerifiedAt && !hasOldBadge) return null;
              
              let badgeText = '✓ Verified';
              
              if (item.lastVerifiedAt) {
                const verifiedDate = new Date(item.lastVerifiedAt);
                const now = new Date();
                const diffMs = now.getTime() - verifiedDate.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) badgeText = '✓ Verified Today';
                else if (diffDays === 1) badgeText = '✓ Verified Yesterday';
                else badgeText = `✓ Verified ${diffDays} Days Ago`;
              }

              // Sprint 20: Additional trust badges (limit to 1 extra)
              let extraBadge = null;
              if (item.videoUrl && item.videoUrl.length > 0) {
                extraBadge = '✓ Walkthrough Available';
              } else if (item.healthStatus === 'excellent') {
                extraBadge = '✓ Premium Listing';
              }

              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <View style={styles.verifiedBadgeContainer}>
                    <Text style={styles.verifiedBadgeText}>{badgeText}</Text>
                  </View>
                  {extraBadge && (
                    <View style={styles.trustBadgeContainer}>
                      <Text style={styles.trustBadgeText}>{extraBadge}</Text>
                    </View>
                  )}
                  <Text style={styles.metadataSeparator}>•</Text>
                </View>
              );
            })()}
            <Text style={styles.metadataText}>
              {(() => {
                if (!item.createdAt) return 'Listed recently';
                const date = new Date(item.createdAt);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                if (diffDays === 0) return 'Listed Today';
                if (diffDays === 1) return 'Listed Yesterday';
                return `${diffDays}d ago`;
              })()}
            </Text>
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={styles.location}>
            <MapPin size={12} color={Theme.colors.textSecondary} style={{ marginRight: 2 }} />
            {item.address}, {item.city}
          </Text>

          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.bedrooms} BHK</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.furnishing.replace('-', ' ')}</Text>
            </View>
            {item.viewCount !== undefined && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.viewCount} views</Text>
              </View>
            )}
          </View>

          {item.personalizationExplanations && item.personalizationExplanations.length > 0 && (
            <View style={styles.explanationsContainer}>
              <View style={styles.explanationTag}>
                <Sparkles size={10} color="#FFF" />
                <Text style={styles.explanationTagText}>
                  {item.personalizationExplanations[0]}
                </Text>
              </View>
            </View>
          )}

          <Button
            variant="primary"
            style={styles.contactBtn}
            onPress={() => onQuickCall(item)}
          >
            Contact Owner
          </Button>
        </TouchableOpacity>

        <View style={styles.sidebar}>
          {/* Save Action */}
          <AnimatedPressable
            style={[styles.sidebarBtn, isSaved && styles.sidebarBtnActive]}
            onPress={() => onSavePress(item.id)}
            scaleTo={0.9}
          >
            <AnimatedBookmark
              size={22}
              color={isSaved ? Theme.colors.primary : Theme.colors.textPrimary}
            />
          </AnimatedPressable>

          {/* Quick Call Action */}
          <AnimatedPressable
            style={styles.sidebarBtn}
            onPress={() => onQuickCall(item)}
            scaleTo={0.9}
          >
            <Phone size={20} color={Theme.colors.textPrimary} />
          </AnimatedPressable>

          {/* Report Listing Flag Button */}
          <AnimatedPressable
            style={styles.sidebarBtn}
            onPress={() => onReportPress(item.id)}
            scaleTo={0.9}
          >
            <Flag size={18} color={Theme.colors.textPrimary} />
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
};

export const FeedItemCell = React.memo(FeedItemCellComponent, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.viewCount === next.item.viewCount &&
    prev.item.saveCount === next.item.saveCount &&
    prev.isActive === next.isActive &&
    prev.isSaved === next.isSaved &&
    prev.isMuted === next.isMuted &&
    prev.shouldLoad === next.shouldLoad
  );
});

const styles = StyleSheet.create({
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 11, 0.52)',
  },
  overlayContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Theme.spacing.lg,
  },
  bottomInfo: {
    flex: 1,
    alignSelf: 'flex-end',
    marginBottom: Theme.spacing.xs,
    gap: 2,
  },
  price: {
    fontSize: Theme.typography.sizes.h2,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  perMonth: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
    marginBottom: 4,
  },
  metadataText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  metadataSeparator: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textMuted,
  },
  verifiedBadgeContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)', // Light green tint
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.xs,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  verifiedBadgeText: {
    fontSize: Theme.typography.sizes.xxs,
    color: '#4ade80', // green-400
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  trustBadgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  trustBadgeText: {
    fontSize: Theme.typography.sizes.xxs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    letterSpacing: Theme.typography.letterSpacing.tight,
  },
  location: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
    marginBottom: 6,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Theme.borderRadius.full,
  },
  tagText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'capitalize',
  },
  contactBtn: {
    width: '90%',
    height: 40,
    marginTop: 4,
  },
  sidebar: {
    alignSelf: 'flex-end',
    marginBottom: Theme.spacing.md,
    marginLeft: Theme.spacing.md,
    gap: Theme.spacing.lg,
    alignItems: 'center',
  },
  sidebarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(21, 21, 24, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sidebarBtnActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '20',
  },
  explanationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
    marginBottom: 6,
  },
  explanationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  explanationTagText: {
    color: '#FFF',
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    marginLeft: 3,
  },
});
