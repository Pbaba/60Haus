import React, { useEffect, useState, useContext, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Trash2, Check, AlertCircle } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Theme } from '../../theme';
import { PropertyContext } from '../../context/PropertyContext';
import { compareService, ComparisonModel } from '../../services/compareService';
import { locationDomain } from '../../domain/location';
import { Image } from 'expo-image';
import { useFeedback } from '../../context/FeedbackContext';
import { analyticsService } from '../../services/analyticsService';

const COLUMN_WIDTH = 160; // Optimal side-by-side card width
const LABEL_COLUMN_WIDTH = 120; // Fixed width for metric labels

export default function CompareScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ ids?: string }>();
  const context = useContext(PropertyContext);
  const { showToast } = useFeedback();

  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<ComparisonModel | null>(null);

  // Safely extract context variables
  const properties = context?.properties || [];
  const compareQueue = context?.compareQueue || [];
  const toggleCompare = context?.toggleCompare || (() => {});
  const clearCompareQueue = context?.clearCompareQueue || (() => {});

  // 1. Resolve which properties to compare (from deep link query params OR local state queue)
  const propertiesToCompare = useMemo(() => {
    const idsString = searchParams.ids || compareQueue.join(',');
    if (!idsString) return [];
    const targetIds = idsString.split(',').filter(Boolean);
    return properties.filter((p) => targetIds.includes(p.id));
  }, [searchParams.ids, compareQueue, properties]);

  // 2. Fetch neighborhood snapshots and build comparison models
  useEffect(() => {
    const buildModel = async () => {
      if (propertiesToCompare.length < 2) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const snapshots: { [key: string]: any } = {};
        for (const p of propertiesToCompare) {
          const snap = await locationDomain.getNeighborhoodSnapshot(p, properties);
          snapshots[p.id] = snap;
        }

        const compModel = compareService.buildComparisonModel(propertiesToCompare, snapshots);
        setModel(compModel);
        
        analyticsService.trackPropertyCompared(propertiesToCompare.map((p) => p.id));
      } catch {
        console.error('Failed to compute comparison analytics');
        showToast('Error loading property intelligence comparison.');
      } finally {
        setLoading(false);
      }
    };

    buildModel();
  }, [propertiesToCompare, properties, showToast]);

  const handleRemove = (propertyId: string) => {
    toggleCompare(propertyId);
    showToast('Removed from comparison');
  };

  // Renders the side-by-side header cards
  const renderHeaders = () => {
    return (
      <View style={styles.headerRow}>
        <View style={[styles.labelCell, { justifyContent: 'flex-end', paddingBottom: 10 }]}>
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={clearCompareQueue}
            accessibilityLabel="Clear comparison queue"
            accessibilityRole="button"
          >
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false} // Synced scroll
          contentContainerStyle={styles.columnsContainer}
        >
          {propertiesToCompare.map((p) => (
            <View key={p.id} style={styles.headerColumn}>
              <TouchableOpacity
                style={styles.removeHeaderBtn}
                onPress={() => handleRemove(p.id)}
                accessibilityLabel={`Remove ${p.title} from comparison`}
                accessibilityRole="button"
              >
                <Trash2 size={14} color={Theme.colors.danger} />
              </TouchableOpacity>
              <Image source={{ uri: p.thumbnailUrl }} style={styles.headerThumbnail} contentFit="cover" />
              <Text style={styles.headerTitle} numberOfLines={2}>
                {p.title}
              </Text>
              <Text style={styles.headerPrice}>
                ${p.price.toLocaleString()}/mo
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Renders a single row of metrics
  const renderRow = (row: any) => {
    return (
      <View key={row.key} style={styles.row}>
        {/* Metric Label (Left Column) */}
        <View style={styles.labelCell}>
          <Text style={styles.rowLabel}>{row.label}</Text>
        </View>

        {/* side-by-side property values */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false} // Synced scroll
          contentContainerStyle={styles.columnsContainer}
        >
          {row.values.map((v: any, index: number) => (
            <View
              key={v.propertyId}
              style={[
                styles.valueCell,
                v.isBest && styles.bestValueCell,
              ]}
            >
              <Text
                style={[
                  styles.valueText,
                  v.isBest && styles.bestValueText,
                ]}
                numberOfLines={2}
              >
                {v.formattedValue}
              </Text>
              {v.isBest ? (
                <View style={styles.bestBadge}>
                  <Check size={8} color={Theme.colors.surface} />
                  <Text style={styles.bestBadgeText}>Best</Text>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Renders standard amenity comparison matrix
  const renderAmenitiesSection = () => {
    if (!model) return null;
    const { shared, unique, missing } = model.amenitiesMatrix;

    return (
      <View style={styles.amenitiesSection}>
        <Text style={styles.sectionHeaderTitle}>Amenities Matrix</Text>

        {/* 1. Unique Highlights (Better values) */}
        <View style={styles.row}>
          <View style={styles.labelCell}>
            <Text style={styles.rowLabelHighlight}>Unique Perks</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false} contentContainerStyle={styles.columnsContainer}>
            {propertiesToCompare.map((p) => {
              const perks = unique[p.id] || [];
              return (
                <View key={p.id} style={[styles.valueCell, perks.length > 0 && styles.perkCell]}>
                  {perks.length > 0 ? (
                    perks.map((am) => (
                      <View key={am} style={styles.amenityBadgePerk}>
                        <Text style={styles.amenityBadgeText}>{am}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noAmenitiesText}>None</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* 2. Shared amenities */}
        {shared.length > 0 ? (
          <View style={styles.sharedContainer}>
            <Text style={styles.sharedTitle}>Common to All Compared Homes</Text>
            <View style={styles.sharedPillsRow}>
              {shared.map((am) => (
                <View key={am} style={styles.sharedPill}>
                  <Check size={12} color={Theme.colors.primary} />
                  <Text style={styles.sharedPillText}>{am}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* 3. Missing Amenities row */}
        <View style={styles.row}>
          <View style={styles.labelCell}>
            <Text style={styles.rowLabelWarning}>Missing Here</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false} contentContainerStyle={styles.columnsContainer}>
            {propertiesToCompare.map((p) => {
              const lost = missing[p.id] || [];
              return (
                <View key={p.id} style={styles.valueCell}>
                  {lost.length > 0 ? (
                    lost.map((am) => (
                      <View key={am} style={styles.amenityBadgeMissing}>
                        <Text style={styles.amenityBadgeMissingText}>{am}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.allAmenitiesPresentText}>None missing</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={20} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Compare Listings</Text>
        <View style={{ width: 40 }} />
      </View>

      {propertiesToCompare.length < 2 ? (
        <View style={styles.emptyContainer}>
          <AlertCircle size={48} color={Theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>Add More Properties</Text>
          <Text style={styles.emptySubtitle}>
            Select at least 2 properties (up to 4) on the feed or details screen to compare intelligence profiles.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Compiling smart comparisons...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Scrollable side-by-side comparison table */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.tableContainer}>
              {/* Header Cards row */}
              {renderHeaders()}

              {/* Rows grouped by category */}
              {model?.categories.map((cat) => (
                <View key={cat.title} style={styles.categoryBlock}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryHeaderText}>{cat.title}</Text>
                  </View>
                  {cat.rows.map(renderRow)}
                </View>
              ))}

              {/* Amenities matrix comparison */}
              {renderAmenitiesSection()}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backBtn: {
    padding: Theme.spacing.sm,
  },
  headerTitleText: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    color: Theme.colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xxl,
    gap: Theme.spacing.md,
  },
  emptyTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    color: Theme.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: Theme.typography.lineHeights.lg,
  },
  tableContainer: {
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#0E0E10',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  columnsContainer: {
    flexDirection: 'row',
  },
  labelCell: {
    width: LABEL_COLUMN_WIDTH,
    paddingHorizontal: Theme.spacing.md,
    justifyContent: 'center',
    backgroundColor: '#080809',
    borderRightWidth: 1,
    borderRightColor: Theme.colors.border,
  },
  clearBtn: {
    backgroundColor: '#1E1E22',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
  },
  headerColumn: {
    width: COLUMN_WIDTH,
    padding: Theme.spacing.md,
    borderRightWidth: 1,
    borderRightColor: Theme.colors.border,
    alignItems: 'center',
    position: 'relative',
  },
  removeHeaderBtn: {
    position: 'absolute',
    top: Theme.spacing.sm,
    right: Theme.spacing.sm,
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  headerThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#1E1E22',
    marginBottom: Theme.spacing.sm,
  },
  headerTitle: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    height: 32,
  },
  headerPrice: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
    marginTop: 4,
  },
  categoryBlock: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  categoryHeader: {
    backgroundColor: '#151518',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  categoryHeaderText: {
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wider,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1D',
  },
  rowLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.textSecondary,
  },
  rowLabelHighlight: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
  },
  rowLabelWarning: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.danger,
  },
  valueCell: {
    width: COLUMN_WIDTH,
    padding: Theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1A1A1D',
    minHeight: 48,
  },
  valueText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  bestValueCell: {
    backgroundColor: 'rgba(223, 185, 120, 0.04)',
    borderLeftWidth: 1,
    borderLeftColor: Theme.colors.primary,
    borderRightColor: Theme.colors.primary,
  },
  bestValueText: {
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 4,
    gap: 2,
  },
  bestBadgeText: {
    fontSize: 8,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.background,
  },
  amenitiesSection: {
    backgroundColor: '#0A0A0B',
    paddingBottom: Theme.spacing.xl,
  },
  sectionHeaderTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    color: Theme.colors.textPrimary,
    padding: Theme.spacing.md,
    backgroundColor: '#121214',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  perkCell: {
    backgroundColor: 'rgba(223, 185, 120, 0.02)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  amenityBadgePerk: {
    backgroundColor: 'rgba(223, 185, 120, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: Theme.colors.primary,
  },
  amenityBadgeText: {
    fontSize: 9,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.primary,
  },
  noAmenitiesText: {
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
  },
  sharedContainer: {
    padding: Theme.spacing.md,
    backgroundColor: '#0E0E10',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  sharedTitle: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  sharedPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sharedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  sharedPillText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.textPrimary,
  },
  amenityBadgeMissing: {
    backgroundColor: 'rgba(255, 75, 75, 0.05)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  amenityBadgeMissingText: {
    fontSize: 9,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.danger,
    textDecorationLine: 'line-through',
  },
  allAmenitiesPresentText: {
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
  },
});
