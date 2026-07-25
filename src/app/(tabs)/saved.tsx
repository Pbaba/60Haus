import React, { useCallback, useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FeedbackState } from '../../components/FeedbackState';
import { Theme } from '../../theme';
import { PropertyContext } from '../../context/PropertyContext';
import { useAuth } from '../../hooks/useAuth';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Trash2,
  FolderPlus,
  Pin,
  Bell,
  Search,
  History,
  ChevronRight,
  BookOpen,
} from 'lucide-react-native';
import { savedSearchService } from '../../services/savedSearchService';
import { alertService } from '../../services/alertService';
import { historyService } from '../../services/historyService';
import { SavedSearch, PropertyListing } from '../../types';
import { useFeedback } from '../../context/FeedbackContext';
import { analyticsService } from '../../services/analyticsService';
import { CollectionCard } from '../../features/discovery/components/CollectionCard';

export default function SavedScreen() {
  const router = useRouter();
  const context = useContext(PropertyContext);
  const { user, isGuest } = useAuth();
  const { showToast } = useFeedback();

  const [activeTab, setActiveTab] = useState<'collections' | 'searches' | 'alerts'>('collections');
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recentViews, setRecentViews] = useState<PropertyListing[]>([]);

  // Create Collection Modal States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  // Fallbacks if context is unmounted
  const collections = context?.collections || [];
  const fetchCollections = context?.fetchCollections || (() => Promise.resolve());
  const createCollection = context?.createCollection || (() => Promise.resolve({} as any));
  const deleteCollection = context?.deleteCollection || (() => Promise.resolve());
  const setFilters = context?.setFilters || (() => {});

  // Load all components data
  const loadPersonalData = useCallback(async () => {
    if (isGuest || !user) return;
    try {
      // 1. Refresh collections
      await fetchCollections();

      // 2. Fetch saved searches
      const searches = await savedSearchService.getSavedSearches(user.id);
      setSavedSearches(searches);

      // 3. Fetch alerts
      const alertSubs = await alertService.getAlerts(user.id);
      setAlerts(alertSubs);

      // 4. Fetch history
      const history = await historyService.getRecentViews(user.id);
      setRecentViews(history);
    } catch {
      console.error('Failed to load personal metadata');
    }
  }, [user, isGuest, fetchCollections]);

  // Trigger load when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadPersonalData();
    }, [loadPersonalData]),
  );

  const handleCreateCollection = async () => {
    if (!newColName.trim()) {
      showToast('Collection name is required.');
      return;
    }
    try {
      const col = await createCollection(newColName.trim(), newColDesc.trim());
      analyticsService.trackCollectionCreated(col.id, col.name);
      setNewColName('');
      setNewColDesc('');
      setCreateModalVisible(false);
      showToast('Collection created successfully.');
    } catch {
      showToast('Failed to create collection.');
    }
  };



  // Run a saved search filters preset
  const handleExecuteSearch = (search: SavedSearch) => {
    setFilters(search.filters);
    analyticsService.trackSavedSearchExecuted(search.name || '');
    showToast(`Running saved preset: ${search.name}`);
    router.replace('/(tabs)' as any); // Navigate to Feed with filters pre-filled
  };

  const handleTogglePinSearch = async (search: SavedSearch) => {
    try {
      const nextPinState = !search.isPinned;
      await savedSearchService.togglePinSavedSearch(search.id, nextPinState);
      setSavedSearches((prev) =>
        prev
          .map((s) => (s.id === search.id ? { ...s, isPinned: nextPinState } : s))
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)),
      );
      showToast(nextPinState ? 'Search pinned to top' : 'Search unpinned');
    } catch {
      showToast('Failed to update pinned state');
    }
  };

  const handleDeleteSearch = (id: string) => {
    Alert.alert('Delete Saved Search', 'Remove this search preset?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await savedSearchService.deleteSavedSearch(id);
            setSavedSearches((prev) => prev.filter((s) => s.id !== id));
            showToast('Search preset removed');
          } catch {
            showToast('Failed to delete search');
          }
        },
      },
    ]);
  };

  const handleToggleAlert = async (alertId: string, currentStatus: boolean) => {
    try {
      await alertService.toggleAlert(alertId, !currentStatus);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isActive: !currentStatus } : a)),
      );
      showToast(!currentStatus ? 'Alerts activated' : 'Alerts muted');
    } catch {
      showToast('Failed to update alert state');
    }
  };

  const handleDeleteAlert = (alertId: string) => {
    Alert.alert('Delete Alert', 'Are you sure you want to cancel this search alert?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Cancel Alert',
        style: 'destructive',
        onPress: async () => {
          try {
            await alertService.deleteAlert(alertId);
            analyticsService.trackAlertDeleted(alertId);
            setAlerts((prev) => prev.filter((a) => a.id !== alertId));
            showToast('Alert canceled');
          } catch {
            showToast('Failed to cancel alert');
          }
        },
      },
    ]);
  };

  const handleClearHistory = async () => {
    if (!user) return;
    Alert.alert('Clear History', 'Wipe your recently viewed properties?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            await historyService.clearHistory(user.id);
            setRecentViews([]);
            showToast('Browsing history cleared');
          } catch {
            showToast('Failed to clear history');
          }
        },
      },
    ]);
  };

  if (isGuest || !user) {
    return (
      <ScreenContainer style={styles.container}>
        <FeedbackState
          type="empty-saved"
          title="Sign In to Save Properties"
          subtitle="Keep track of your favorite home walkthroughs by creating an account."
        />
      </ScreenContainer>
    );
  }

  // 1. Render Collections Sub-tab Content
  const renderCollections = () => {
    if (collections.length === 0) {
      return (
        <View style={styles.emptyTabState}>
          <BookOpen size={36} color={Theme.colors.textSecondary} />
          <Text style={styles.emptyTextTitle}>Create Custom Collections</Text>
          <Text style={styles.emptyTextSub}>
            Organize listing details into targeted groupings (e.g. Dream Homes, Office, Beach Villas).
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setCreateModalVisible(true)}
            accessibilityLabel="Create first collection"
            accessibilityRole="button"
          >
            <FolderPlus size={16} color={Theme.colors.background} />
            <Text style={styles.actionBtnText}>Create Collection</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.tabContentBlock}>
        <View style={styles.tabHeaderRow}>
          <Text style={styles.countLabel}>{collections.length} Collections</Text>
          <TouchableOpacity
            style={styles.addBtnSmall}
            onPress={() => setCreateModalVisible(true)}
            accessibilityLabel="Add new collection"
            accessibilityRole="button"
          >
            <FolderPlus size={14} color={Theme.colors.primary} />
            <Text style={styles.addBtnSmallText}>New Collection</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => (
            <CollectionCard 
              collection={item as any} 
              onPress={(col) => router.push(`/collection/${col.id}` as any)} 
            />
          )}
        />
      </View>
    );
  };

  // 2. Render Saved Search Presets Sub-tab Content
  const renderSearches = () => {
    if (savedSearches.length === 0) {
      return (
        <View style={styles.emptyTabState}>
          <Search size={36} color={Theme.colors.textSecondary} />
          <Text style={styles.emptyTextTitle}>No Saved Searches</Text>
          <Text style={styles.emptyTextSub}>
            Save custom filters on the Feed search overlay to quickly re-run search metrics later.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContentBlock}>
        <Text style={styles.countLabel}>{savedSearches.length} Search Presets</Text>
        <FlatList
          data={savedSearches}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const f = item.filters;
            const filterSummary = `${f.city || 'Any City'} • ${f.bedrooms ? `${f.bedrooms} BHK` : 'Any BHK'} • ${
              f.listingType === 'buy' ? 'Buy' : 'Rent'
            }`;

            return (
              <View style={styles.searchItem}>
                <TouchableOpacity
                  style={styles.searchDetails}
                  onPress={() => handleExecuteSearch(item)}
                  accessibilityLabel={`Execute search ${item.name}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.searchName}>{item.name}</Text>
                  <Text style={styles.searchFiltersSummary}>{filterSummary}</Text>
                </TouchableOpacity>

                <View style={styles.searchActions}>
                  <TouchableOpacity
                    onPress={() => handleTogglePinSearch(item)}
                    style={styles.searchActionBtn}
                    accessibilityLabel="Toggle Pin search"
                    accessibilityRole="button"
                  >
                    <Pin size={16} color={item.isPinned ? Theme.colors.primary : Theme.colors.border} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteSearch(item.id)}
                    style={styles.searchActionBtn}
                    accessibilityLabel="Delete search"
                    accessibilityRole="button"
                  >
                    <Trash2 size={16} color={Theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </View>
    );
  };

  // 3. Render Alerts Sub-tab Content
  const renderAlerts = () => {
    if (alerts.length === 0) {
      return (
        <View style={styles.emptyTabState}>
          <Bell size={36} color={Theme.colors.textSecondary} />
          <Text style={styles.emptyTextTitle}>No Active Alerts</Text>
          <Text style={styles.emptyTextSub}>
            Create search alerts to stay updated on price drops or fresh matching properties.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContentBlock}>
        <Text style={styles.countLabel}>{alerts.length} Alert Subscriptions</Text>
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            let label = 'Listing Alerts';
            if (item.alertType === 'price_drop') label = 'Price Drop alert';
            else if (item.alertType === 'new_matching_property') label = 'Matching Search alert';
            else if (item.alertType === 'verified_owner') label = 'Verified Owner Alert';

            return (
              <View style={styles.alertItem}>
                <View style={styles.alertMeta}>
                  <Text style={styles.alertTitle}>{label}</Text>
                  <Text style={styles.alertSearchName} numberOfLines={1}>
                    For: {item.searchName || 'General saved search'}
                  </Text>
                </View>
                <View style={styles.alertActions}>
                  <Switch
                    value={item.isActive}
                    onValueChange={() => handleToggleAlert(item.id, item.isActive)}
                    trackColor={{ false: '#2C2C30', true: Theme.colors.primary }}
                    thumbColor={item.isActive ? '#FFFFFF' : '#8E8E93'}
                    accessibilityLabel="Toggle Alert state"
                  />
                  <TouchableOpacity
                    onPress={() => handleDeleteAlert(item.id)}
                    style={styles.alertDeleteBtn}
                    accessibilityLabel="Delete Alert"
                    accessibilityRole="button"
                  >
                    <Trash2 size={16} color={Theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </View>
    );
  };

  return (
    <ScreenContainer style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Personal Hub</Text>
          <Text style={styles.headerSub}>Manage your collections, searches, and alert triggers.</Text>
        </View>

        {/* horizontal Sub-tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'collections' && styles.tabActiveButton]}
            onPress={() => setActiveTab('collections')}
            accessibilityLabel="Collections tab"
            accessibilityRole="tab"
          >
            <Text style={[styles.tabButtonText, activeTab === 'collections' && styles.tabActiveButtonText]}>
              Collections
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'searches' && styles.tabActiveButton]}
            onPress={() => setActiveTab('searches')}
            accessibilityLabel="Searches tab"
            accessibilityRole="tab"
          >
            <Text style={[styles.tabButtonText, activeTab === 'searches' && styles.tabActiveButtonText]}>
              Saved Searches
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'alerts' && styles.tabActiveButton]}
            onPress={() => setActiveTab('alerts')}
            accessibilityLabel="Alerts tab"
            accessibilityRole="tab"
          >
            <Text style={[styles.tabButtonText, activeTab === 'alerts' && styles.tabActiveButtonText]}>
              Alerts
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab content body */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'collections' && renderCollections()}
          {activeTab === 'searches' && renderSearches()}
          {activeTab === 'alerts' && renderAlerts()}
        </View>

        {/* Horizontal Recently Viewed Carousel ("Continue Exploring") */}
        {recentViews.length > 0 ? (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <View style={styles.historyTitleRow}>
                <History size={16} color={Theme.colors.primary} />
                <Text style={styles.historyTitle}>Continue Exploring</Text>
              </View>
              <TouchableOpacity
                onPress={handleClearHistory}
                accessibilityLabel="Clear history list"
                accessibilityRole="button"
              >
                <Text style={styles.clearHistoryText}>Clear History</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyCarousel}
            >
              {recentViews.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.historyCard}
                  onPress={() => router.push(`/property/${p.id}` as any)}
                  accessibilityLabel={`Resume exploring ${p.title}`}
                  accessibilityRole="button"
                >
                  <Image source={{ uri: p.thumbnailUrl }} style={styles.historyThumb} contentFit="cover" />
                  <Text style={styles.historyCardTitle} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={styles.historyCardLoc} numberOfLines={1}>
                    {p.locality || p.city}
                  </Text>
                  <Text style={styles.historyCardPrice}>
                    ${p.price.toLocaleString()}/mo
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {/* Modal - Create Collection Dialog */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} accessibilityViewIsModal={true}>
            <Text style={styles.modalTitle}>New Collection</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name (e.g. Weekend Villas)"
              placeholderTextColor={Theme.colors.textSecondary}
              value={newColName}
              onChangeText={setNewColName}
              maxLength={30}
              accessibilityLabel="Collection Name"
            />
            <TextInput
              style={[styles.modalInput, styles.modalInputDesc]}
              placeholder="Description (Optional)"
              placeholderTextColor={Theme.colors.textSecondary}
              value={newColDesc}
              onChangeText={setNewColDesc}
              multiline
              numberOfLines={3}
              maxLength={150}
              accessibilityLabel="Collection Description"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCreateModalVisible(false)}
                accessibilityLabel="Cancel collection creation"
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleCreateCollection}
                accessibilityLabel="Create collection save"
                accessibilityRole="button"
              >
                <Text style={styles.modalSaveText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  header: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.md,
  },
  headerTitle: {
    fontSize: Theme.typography.sizes.h1,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
  },
  headerSub: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: Theme.spacing.xs,
    lineHeight: Theme.typography.lineHeights.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: Theme.spacing.xl,
    backgroundColor: Theme.colors.surface,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActiveButton: {
    backgroundColor: '#1E1E22',
  },
  tabButtonText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.textSecondary,
  },
  tabActiveButtonText: {
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
  },
  tabContentContainer: {
    paddingHorizontal: Theme.spacing.xl,
    marginTop: Theme.spacing.lg,
  },
  tabContentBlock: {
    flexDirection: 'column',
  },
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  countLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnSmallText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
  },
  emptyTabState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xxxl,
    paddingHorizontal: Theme.spacing.xl,
  },
  emptyTextTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    color: Theme.colors.textPrimary,
    marginTop: Theme.spacing.md,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyTextSub: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: Theme.typography.lineHeights.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 8,
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.lg,
  },
  actionBtnText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.background,
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  colCover: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#1E1E22',
  },
  colCoverPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#151518',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  colDetails: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  colName: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
  },
  colDesc: {
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  colCount: {
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.primary,
    marginTop: 4,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  searchDetails: {
    flex: 1,
  },
  searchName: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
  },
  searchFiltersSummary: {
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  searchActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchActionBtn: {
    padding: 6,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  alertMeta: {
    flex: 1,
  },
  alertTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
  },
  alertSearchName: {
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertDeleteBtn: {
    padding: 6,
  },
  historySection: {
    marginTop: Theme.spacing.xxxl,
    paddingTop: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
    marginBottom: Theme.spacing.md,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    color: Theme.colors.textPrimary,
  },
  clearHistoryText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.danger,
  },
  historyCarousel: {
    paddingHorizontal: Theme.spacing.xl,
    gap: Theme.spacing.md,
  },
  historyCard: {
    width: 130,
    backgroundColor: Theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.sm,
  },
  historyThumb: {
    width: '100%',
    height: 80,
    borderRadius: 6,
    backgroundColor: '#1E1E22',
  },
  historyCardTitle: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
    marginTop: 6,
  },
  historyCardLoc: {
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  historyCardPrice: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.xl,
    gap: Theme.spacing.md,
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
  },
  modalInputDesc: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modalCancelText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.background,
  },
});
