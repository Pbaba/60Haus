import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, X, Trash2 } from 'lucide-react-native';
import { SearchFilters } from './SearchOverlay';
import { Theme } from '../theme';
import { hapticsService } from '../services/hapticsService';

export interface SavedSearchProfile {
  id: string;
  name: string;
  icon: string;
  filters: SearchFilters;
}

interface SavedSearchPanelProps {
  currentFilters: SearchFilters;
  onApplyFilters: (filters: SearchFilters) => void;
}

const STORAGE_KEY = '@saved_search_profiles';
const ICONS = ['🏖', '👨‍👩‍👧', '💰', '🌆', '🏠', '🌲'];

const defaultProfiles: SavedSearchProfile[] = [
  {
    id: 'default-sea',
    name: 'Sea Facing',
    icon: '🏖',
    filters: {
      city: 'Mumbai',
      bhk: 3,
      furnishing: 'fully-furnished',
      petFriendly: true,
      listingType: 'rent',
      maxPrice: 250000,
    },
  },
  {
    id: 'default-family',
    name: 'Family Homes',
    icon: '👨‍👩‍👧',
    filters: {
      city: 'Mumbai',
      bhk: 2,
      furnishing: 'fully-furnished',
      petFriendly: false,
      listingType: 'rent',
      maxPrice: 120000,
    },
  },
];

export const SavedSearchPanel: React.FC<SavedSearchPanelProps> = ({
  currentFilters,
  onApplyFilters,
}) => {
  const [profiles, setProfiles] = useState<SavedSearchProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);

  // Load profiles from storage
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setProfiles(JSON.parse(stored));
        } else {
          setProfiles(defaultProfiles);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProfiles));
        }
      } catch (e) {
        console.error('Failed to load search profiles:', e);
      }
    };
    loadProfiles();
  }, []);

  const saveProfilesToStorage = async (newProfiles: SavedSearchProfile[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProfiles));
      setProfiles(newProfiles);
    } catch (e) {
      console.error('Failed to write search profiles:', e);
    }
  };

  const handleSelectProfile = (profile: SavedSearchProfile) => {
    hapticsService.light();
    onApplyFilters(profile.filters);
  };

  const handleCreateProfile = async () => {
    if (!profileName.trim()) return;

    const newProfile: SavedSearchProfile = {
      id: `profile-${Date.now()}`,
      name: profileName.trim(),
      icon: selectedIcon,
      filters: { ...currentFilters },
    };

    const updated = [...profiles, newProfile];
    await saveProfilesToStorage(updated);

    // Reset form
    setProfileName('');
    setSelectedIcon(ICONS[0]);
    setIsModalOpen(false);
    hapticsService.success();
  };

  const handleDeleteProfile = async (id: string, e: any) => {
    e.stopPropagation(); // Avoid triggering apply
    hapticsService.warning();
    const updated = profiles.filter((p) => p.id !== id);
    await saveProfilesToStorage(updated);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Searches</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            hapticsService.light();
            setIsModalOpen(true);
          }}
        >
          <Plus size={14} color={Theme.colors.primary} />
          <Text style={styles.addBtnText}>Save Current</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {profiles.map((p) => {
          // Check if matches current filters exactly
          const isSelected =
            p.filters.city === currentFilters.city &&
            p.filters.bhk === currentFilters.bhk &&
            p.filters.furnishing === currentFilters.furnishing &&
            p.filters.listingType === currentFilters.listingType &&
            p.filters.maxPrice === currentFilters.maxPrice;

          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.profileCard,
                isSelected && styles.profileCardSelected,
              ]}
              onPress={() => handleSelectProfile(p)}
              activeOpacity={0.8}
            >
              <Text style={styles.profileIcon}>{p.icon}</Text>
              <View style={styles.profileMeta}>
                <Text style={[styles.profileName, isSelected && styles.profileTextSelected]}>
                  {p.name}
                </Text>
                <Text style={styles.profileDesc} numberOfLines={1}>
                  {p.filters.bhk ? `${p.filters.bhk} BHK` : 'Any BHK'} • {p.filters.city}
                </Text>
              </View>
              {profiles.length > 1 && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={(e) => handleDeleteProfile(p.id, e)}
                >
                  <Trash2 size={12} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Creation Modal */}
      <Modal
        visible={isModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Search Profile</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Profile Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Weekend Homes"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={profileName}
              onChangeText={setProfileName}
              autoFocus
            />

            <Text style={styles.label}>Select Icon</Text>
            <View style={styles.iconGrid}>
              {ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconPill,
                    selectedIcon === icon && styles.iconPillSelected,
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Text style={styles.iconPillText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleCreateProfile}>
              <Text style={styles.saveBtnText}>Save Configuration</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 163, 89, 0.1)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 163, 89, 0.2)',
  },
  addBtnText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingRight: Theme.spacing.xl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    marginRight: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  profileCardSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: 'rgba(212, 163, 89, 0.05)',
  },
  profileIcon: {
    fontSize: 18,
    marginRight: Theme.spacing.sm,
  },
  profileMeta: {
    marginRight: Theme.spacing.md,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  profileTextSelected: {
    color: Theme.colors.primary,
  },
  profileDesc: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#151518',
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
    marginTop: Theme.spacing.md,
  },
  input: {
    backgroundColor: '#0F0F11',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    color: '#FFF',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    fontSize: 14,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Theme.spacing.xs,
  },
  iconPill: {
    backgroundColor: '#0F0F11',
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  iconPillSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: 'rgba(212, 163, 89, 0.1)',
  },
  iconPillText: {
    fontSize: 20,
  },
  saveBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
});
