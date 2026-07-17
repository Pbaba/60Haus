import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Trash2, Edit3, Save, MapPin, X } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Theme } from '../../theme';
import { collectionService } from '../../services/collectionService';
import { CollectionProperty } from '../../types';
import { Image } from 'expo-image';
import { useFeedback } from '../../context/FeedbackContext';
import { analyticsService } from '../../services/analyticsService';
import { useAuth } from '../../hooks/useAuth';

export default function CollectionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useFeedback();

  const [loading, setLoading] = useState(true);
  const [collectionName, setCollectionName] = useState('');
  const [collectionDesc, setCollectionDesc] = useState('');
  const [properties, setProperties] = useState<CollectionProperty[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const loadCollectionDetails = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      // 1. Fetch collection name and description
      const cols = await collectionService.getCollections(user.id);
      const current = cols.find((c: any) => c.id === id);
      if (current) {
        setCollectionName(current.name);
        setCollectionDesc(current.description || '');
        analyticsService.trackCollectionOpened(current.id, current.name);
      }

      // 2. Fetch properties inside collection
      const list = await collectionService.getCollectionProperties(id);
      setProperties(list);
    } catch {
      showToast('Failed to load collection listings.');
    } finally {
      setLoading(false);
    }
  }, [id, user, showToast]);

  useEffect(() => {
    loadCollectionDetails();
  }, [loadCollectionDetails]);

  const handleDeleteCollection = () => {
    Alert.alert(
      'Delete Collection',
      'Are you sure you want to delete this collection and all its notes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await collectionService.deleteCollection(id);
              analyticsService.trackCollectionDeleted(id);
              showToast('Collection deleted');
              router.back();
            } catch {
              showToast('Failed to delete collection');
            }
          },
        },
      ],
    );
  };

  const handleRemoveProperty = async (propertyId: string) => {
    try {
      await collectionService.removePropertyFromCollection(id, propertyId);
      analyticsService.trackPropertyRemovedFromCollection(propertyId, id);
      setProperties((prev) => prev.filter((item) => item.propertyId !== propertyId));
      showToast('Listing removed from collection');
    } catch {
      showToast('Failed to remove listing');
    }
  };

  const startEditingNote = (item: CollectionProperty) => {
    setEditingNoteId(item.id);
    setNoteText(item.notes || '');
  };

  const saveNote = async (item: CollectionProperty) => {
    try {
      await collectionService.updatePropertyNote(id, item.propertyId, noteText);
      setProperties((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, notes: noteText } : p)),
      );
      setEditingNoteId(null);
      showToast('Note updated');
    } catch {
      showToast('Failed to save note');
    }
  };

  const renderPropertyItem = ({ item }: { item: CollectionProperty }) => {
    const p = item.property;
    if (!p) return null;

    const isEditingThisNote = editingNoteId === item.id;

    return (
      <View style={styles.card} accessibilityRole="none">
        {/* Main info row */}
        <TouchableOpacity
          style={styles.cardPressable}
          onPress={() => router.push(`/property/${p.id}` as any)}
          accessibilityLabel={`View details for ${p.title}`}
          accessibilityRole="button"
        >
          <Image source={{ uri: p.thumbnailUrl }} style={styles.thumbnail} contentFit="cover" />
          <View style={styles.cardContent}>
            <Text style={styles.propertyTitle} numberOfLines={1}>
              {p.title}
            </Text>
            <View style={styles.localityRow}>
              <MapPin size={12} color={Theme.colors.textSecondary} />
              <Text style={styles.propertyLocality} numberOfLines={1}>
                {p.locality || p.city}
              </Text>
            </View>
            <Text style={styles.propertyPrice}>
              ${p.price.toLocaleString()}/mo
            </Text>
            <Text style={styles.propertyMeta}>
              {p.bedrooms} BHK • {p.bathrooms} Bath • {p.propertyType || 'Apartment'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Notes display / edit section */}
        <View style={styles.notesSection}>
          {isEditingThisNote ? (
            <View style={styles.noteEditContainer}>
              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Add personal note (e.g. Parents liked this)..."
                placeholderTextColor={Theme.colors.textSecondary}
                multiline
                maxLength={200}
                accessibilityLabel="Edit property note"
              />
              <View style={styles.noteActionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditingNoteId(null)}
                  accessibilityLabel="Cancel editing note"
                  accessibilityRole="button"
                >
                  <X size={16} color={Theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveNoteBtn}
                  onPress={() => saveNote(item)}
                  accessibilityLabel="Save property note"
                  accessibilityRole="button"
                >
                  <Save size={16} color={Theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.noteViewContainer}>
              <View style={styles.noteTextWrapper}>
                <Text style={styles.noteLabel}>Personal Note:</Text>
                <Text style={styles.noteText}>
                  {item.notes ? item.notes : 'No personal notes added yet.'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editNoteBtn}
                onPress={() => startEditingNote(item)}
                accessibilityLabel="Edit note"
                accessibilityRole="button"
              >
                <Edit3 size={14} color={Theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Remove item button */}
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemoveProperty(p.id)}
          accessibilityLabel="Remove listing from collection"
          accessibilityRole="button"
        >
          <Trash2 size={16} color={Theme.colors.danger} />
          <Text style={styles.removeBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeft size={20} color={Theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {collectionName || 'Collection'}
            </Text>
            {collectionDesc ? (
              <Text style={styles.desc} numberOfLines={2}>
                {collectionDesc}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={handleDeleteCollection}
            style={styles.deleteBtn}
            accessibilityLabel="Delete collection"
            accessibilityRole="button"
          >
            <Trash2 size={20} color={Theme.colors.danger} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
          </View>
        ) : properties.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>This collection is empty</Text>
            <Text style={styles.emptySubtitle}>
              Browse properties on the feed and add them to this collection to organize your hunt.
            </Text>
          </View>
        ) : (
          <FlatList
            data={properties}
            renderItem={renderPropertyItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScreenContainer>
    </KeyboardAvoidingView>
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
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backBtn: {
    padding: Theme.spacing.sm,
    marginRight: Theme.spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: Theme.typography.sizes.h3,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
  },
  desc: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: 2,
  },
  deleteBtn: {
    padding: Theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: Theme.typography.lineHeights.lg,
  },
  listContent: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.lg,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 2,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  cardPressable: {
    flexDirection: 'row',
    padding: Theme.spacing.md,
  },
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#1E1E22',
  },
  cardContent: {
    flex: 1,
    marginLeft: Theme.spacing.md,
    justifyContent: 'center',
  },
  propertyTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
  },
  localityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  propertyLocality: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
  },
  propertyPrice: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
    marginTop: 4,
  },
  propertyMeta: {
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamilyMedium,
    color: Theme.colors.textSecondary,
    marginTop: 4,
  },
  notesSection: {
    backgroundColor: '#0E0E10',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
  },
  noteViewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  noteTextWrapper: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  noteLabel: {
    fontSize: Theme.typography.sizes.xxs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.primary,
    marginBottom: 2,
  },
  noteText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textPrimary,
    lineHeight: Theme.typography.lineHeights.md,
  },
  editNoteBtn: {
    padding: 4,
  },
  noteEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteInput: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 6,
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    maxHeight: 60,
  },
  noteActionRow: {
    flexDirection: 'row',
    marginLeft: Theme.spacing.sm,
    gap: 8,
  },
  cancelBtn: {
    padding: 6,
  },
  saveNoteBtn: {
    padding: 6,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    gap: Theme.spacing.xs,
  },
  removeBtnText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.danger,
  },
});
