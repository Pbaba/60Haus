import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PropertyListing } from '../types';
import { Theme } from '../theme';
import { formatCurrency } from '../utils';
import { Award, MapPin, Sparkles, Phone, Flag, Bookmark } from 'lucide-react-native';
import { VideoFeedItem } from './VideoFeedItem';
import { ImageFeedItem } from './ImageFeedItem';
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
      {item.videoUrl ? (
        <VideoFeedItem
          videoUrl={item.videoUrl}
          thumbnailUrl={item.thumbnailUrl}
          isActive={isActive}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onViewCountIncrement={onViewCountIncrement}
          onDoubleTapSave={() => onSavePress(item.id)}
          shouldLoad={shouldLoad}
        />
      ) : (
        <ImageFeedItem
          imageUrls={item.imageUrls || []}
          thumbnailUrl={item.thumbnailUrl}
          onDoubleTapSave={() => onSavePress(item.id)}
        />
      )}

      <View style={styles.gradientOverlay} />

      <View
        style={[
          styles.overlayContent,
          { paddingBottom: insets.bottom + Theme.floatingDock.height + Theme.spacing.lg },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onPropertyPress(item)}
          style={styles.bottomInfo}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm, flexWrap: 'wrap' }}>
            <Text style={styles.price}>
              {formatCurrency(item.price)}
              <Text style={styles.perMonth}>/month</Text>
            </Text>
            {item.trustSignals && item.trustSignals.some((s) => s.toLowerCase().includes('verified')) && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </View>

          {item.trustSignals && item.trustSignals.length > 0 && (
            <View style={styles.trustSignalsContainer}>
              {item.trustSignals.map((signal) => (
                <View key={signal} style={styles.trustSignalBadge}>
                  <Award size={10} color={Theme.colors.primary} />
                  <Text style={styles.trustSignalText}>{signal}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={styles.location}>
            <MapPin size={16} color={Theme.colors.textSecondary} />
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
              {item.personalizationExplanations.map((exp) => (
                <View key={exp} style={styles.explanationTag}>
                  <Sparkles size={10} color="#FFF" />
                  <Text style={styles.explanationTagText}>{exp}</Text>
                </View>
              ))}
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
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.sidebarBtn, isSaved && styles.sidebarBtnActive]}
            onPress={() => onSavePress(item.id)}
          >
            <AnimatedBookmark
              size={22}
              color={isSaved ? Theme.colors.primary : Theme.colors.textPrimary}
            />
          </TouchableOpacity>

          {/* Quick Call Action */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.sidebarBtn}
            onPress={() => onQuickCall(item)}
          >
            <Phone size={20} color={Theme.colors.textPrimary} />
          </TouchableOpacity>

          {/* Report Listing Flag Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.sidebarBtn}
            onPress={() => onReportPress(item.id)}
          >
            <Flag size={18} color={Theme.colors.textPrimary} />
          </TouchableOpacity>
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
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.xs,
  },
  price: {
    fontSize: Theme.typography.sizes.h1,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  perMonth: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    letterSpacing: Theme.typography.letterSpacing.tight,
  },
  location: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
  },
  tagText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'capitalize',
  },
  contactBtn: {
    width: '90%',
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
  trustSignalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  trustSignalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 163, 89, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(212, 163, 89, 0.25)',
  },
  trustSignalText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamilyBold,
    marginLeft: 3,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wide,
  },
  explanationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
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
  verifiedBadge: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    color: '#000',
    fontSize: 10,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
