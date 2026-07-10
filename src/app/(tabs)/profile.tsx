import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { FeedbackState } from '../../components/FeedbackState';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useProperties } from '../../hooks/useProperties';
import { Theme } from '../../theme';
import { ChevronRight, Settings, HelpCircle, Heart, PlusCircle, Building, User, Trash2 } from 'lucide-react-native';
import { formatCurrency } from '../../utils';
import { Image } from 'expo-image';
import { Button } from '../../components/Button';

export default function ProfileScreen() {
  const router = useRouter();
  const { isGuest } = useAuth();
  const { profile, upgradeToOwner } = useProfile();
  const { properties, savedIds, deleteListing } = useProperties();
  const isOwner = profile?.role === 'owner';

  const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Filter listings published by this owner
  const myListings = properties.filter((item) => item.ownerId === profile?.id);
  const publishedListingsCount = myListings.filter(item => !item.status || item.status === 'published').length;
  const draftListingsCount = myListings.filter(item => item.status === 'draft').length;

  const displayedListings = myListings.filter((item) => {
    if (activeFilter === 'published') return !item.status || item.status === 'published';
    if (activeFilter === 'draft') return item.status === 'draft';
    return true;
  });

  const navigateToSettings = () => {
    router.push('/settings' as any);
  };

  const handleBecomeOwner = async () => {
    try {
      await upgradeToOwner();
      alert('Congratulations! You are now listed as a Property Owner.');
    } catch {
      // Errors handled inside context alert callbacks
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to permanently delete this listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteListing(id);
              Alert.alert('Success', 'Listing deleted.');
            } catch {
              Alert.alert('Error', 'Failed to delete listing.');
            }
          },
        },
      ]
    );
  };

  const renderListingItem = (item: typeof properties[0]) => {
    const isDraft = item.status === 'draft';
    return (
      <Card key={item.id} style={styles.listingItem}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.listingItemContent}
          onPress={() => router.push(`/owner/upload?id=${item.id}` as any)}
        >
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.listingThumb}
            contentFit="cover"
          />
          <View style={styles.listingInfo}>
            <Text style={styles.listingPrice}>{formatCurrency(item.price)}</Text>
            <Text style={styles.listingTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, isDraft ? styles.draftBadge : styles.publishedBadge]}>
                <Text style={[styles.statusBadgeText, isDraft ? styles.draftBadgeText : styles.publishedBadgeText]}>
                  {isDraft ? 'Draft' : 'Published'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteListingBtn} onPress={() => handleDelete(item.id)}>
          <Trash2 size={18} color={Theme.colors.danger} />
        </TouchableOpacity>
      </Card>
    );
  };

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
            <Text style={styles.statNum}>{savedIds.length}</Text>
            <Text style={styles.statLabel}>Saved Homes</Text>
          </View>
          {isOwner && (
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{myListings.length}</Text>
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
            <Text style={styles.sectionHeader}>My Listings Dashboard</Text>
            <TouchableOpacity onPress={() => router.push('/owner/upload' as any)} activeOpacity={0.9} style={styles.ctaWrapper}>
              <Card style={styles.listingsCTA}>
                <PlusCircle size={20} color={Theme.colors.primary} />
                <View style={styles.ctaTextContainer}>
                  <Text style={styles.ctaTitle}>Add New Listing</Text>
                  <Text style={styles.ctaSub}>Publish a vertical property tour.</Text>
                </View>
                <ChevronRight size={18} color={Theme.colors.textSecondary} />
              </Card>
            </TouchableOpacity>

            {/* Dashboard Tabs Filters */}
            <View style={styles.tabFilters}>
              {(['all', 'published', 'draft'] as const).map((filter) => {
                const isActive = activeFilter === filter;
                let count = myListings.length;
                if (filter === 'published') count = publishedListingsCount;
                if (filter === 'draft') count = draftListingsCount;

                return (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.tabFilterBtn, isActive && styles.tabFilterBtnActive]}
                    onPress={() => setActiveFilter(filter)}
                  >
                    <Text style={[styles.tabFilterText, isActive && styles.tabFilterTextActive]}>
                      {filter} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {displayedListings.length > 0 ? (
              <View style={styles.listingsContainer}>
                {displayedListings.map(renderListingItem)}
              </View>
            ) : (
              <FeedbackState type="empty-listings" />
            )}
          </View>
        )}

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
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    letterSpacing: -0.5,
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
    fontWeight: Theme.typography.weights.medium,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'uppercase',
  },
  bio: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: 20,
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
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
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
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
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
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    backgroundColor: Theme.colors.backgroundSecondary,
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
    fontWeight: Theme.typography.weights.bold,
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
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
  },
  listingTitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  statusRow: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
  },
  statusBadgeText: {
    fontFamily: Theme.typography.fontFamily,
  },
  publishedBadge: {
    backgroundColor: Theme.colors.success + '20',
  },
  publishedBadgeText: {
    color: Theme.colors.success,
    fontSize: 10,
    fontWeight: Theme.typography.weights.bold,
  },
  draftBadge: {
    backgroundColor: Theme.colors.border,
  },
  draftBadgeText: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: Theme.typography.weights.bold,
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
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  guestSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: 20,
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
});
