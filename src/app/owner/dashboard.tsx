import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';

import { Image } from 'expo-image';
import { Button } from '../../components/Button';
import { FeedbackState } from '../../components/FeedbackState';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { FloatingDock } from '../../components/FloatingDock';
import { APP_TABS } from '../../navigation/tabs';
import { hapticsService } from '../../services/hapticsService';

import { useProfile } from '../../hooks/useProfile';
import { useProperties } from '../../hooks/useProperties';
import { propertyService } from '../../services/propertyService';
import { Theme } from '../../theme';
import { formatCurrency } from '../../utils';
import { ArrowLeft, PlusCircle, Eye, Heart, Phone, Trash2 } from 'lucide-react-native';
import { PropertyListing } from '../../types';

export default function OwnerDashboardScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const handleTabPress = (key: string) => {
    const tab = APP_TABS.find((t) => t.key === key);
    if (tab && tab.key !== 'owner-dashboard') {
      hapticsService.selection();
      router.replace(tab.route as any);
    }
  };

  const { profile } = useProfile();
  const { deleteListing, archiveListing, restoreListing } = useProperties();

  const [stats, setStats] = useState<{
    totalListings: number;
    publishedListings: number;
    archivedListings: number;
    totalViews: number;
    totalSaves: number;
    totalContacts: number;
    listings: PropertyListing[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'archived' | 'draft'>('all');

  // Deletion / Archiving confirmation dialog states
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  const fetchDashboardStats = useCallback(async () => {
    if (!profile?.id) return;
    setError(false);
    try {
      const data = await propertyService.getOwnerDashboardStats(profile.id);
      setStats(data);
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchDashboardStats();
    
    // Refresh stats when the screen gains focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardStats();
    });
    return unsubscribe;
  }, [navigation, fetchDashboardStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  // Perform listing deletion with atomic rollback safety
  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    setDialogLoading(true);
    try {
      await deleteListing(confirmDeleteId);
      setConfirmDeleteId(null);
      await fetchDashboardStats();
    } catch (e: any) {
      alert(e.message || 'Deletion failed. Please try again.');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!confirmArchiveId) return;
    setDialogLoading(true);
    try {
      await archiveListing(confirmArchiveId);
      setConfirmArchiveId(null);
      await fetchDashboardStats();
    } catch (e: any) {
      alert(e.message || 'Archiving failed. Please try again.');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!confirmRestoreId) return;
    setDialogLoading(true);
    try {
      await restoreListing(confirmRestoreId);
      setConfirmRestoreId(null);
      await fetchDashboardStats();
    } catch (e: any) {
      alert(e.message || 'Restoring failed. Please try again.');
    } finally {
      setDialogLoading(false);
    }
  };

  const renderListingItem = (item: PropertyListing) => {
    const isDraft = item.status === 'draft';
    const isArchived = item.status === 'archived';
    
    return (
      <Card key={item.id} style={styles.listingCard}>
        <View style={styles.listingContent}>
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.thumbnail}
            contentFit="cover"
          />
          <View style={styles.listingInfo}>
            <View style={styles.statusRow}>
              <Text style={styles.listingPrice}>{formatCurrency(item.price)}</Text>
              <View
                style={[
                  styles.badge,
                  isDraft && styles.draftBadge,
                  isArchived && styles.archivedBadge,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isDraft && styles.draftBadgeText,
                    isArchived && styles.archivedBadgeText,
                  ]}
                >
                  {item.status || 'Published'}
                </Text>
              </View>
            </View>

            <Text style={styles.listingTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.listingCity}>{item.city}</Text>
            
            <View style={styles.analyticsRow}>
              <View style={styles.statMini}>
                <Eye size={12} color={Theme.colors.textSecondary} />
                <Text style={styles.statMiniText}>{item.viewCount || 0}</Text>
              </View>
              <View style={styles.statMini}>
                <Heart size={12} color={Theme.colors.textSecondary} />
                <Text style={styles.statMiniText}>{item.saveCount || 0}</Text>
              </View>
              <View style={styles.statMini}>
                <Phone size={12} color={Theme.colors.textSecondary} />
                <Text style={styles.statMiniText}>{item.contactCount || 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionButtons}>
          <Button
            variant="secondary"
            style={styles.actionBtn}
            onPress={() => router.push(`/property/${item.id}` as any)}
          >
            View
          </Button>

          <Button
            variant="secondary"
            style={styles.actionBtn}
            onPress={() => router.push(`/owner/upload?id=${item.id}` as any)}
          >
            Edit
          </Button>

          {isArchived ? (
            <Button
              variant="secondary"
              style={styles.actionBtn}
              onPress={() => setConfirmRestoreId(item.id)}
            >
              Restore
            </Button>
          ) : (
            <Button
              variant="secondary"
              style={styles.actionBtn}
              onPress={() => setConfirmArchiveId(item.id)}
              disabled={isDraft}
            >
              Archive
            </Button>
          )}

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => setConfirmDeleteId(item.id)}
          >
            <Trash2 size={16} color={Theme.colors.danger} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Fetching analytics metrics...</Text>
      </ScreenContainer>
    );
  }

  if (error || !stats) {
    return (
      <ScreenContainer style={styles.center}>
        <FeedbackState type="error" onRetry={fetchDashboardStats} />
      </ScreenContainer>
    );
  }

  const filteredListings = stats.listings.filter((item) => {
    if (activeTab === 'published') return item.status === 'published' || !item.status;
    if (activeTab === 'archived') return item.status === 'archived';
    if (activeTab === 'draft') return item.status === 'draft';
    return true;
  });

  return (
    <ScreenContainer style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/profile' as any)}>
          <ArrowLeft size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Host Dashboard</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/owner/upload' as any)}
        >
          <PlusCircle size={24} color={Theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />
        }
      >
        {/* KPI Panel */}
        <View style={styles.kpiContainer}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{stats.totalViews}</Text>
            <Text style={styles.kpiLabel}>Views</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{stats.totalSaves}</Text>
            <Text style={styles.kpiLabel}>Saves</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{stats.totalContacts}</Text>
            <Text style={styles.kpiLabel}>Contacts</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{stats.listings.filter((l) => l.status === 'published' || !l.status).length}</Text>
            <Text style={styles.kpiLabel}>Published</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{stats.listings.filter((l) => l.status === 'published' || !l.status).length}</Text>
            <Text style={styles.kpiLabel}>Active Listings</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{stats.listings.filter((l) => l.status === 'archived').length}</Text>
            <Text style={styles.kpiLabel}>Archived</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{stats.listings.filter((l) => l.status === 'draft').length}</Text>
            <Text style={styles.kpiLabel}>Drafts</Text>
          </Card>
        </View>

        {/* Tab Filters */}
        <View style={styles.tabsRow}>
          {(['all', 'published', 'archived', 'draft'] as const).map((tab) => {
            const isActive = activeTab === tab;
            let count = stats.totalListings;
            if (tab === 'published') count = stats.publishedListings;
            if (tab === 'archived') count = stats.archivedListings;
            if (tab === 'draft') count = stats.listings.filter((l) => l.status === 'draft').length;

            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Listings Display */}
        {filteredListings.length > 0 ? (
          <View style={styles.listingsList}>
            {filteredListings.map(renderListingItem)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <FeedbackState
              type="empty-listings"
              title="Publish your first property."
              subtitle="List walkthrough videos and get direct leads today."
              onRetry={() => router.push('/owner/upload' as any)}
              actionText="Create Listing"
            />
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modals */}
      <ConfirmationDialog
        visible={!!confirmDeleteId}
        title="Delete Property Tour?"
        message="This will permanently delete the walkthrough listing record and erase all media assets from Supabase Storage. This action is irreversible."
        confirmText={dialogLoading ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => !dialogLoading && setConfirmDeleteId(null)}
      />

      <ConfirmationDialog
        visible={!!confirmArchiveId}
        title="Archive Property Listing?"
        message="This listing will be hidden from the feed and search search options immediately. You can restore it anytime."
        confirmText={dialogLoading ? "Archiving..." : "Archive"}
        cancelText="Cancel"
        onConfirm={handleArchiveConfirm}
        onCancel={() => !dialogLoading && setConfirmArchiveId(null)}
      />

      <ConfirmationDialog
        visible={!!confirmRestoreId}
        title="Restore Property Listing?"
        message="This listing will be made live and visible again on the Feed and search indexes."
        confirmText={dialogLoading ? "Restoring..." : "Restore"}
        cancelText="Cancel"
        onConfirm={handleRestoreConfirm}
        onCancel={() => !dialogLoading && setConfirmRestoreId(null)}
      />

      <FloatingDock
        tabs={APP_TABS}
        activeTab="owner-dashboard"
        onTabPress={handleTabPress}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
  },
  loadingText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    gap: Theme.spacing.md,
  },
  backBtn: {
    padding: Theme.spacing.xs,
  },
  title: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    flex: 1,
  },
  addBtn: {
    padding: Theme.spacing.xs,
  },
  scrollContent: {
    paddingBottom: Theme.floatingDock.height + Theme.spacing.xxxl * 2,
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.lg,
    gap: Theme.spacing.lg,
  },
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  kpiCard: {
    width: '47%',
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  kpiVal: {
    fontSize: 22,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
  },
  kpiLabel: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'uppercase',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: Theme.spacing.xs,
    gap: Theme.spacing.sm,
  },
  tabBtn: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: Theme.colors.primary,
  },
  tabText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'capitalize',
  },
  tabTextActive: {
    color: Theme.colors.primary,
    fontWeight: Theme.typography.weights.bold,
  },
  listingsList: {
    gap: Theme.spacing.md,
  },
  listingCard: {
    backgroundColor: Theme.colors.surface,
    borderColor: Theme.colors.border,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  listingContent: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  listingInfo: {
    flex: 1,
    gap: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listingPrice: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
  },
  badge: {
    backgroundColor: Theme.colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.xs,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'capitalize',
  },
  draftBadge: {
    backgroundColor: '#3b82f615',
  },
  draftBadgeText: {
    color: '#3b82f6',
  },
  archivedBadge: {
    backgroundColor: '#eab30815',
  },
  archivedBadgeText: {
    color: '#eab308',
  },
  listingTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: Theme.typography.weights.semiBold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  listingCity: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  analyticsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: 4,
  },
  statMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statMiniText: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    height: 32,
    paddingVertical: 0,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.sm,
    borderColor: Theme.colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
  },
  emptyContainer: {
    paddingVertical: Theme.spacing.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});
