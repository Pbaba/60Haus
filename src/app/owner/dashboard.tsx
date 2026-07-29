import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, PlusCircle, Eye, Heart, MessageCircle, Calendar } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { FeedbackState } from '../../components/FeedbackState';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { FloatingDock } from '../../components/FloatingDock';
import { SkeletonDashboard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';

import { APP_TABS } from '../../navigation/tabs';
import { Theme } from '../../theme';
import { formatCurrency } from '../../utils';
import { PropertyListing } from '../../types';

import { useProfile } from '../../hooks/useProfile';
import { useProperties } from '../../hooks/useProperties';
import { propertyService } from '../../services/propertyService';
import { hapticsService } from '../../services/hapticsService';

// Analytics Imports
import { useDashboard, useListingAnalytics } from '../../features/analytics/hooks/useDashboard';
import { useInsights } from '../../features/analytics/hooks/useInsights';
import { MetricCard } from '../../features/analytics/components/MetricCard';
import { TrendChart } from '../../features/analytics/components/TrendChart';
import { FunnelChart } from '../../features/analytics/components/FunnelChart';
import { HealthAdvisor } from '../../features/analytics/components/HealthAdvisor';
import { AchievementCard } from '../../features/analytics/components/AchievementCard';
import { AudienceInsights } from '../../features/analytics/components/AudienceInsights';

function ListingAnalyticsSection({ propertyId }: { propertyId: string }) {
  const { loading, stats, funnel } = useListingAnalytics(propertyId);
  const { suggestions } = useInsights(stats);

  if (loading) return null;

  return (
    <View style={styles.analyticsSection}>
      <Text style={styles.sectionSubtitle}>Analytics & Conversion</Text>
      
      {/* Funnel */}
      {funnel && (
        <View style={styles.funnelWrapper}>
          <FunnelChart data={[
            { label: 'Views', value: funnel.views, color: Theme.colors.primary },
            { label: 'Saves', value: funnel.saves, color: '#3b82f6' },
            { label: 'Msgs', value: funnel.messages, color: '#8b5cf6' },
            { label: 'Visits', value: funnel.visits, color: '#ec4899' }
          ]} />
        </View>
      )}

      {/* Health Advisor */}
      {stats && (
        <HealthAdvisor 
          score={stats.health_score} 
          suggestions={suggestions} 
        />
      )}
    </View>
  );
}

export default function OwnerDashboardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { profile } = useProfile();
  
  const { deleteListing, archiveListing, restoreListing } = useProperties();
  const { ownerStats, achievements, loading: analyticsLoading, onRefresh: refreshAnalytics } = useDashboard();

  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'archived' | 'draft'>('all');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!profile?.id) return;
    setError(false);
    try {
      const data = await propertyService.getOwnerDashboardStats(profile.id);
      setProperties(data.listings);
    } catch {
      console.error('Failed to load listings');
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchListings();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchListings();
    });
    return unsubscribe;
  }, [navigation, fetchListings]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshAnalytics();
    fetchListings();
  };

  const handleTabPress = (key: string) => {
    const tab = APP_TABS.find((t) => t.key === key);
    if (tab && tab.key !== 'owner-dashboard') {
      hapticsService.selection();
      router.replace(tab.route as any);
    }
  };

  const handleListingAction = async (action: 'delete' | 'archive' | 'restore', id: string) => {
    setDialogLoading(true);
    try {
      if (action === 'delete') await deleteListing(id);
      if (action === 'archive') await archiveListing(id);
      if (action === 'restore') await restoreListing(id);
      
      setConfirmDeleteId(null);
      setConfirmArchiveId(null);
      setConfirmRestoreId(null);
      await fetchListings();
    } catch {
      alert(`${action} failed. Please try again.`);
    } finally {
      setDialogLoading(false);
    }
  };

  if (loading || analyticsLoading) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/profile' as any)}>
            <ArrowLeft size={24} color={Theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Performance</Text>
        </View>
        <SkeletonDashboard />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer style={styles.center}>
        <FeedbackState type="error" onRetry={fetchListings} />
      </ScreenContainer>
    );
  }

  const filteredListings = properties.filter((item) => {
    if (activeTab === 'published') return item.status === 'published' || !item.status;
    if (activeTab === 'archived') return item.status === 'archived';
    if (activeTab === 'draft') return item.status === 'draft';
    return true;
  });

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/profile' as any)}>
          <ArrowLeft size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Performance Console</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/owner/upload' as any)}>
          <PlusCircle size={24} color={Theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        {/* Marketplace Insights (Overall) */}
        {ownerStats && (
          <View style={styles.overviewSection}>
            <View style={styles.metricsGrid}>
              <MetricCard title="Total Views" value={ownerStats.total_views} icon={Eye} trend={12} highlight />
              <MetricCard title="Total Saves" value={ownerStats.total_saves} icon={Heart} trend={5} />
              <MetricCard title="Leads Generated" value={ownerStats.total_leads} icon={MessageCircle} />
              <MetricCard title="Avg Response" value={`${ownerStats.avg_response_time_minutes}m`} icon={Calendar} trend={-15} trendLabel="Faster than avg" />
            </View>

            <View style={styles.chartWrapper}>
              <Text style={styles.sectionSubtitle}>Audience Trend (Last 30 Days)</Text>
              {/* Using dummy trend data for the global level until backend aggregations are complete */}
              <TrendChart data={[10, 25, 18, 40, 60, 45, 80, 95, 110, 85, 130, 160]} height={140} color={Theme.colors.primary} />
            </View>

            <AudienceInsights />

            <AchievementCard achievements={achievements} />
          </View>
        )}

        {/* Listing Filters */}
        <View style={styles.tabsRow}>
          {(['all', 'published', 'archived', 'draft'] as const).map((tab) => {
            const isActive = activeTab === tab;
            let count = properties.length;
            if (tab === 'published') count = properties.filter(l => l.status === 'published' || !l.status).length;
            if (tab === 'archived') count = properties.filter(l => l.status === 'archived').length;
            if (tab === 'draft') count = properties.filter(l => l.status === 'draft').length;

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
            {filteredListings.map(item => (
              <Card key={item.id} style={styles.listingCard}>
                <View style={styles.listingHeader}>
                  <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} contentFit="cover" />
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.listingCity}>{item.locality || item.city}</Text>
                    <Text style={styles.listingPrice}>{formatCurrency(item.price)}</Text>
                  </View>
                </View>

                {/* Listing Specific Analytics */}
                <ListingAnalyticsSection propertyId={item.id} />

                {/* Actions */}
                <View style={styles.actionButtons}>
                  <Button variant="secondary" style={styles.actionBtn} onPress={() => router.push(`/owner/upload?id=${item.id}` as any)}>
                    Edit
                  </Button>
                  {item.status === 'archived' ? (
                    <Button variant="secondary" style={styles.actionBtn} onPress={() => setConfirmRestoreId(item.id)}>Restore</Button>
                  ) : (
                    <Button variant="secondary" style={styles.actionBtn} onPress={() => setConfirmArchiveId(item.id)} disabled={item.status === 'draft'}>Archive</Button>
                  )}
                  <Button variant="secondary" style={[styles.actionBtn, styles.deleteBtn]} onPress={() => setConfirmDeleteId(item.id)}>Delete</Button>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState title="No properties found." description="You haven't listed any properties yet." actionLabel="Create Listing" onAction={() => router.push('/owner/upload' as any)} />
        )}
      </ScrollView>

      {/* Dialogs */}
      <ConfirmationDialog
        visible={!!confirmDeleteId}
        title="Delete Property?"
        message="This is irreversible."
        confirmText={dialogLoading ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        destructive
        onConfirm={() => handleListingAction('delete', confirmDeleteId!)}
        onCancel={() => !dialogLoading && setConfirmDeleteId(null)}
      />
      <ConfirmationDialog
        visible={!!confirmArchiveId}
        title="Archive Property?"
        message="It will be hidden from the public feed."
        confirmText={dialogLoading ? "Archiving..." : "Archive"}
        cancelText="Cancel"
        onConfirm={() => handleListingAction('archive', confirmArchiveId!)}
        onCancel={() => !dialogLoading && setConfirmArchiveId(null)}
      />
      <ConfirmationDialog
        visible={!!confirmRestoreId}
        title="Restore Property?"
        message="It will be visible on the public feed."
        confirmText={dialogLoading ? "Restoring..." : "Restore"}
        cancelText="Cancel"
        onConfirm={() => handleListingAction('restore', confirmRestoreId!)}
        onCancel={() => !dialogLoading && setConfirmRestoreId(null)}
      />

      <FloatingDock tabs={APP_TABS} activeTab="owner-dashboard" onTabPress={handleTabPress} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Theme.spacing.xl, 
    paddingVertical: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.border
  },
  backBtn: { padding: Theme.spacing.xs, marginRight: Theme.spacing.md },
  addBtn: { padding: Theme.spacing.xs },
  title: { fontSize: Theme.typography.sizes.md, fontFamily: Theme.typography.fontFamilyBold, flex: 1, color: Theme.colors.textPrimary },
  scrollContent: { paddingBottom: 120, paddingHorizontal: Theme.spacing.xl, paddingTop: Theme.spacing.lg },
  overviewSection: { gap: Theme.spacing.lg, marginBottom: Theme.spacing.xl },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.md },
  chartWrapper: { backgroundColor: Theme.colors.surface, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.md, borderWidth: 1, borderColor: Theme.colors.border },
  sectionSubtitle: { fontSize: Theme.typography.sizes.sm, fontFamily: Theme.typography.fontFamilyBold, color: Theme.colors.textPrimary, marginBottom: Theme.spacing.sm },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Theme.colors.border, marginBottom: Theme.spacing.md },
  tabBtn: { paddingVertical: Theme.spacing.sm, paddingHorizontal: Theme.spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: Theme.colors.primary },
  tabText: { fontSize: Theme.typography.sizes.xs, color: Theme.colors.textSecondary, fontFamily: Theme.typography.fontFamily, textTransform: 'capitalize' },
  tabTextActive: { color: Theme.colors.primary, fontFamily: Theme.typography.fontFamilyBold },
  listingsList: { gap: Theme.spacing.lg },
  listingCard: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, gap: Theme.spacing.md },
  listingHeader: { flexDirection: 'row', gap: Theme.spacing.md },
  thumbnail: { width: 80, height: 80, borderRadius: Theme.borderRadius.sm, backgroundColor: Theme.colors.backgroundSecondary },
  listingInfo: { flex: 1, gap: 4, justifyContent: 'center' },
  listingTitle: { fontSize: Theme.typography.sizes.sm, color: Theme.colors.textPrimary, fontFamily: Theme.typography.fontFamilyBold },
  listingCity: { fontSize: Theme.typography.sizes.xs, color: Theme.colors.textSecondary, fontFamily: Theme.typography.fontFamily },
  listingPrice: { fontSize: Theme.typography.sizes.sm, color: Theme.colors.primary, fontFamily: Theme.typography.fontFamilyBold },
  analyticsSection: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: Theme.borderRadius.sm, padding: Theme.spacing.md },
  funnelWrapper: { marginTop: Theme.spacing.sm },
  actionButtons: { flexDirection: 'row', gap: Theme.spacing.sm },
  actionBtn: { flex: 1, height: 36, paddingVertical: 0 },
  deleteBtn: { borderColor: Theme.colors.danger, color: Theme.colors.danger }
});
