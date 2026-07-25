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
import { SkeletonDashboard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { useHaptics } from '../../hooks/useHaptics';
import { ArrowLeft, PlusCircle, Eye, Heart, Phone, Trash2, Video } from 'lucide-react-native';
import { PropertyListing } from '../../types';
import { localityIntelligence } from '../../domain/location/localityIntelligence';
import { marketInsights } from '../../domain/location/marketInsights';

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
  const haptics = useHaptics();

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
              <Text style={styles.listingPrice}>
                {formatCurrency(item.price)}
                {item.listingType === 'rent' && <Text style={{ fontSize: 10, color: Theme.colors.textSecondary }}>/mo</Text>}
              </Text>
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
            <Text style={styles.listingCity}>{item.locality ? `${item.locality}, ${item.city}` : item.city}</Text>
            
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

        {/* Marketplace Positioning Insights */}
        {(() => {
          const allItems = stats?.listings || [];
          const metrics = item.locality 
            ? localityIntelligence.calculateLocalityMetrics(allItems, item.locality)
            : null;
          const insights = metrics 
            ? marketInsights.calculateMarketInsights(item, metrics, allItems)
            : null;

          if (!insights) return null;
          return (
            <View style={styles.positioningContainer}>
              <Text style={styles.positioningTitle}>Locality Market Positioning</Text>
              <View style={styles.positioningGrid}>
                <View style={styles.posCell}>
                  <Text style={styles.posLabel}>Pricing vs Locality</Text>
                  <Text style={[
                    styles.posValue,
                    insights.priceVsLocalityAveragePct <= 0 ? { color: Theme.colors.success } : { color: Theme.colors.danger }
                  ]}>
                    {insights.priceVsLocalityAveragePct <= 0 
                      ? `${Math.abs(insights.priceVsLocalityAveragePct)}% below` 
                      : `${insights.priceVsLocalityAveragePct}% above`}
                  </Text>
                </View>
                <View style={styles.posCell}>
                  <Text style={styles.posLabel}>Size vs Area Avg</Text>
                  <Text style={styles.posValue}>
                    {insights.sizeVsLocalityAveragePct >= 0 
                      ? `${insights.sizeVsLocalityAveragePct}% larger` 
                      : `${Math.abs(insights.sizeVsLocalityAveragePct)}% smaller`}
                  </Text>
                </View>
                <View style={styles.posCell}>
                  <Text style={styles.posLabel}>Listing Rank</Text>
                  <Text style={[styles.posValue, { color: Theme.colors.primary }]}>
                    Top {insights.qualityPercentile}%
                  </Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* Listing Health Scorecard & Suggestions */}
        <View style={styles.healthContainer}>
          <View style={styles.healthHeader}>
            <Text style={styles.healthLabel}>Listing Quality Health</Text>
            <Text style={[
              styles.healthScoreValue,
              (item.healthScore || 0) > 80 ? styles.healthGood : (item.healthScore || 0) > 50 ? styles.healthMedium : styles.healthPoor
            ]}>
              {item.healthScore || 0}%
            </Text>
          </View>
          <View style={styles.healthBarBg}>
            <View style={[
              styles.healthBarFill,
              { width: `${item.healthScore || 0}%` },
              (item.healthScore || 0) > 80 ? { backgroundColor: Theme.colors.success } : (item.healthScore || 0) > 50 ? { backgroundColor: '#DD6B20' } : { backgroundColor: Theme.colors.danger }
            ]} />
          </View>
          {item.healthSuggestions && item.healthSuggestions.length > 0 && (
            <View style={styles.suggestionsList}>
              <Text style={styles.suggestionsTitle}>Improvement suggestions:</Text>
              {item.healthSuggestions.slice(0, 2).map((sug, idx) => (
                <Text key={idx} style={styles.suggestionItem}>
                  • {sug.text} <Text style={styles.boostText}>(+{sug.boost}% views)</Text>
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Marketplace Integrity & Verification */}
        <View style={styles.verificationContainer}>
          <Text style={styles.verificationTitle}>Marketplace Health</Text>
          
          <View style={styles.verificationRow}>
            <View style={styles.verificationInfo}>
              <Text style={styles.verificationLabel}>
                {item.healthStatus === 'excellent' ? 'Excellent Health' :
                 item.healthStatus === 'good' ? 'Good Health' :
                 item.healthStatus === 'needs_attention' ? 'Needs Attention' : 
                 item.healthStatus === 'poor' ? 'Poor Health' : 'Health Score Pending'}
              </Text>
              {item.healthBreakdown && Object.keys(item.healthBreakdown).length > 0 && (
                <Text style={styles.verificationDate}>
                  {Object.values(item.healthBreakdown)[0] as string}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.verificationRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 }]}>
            <View style={styles.verificationInfo}>
              <Text style={styles.verificationLabel}>
                {item.verificationStatus === 'inactive_unverified' ? 'Deactivated (Unverified)' : 
                 item.verificationStatus === 'awaiting_verification' ? 'Verification Due' :
                 item.verificationStatus === 'grace_period' ? 'Verification Overdue' : 'Active'}
              </Text>
              <Text style={styles.verificationDate}>
                {item.lastVerifiedAt 
                  ? `Last verified: ${new Date(item.lastVerifiedAt).toLocaleDateString()}` 
                  : 'Not verified yet'}
              </Text>
            </View>
            
            {item.verificationStatus === 'inactive_unverified' && (
              <Button
                variant="primary"
                style={styles.reactivateBtn}
                onPress={async () => {
                  setDialogLoading(true);
                  try {
                    await propertyService.submitVerification(item.id, profile!.id, 'verified_available', item.nextVerificationAt || new Date().toISOString());
                    haptics.success();
                    await fetchDashboardStats();
                  } catch (e: any) {
                    alert('Failed to reactivate: ' + e.message);
                  } finally {
                    setDialogLoading(false);
                  }
                }}
              >
                Reactivate
              </Button>
            )}
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
      <ScreenContainer style={styles.container}>
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
        <SkeletonDashboard />
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
            <EmptyState
              icon={Video}
              title="Publish your first property."
              description="List walkthrough videos and get direct leads today."
              onAction={() => router.push('/owner/upload' as any)}
              actionLabel="Create Listing"
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
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
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
    fontSize: Theme.typography.sizes.h3,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  kpiLabel: {
    fontSize: Theme.typography.sizes.xs,
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
    fontFamily: Theme.typography.fontFamilyBold,
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
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  badge: {
    backgroundColor: Theme.colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.xs,
  },
  badgeText: {
    fontSize: Theme.typography.sizes.xxs,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
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
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
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
    fontSize: Theme.typography.sizes.xs,
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
  healthContainer: {
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginVertical: Theme.spacing.xs,
    gap: 4,
    borderRadius: Theme.borderRadius.sm,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  healthScoreValue: {
    fontSize: 13,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  healthGood: {
    color: Theme.colors.success,
  },
  healthMedium: {
    color: '#DFB978',
  },
  healthPoor: {
    color: Theme.colors.danger,
  },
  healthBarBg: {
    height: 6,
    backgroundColor: Theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  suggestionsList: {
    marginTop: 4,
    gap: 2,
  },
  suggestionsTitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wide,
  },
  suggestionItem: {
    fontSize: 11,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  boostText: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  positioningContainer: {
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    gap: 4,
    borderRadius: Theme.borderRadius.sm,
  },
  positioningTitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wide,
  },
  positioningGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  posCell: {
    flex: 1,
    alignItems: 'center',
  },
  posLabel: {
    fontSize: Theme.typography.sizes.xxs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  posValue: {
    fontSize: 11,
    fontFamily: Theme.typography.fontFamilyBold,
    marginTop: 2,
    color: Theme.colors.textPrimary,
  },
  verificationContainer: {
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    gap: 4,
    borderRadius: Theme.borderRadius.sm,
  },
  verificationTitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wide,
  },
  verificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  verificationInfo: {
    flex: 1,
  },
  verificationLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  verificationDate: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: 2,
  },
  reactivateBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    height: 'auto',
  },
});
