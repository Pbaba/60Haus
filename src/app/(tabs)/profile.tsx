import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useProperties } from '../../hooks/useProperties';
import { Theme } from '../../theme';
import { ChevronRight, Settings, HelpCircle, Heart, Building, User, Shield } from 'lucide-react-native';
import { formatCurrency } from '../../utils';
import { Image } from 'expo-image';
import { Button } from '../../components/Button';
import { historyService } from '../../services/historyService';
import { PropertyListing } from '../../types';
import { useFeedback } from '../../context/FeedbackContext';

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { isGuest } = useAuth();
  const { profile, upgradeToOwner } = useProfile();
  const { showTransactionFeedback } = useFeedback();
  const { properties, savedProperties } = useProperties();
  const isOwner = profile?.role === 'owner';

  const [recentViews, setRecentViews] = useState<PropertyListing[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const fetchRecentHistory = useCallback(async () => {
    if (isGuest || !profile?.id) return;
    setRecentLoading(true);
    try {
      const history = await historyService.getRecentViews(profile.id);
      setRecentViews(history);
    } catch (e) {
      console.warn('Failed to load recent views:', e);
    } finally {
      setRecentLoading(false);
    }
  }, [profile, isGuest]);

  useEffect(() => {
    fetchRecentHistory();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchRecentHistory();
    });
    return unsubscribe;
  }, [navigation, fetchRecentHistory]);

  const navigateToSettings = () => {
    router.push('/settings' as any);
  };

  const handleBecomeOwner = async () => {
    try {
      await upgradeToOwner();
      showTransactionFeedback('success', 'Owner Upgrade Complete', 'Congratulations! Your profile has been successfully upgraded to a Property Owner. You can now publish your listings.');
    } catch {
      showTransactionFeedback('error', 'Upgrade Failed', 'Failed to upgrade profile to Owner. Please check your network connection and try again.');
    }
  };



  const renderRecentItem = ({ item }: { item: PropertyListing }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.recentCard}
      onPress={() => router.push(`/property/${item.id}` as any)}
    >
      <Image
        source={{ uri: item.thumbnailUrl }}
        style={styles.recentThumb}
        contentFit="cover"
      />
      <View style={styles.recentInfo}>
        <Text style={styles.recentPrice}>{formatCurrency(item.price)}</Text>
        <Text style={styles.recentTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.recentLocation} numberOfLines={1}>
          {item.city}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderRecentSkeletons = () => (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Recently Viewed Properties</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.recentCard}>
            <Skeleton height={90} width="100%" />
            <View style={styles.recentInfo}>
              <Skeleton height={14} width="50%" />
              <Skeleton height={12} width="80%" style={{ marginTop: 4 }} />
              <Skeleton height={10} width="40%" style={{ marginTop: 4 }} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // Guest Prompt View
  if (isGuest || !profile) {
    return (
      <ScreenContainer style={styles.guestContainer}>
        <View style={styles.guestContent}>
          <User size={64} color={Theme.colors.primary} style={styles.guestIcon} />
          <Text style={styles.guestTitle}>Create an Account</Text>
          <Text style={styles.guestSubtitle}>
            Sign up to save properties, publish your own tours, and connect with verified homeowners.
          </Text>

          <Button
            variant="primary"
            style={styles.guestBtn}
            onPress={() => router.replace('/register' as any)}
          >
            Register Now
          </Button>

          <TouchableOpacity
            style={styles.guestLink}
            onPress={() => router.replace('/login' as any)}
          >
            <Text style={styles.guestLinkText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Avatar name={profile?.fullName || 'User'} source={profile?.avatarUrl} size="xl" />
          <Text style={styles.name}>{profile?.fullName || 'Anonymous User'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{isOwner ? 'Property Owner' : 'House Hunter'}</Text>
          </View>
          <Text style={styles.bio}>{profile?.bio}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{savedProperties.length}</Text>
            <Text style={styles.statLabel}>Saved Homes</Text>
          </View>
          {isOwner && (
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {properties.filter((p) => p.ownerId === profile?.id).length}
              </Text>
              <Text style={styles.statLabel}>My Listings</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Dynamic Section: Become Owner CTA (Hunter Only) */}
        {!isOwner && (
          <TouchableOpacity onPress={handleBecomeOwner} activeOpacity={0.9} style={styles.ctaWrapper}>
            <Card style={styles.ctaCard}>
              <Building size={20} color={Theme.colors.primary} />
              <View style={styles.ctaTextContainer}>
                <Text style={styles.ctaTitle}>Become a Property Owner</Text>
                <Text style={styles.ctaSub}>List walkthrough videos and get direct leads.</Text>
              </View>
              <ChevronRight size={18} color={Theme.colors.primary} />
            </Card>
          </TouchableOpacity>
        )}

        {/* Dynamic Section: My Listings List (Owner Only) */}
        {isOwner && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Listings Management</Text>
            <TouchableOpacity onPress={() => router.push('/owner/dashboard' as any)} activeOpacity={0.9} style={styles.ctaWrapper}>
              <Card style={styles.listingsCTA}>
                <Building size={20} color={Theme.colors.primary} />
                <View style={styles.ctaTextContainer}>
                  <Text style={styles.ctaTitle}>Go to Host Dashboard</Text>
                  <Text style={styles.ctaSub}>Manage your listings, track analytics, and configure status.</Text>
                </View>
                <ChevronRight size={18} color={Theme.colors.textSecondary} />
              </Card>
            </TouchableOpacity>
          </View>
        )}

        {/* Recently Viewed History Section */}
        {recentLoading ? (
          renderRecentSkeletons()
        ) : recentViews.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Recently Viewed Properties</Text>
            <FlatList
              horizontal
              data={recentViews}
              renderItem={renderRecentItem}
              keyExtractor={(item) => `recent-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        ) : null}

        {/* Grouped Action Card */}
        <View style={styles.groupCard}>
          {/* Saved Homes Shortcut */}
          <TouchableOpacity style={styles.rowItem} onPress={() => router.replace('/(tabs)/saved' as any)}>
            <View style={styles.rowLabel}>
              <Heart size={20} color={Theme.colors.textSecondary} />
              <Text style={styles.rowText}>Saved Homes</Text>
            </View>
            <ChevronRight size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Settings */}
          <TouchableOpacity style={styles.rowItem} onPress={navigateToSettings}>
            <View style={styles.rowLabel}>
              <Settings size={20} color={Theme.colors.textSecondary} />
              <Text style={styles.rowText}>Settings</Text>
            </View>
            <ChevronRight size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Privacy & Permissions */}
          <TouchableOpacity style={styles.rowItem} onPress={() => router.push('/settings/privacy' as any)}>
            <View style={styles.rowLabel}>
              <Shield size={20} color={Theme.colors.textSecondary} />
              <Text style={styles.rowText}>Privacy & Permissions</Text>
            </View>
            <ChevronRight size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Help & Support */}
          <TouchableOpacity style={styles.rowItem} onPress={() => alert('Support module placeholder.')}>
            <View style={styles.rowLabel}>
              <HelpCircle size={20} color={Theme.colors.textSecondary} />
              <Text style={styles.rowText}>Help & Support</Text>
            </View>
            <ChevronRight size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    paddingBottom: Theme.floatingDock.height + Theme.spacing.xxxl,
    paddingHorizontal: Theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
    gap: Theme.spacing.sm,
  },
  name: {
    fontSize: Theme.typography.sizes.h2,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    letterSpacing: Theme.typography.letterSpacing.tight,
  },
  roleBadge: {
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: 'transparent',
  },
  roleText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyMedium,
    textTransform: 'uppercase',
  },
  bio: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: Theme.typography.lineHeights.lg,
    marginTop: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Theme.spacing.xxl,
    marginTop: Theme.spacing.lg,
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: Theme.typography.sizes.xl,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  statLabel: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: Theme.spacing.xl,
  },
  ctaWrapper: {
    width: '100%',
    marginBottom: Theme.spacing.xl,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    padding: Theme.spacing.md,
    borderColor: Theme.colors.primary,
    borderWidth: 1,
    backgroundColor: Theme.colors.primary + '05',
    borderRadius: Theme.borderRadius.md,
  },
  listingsCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    padding: Theme.spacing.md,
    borderColor: Theme.colors.border,
    borderWidth: 1,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.md,
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  ctaSub: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: 2,
  },
  section: {
    marginBottom: Theme.spacing.xl,
    gap: Theme.spacing.sm,
  },
  sectionHeader: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wider,
    marginBottom: Theme.spacing.xs,
  },
  tabFilters: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  tabFilterBtn: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  tabFilterBtnActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '15',
  },
  tabFilterText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'capitalize',
  },
  tabFilterTextActive: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  listingsContainer: {
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  listingItem: {
    flexDirection: 'row',
    padding: 0,
    backgroundColor: Theme.colors.surface,
    borderColor: Theme.colors.border,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    alignItems: 'center',
  },
  listingItemContent: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  listingThumb: {
    width: 80,
    height: 80,
  },
  listingInfo: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
    gap: 4,
  },
  listingPrice: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  listingTitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
  },
  statusRow: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  publishedBadge: {
    backgroundColor: Theme.colors.success + '15',
  },
  publishedBadgeText: {
    color: Theme.colors.success,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  draftBadge: {
    backgroundColor: Theme.colors.textSecondary + '15',
  },
  draftBadgeText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  deleteListingBtn: {
    padding: Theme.spacing.md,
  },
  groupCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
    marginTop: Theme.spacing.md,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  rowText: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginHorizontal: Theme.spacing.lg,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
  guestContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xxl,
    gap: Theme.spacing.md,
  },
  guestIcon: {
    marginBottom: Theme.spacing.sm,
  },
  guestTitle: {
    fontSize: Theme.typography.sizes.h2,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
  },
  guestSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: Theme.typography.lineHeights.lg,
    marginBottom: Theme.spacing.lg,
  },
  guestBtn: {
    width: '100%',
  },
  guestLink: {
    marginTop: Theme.spacing.md,
  },
  guestLinkText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
  },
  // Recently viewed styles
  recentCard: {
    width: 140,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
    marginRight: Theme.spacing.md,
  },
  recentThumb: {
    height: 90,
    width: '100%',
  },
  recentInfo: {
    padding: Theme.spacing.sm,
    gap: 2,
  },
  recentPrice: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  recentTitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
  },
  recentLocation: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  horizontalList: {
    paddingLeft: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
  },
});
