import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '../components/ScreenContainer';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { Theme } from '../theme';
import { ArrowLeft, Bell, Shield, LogOut, Camera } from 'lucide-react-native';
import { propertyUploadService } from '../services/propertyUploadService';
import { useFeedback } from '../context/FeedbackContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, isGuest } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { showTransactionFeedback } = useFeedback();

  const [name, setName] = useState(profile?.fullName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [phone, setPhone] = useState(profile?.phoneNumber || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  
  // Preference States
  const [preferredCity, setPreferredCity] = useState(profile?.preferredCity || '');
  const [preferredListingType, setPreferredListingType] = useState<'rent' | 'buy' | null>(profile?.preferredListingType || null);
  const [preferredBudget, setPreferredBudget] = useState(profile?.preferredBudget ? String(profile.preferredBudget) : '');
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchAlertsEnabled, setSearchAlertsEnabled] = useState(true);
  const [priceAlertsEnabled, setPriceAlertsEnabled] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/onboarding' as any);
  };

  const handlePickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Denied', 'Permission to access media library is required.');
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      setAvatarUrl(pickerResult.assets[0].uri);
    }
  };

  const handleSaveChanges = async () => {
    if (!profile) return;
    setSaveLoading(true);
    try {
      let finalAvatarUrl = avatarUrl;
      if (avatarUrl && avatarUrl.startsWith('file://')) {
        finalAvatarUrl = await propertyUploadService.uploadAvatar(profile.id, avatarUrl);
        setAvatarUrl(finalAvatarUrl);
      }

      const budgetNum = preferredBudget ? parseInt(preferredBudget, 10) : undefined;
      await updateProfile({
        fullName: name,
        bio,
        phoneNumber: phone,
        avatarUrl: finalAvatarUrl,
        preferredCity,
        preferredListingType: preferredListingType || undefined,
        preferredBudget: budgetNum,
      });
      showTransactionFeedback('success', 'Profile Updated', 'Your profile information and preferences have been successfully updated.');
    } catch (e) {
      console.error('Failed to update profile changes:', e);
      showTransactionFeedback('error', 'Update Failed', 'An error occurred while attempting to save your profile changes. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <ScreenContainer style={styles.container} scrollable>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Edit profile and preferences</Text>
      </View>

      <View style={styles.content}>
        {/* Profile Edit Panel (Hidden if Guest) */}
        {!isGuest && profile ? (
          <View style={styles.profileEditSection}>
            <View style={styles.avatarContainer}>
              <Avatar name={name || 'User'} source={avatarUrl} size="xl" />
              <TouchableOpacity style={styles.cameraIcon} onPress={handlePickAvatar}>
                <Camera size={16} color={Theme.colors.surface} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.sectionTitle}>General Information</Text>
              <Input
                label="Full Name"
                placeholder="e.g. Alex Mercer"
                value={name}
                onChangeText={setName}
              />
              <Input
                label="Phone Number"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChangeText={setPhone}
              />
              <Input
                label="Bio"
                placeholder="Tell us about yourself"
                value={bio}
                onChangeText={setBio}
              />

              {/* Personalization Section */}
              <Text style={styles.sectionTitle}>Discovery Preferences</Text>
              <Input
                label="Preferred City"
                placeholder="e.g. Mumbai, Delhi, Bangalore"
                value={preferredCity}
                onChangeText={setPreferredCity}
              />
              
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Preferred Listing Type</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pill, preferredListingType === 'rent' && styles.pillActive]}
                    onPress={() => setPreferredListingType('rent')}
                  >
                    <Text style={[styles.pillText, preferredListingType === 'rent' && styles.pillTextActive]}>Rent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, preferredListingType === 'buy' && styles.pillActive]}
                    onPress={() => setPreferredListingType('buy')}
                  >
                    <Text style={[styles.pillText, preferredListingType === 'buy' && styles.pillTextActive]}>Buy</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Input
                label="Preferred Max Budget (INR)"
                placeholder="e.g. 50000"
                keyboardType="numeric"
                value={preferredBudget}
                onChangeText={setPreferredBudget}
              />
              
              <Button variant="primary" style={styles.saveBtn} loading={saveLoading} onPress={handleSaveChanges}>
                Save Changes
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.guestNotice}>
            <Text style={styles.guestNoticeTitle}>Guest Mode</Text>
            <Text style={styles.guestNoticeSub}>
              Sign in to edit profiles and manage preferences.
            </Text>
          </View>
        )}

        {/* Grouped General Settings */}
        <View style={styles.groupCard}>
          <View style={styles.notificationGroup}>
            <View style={styles.rowLabelHeader}>
              <Bell size={20} color={Theme.colors.primary} />
              <Text style={styles.rowTextHeader}>Notification Preferences</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Saved Search Matches</Text>
              <Switch
                value={searchAlertsEnabled}
                onValueChange={setSearchAlertsEnabled}
                trackColor={{ false: '#2C2C30', true: Theme.colors.primary }}
                thumbColor={searchAlertsEnabled ? '#FFFFFF' : '#8E8E93'}
              />
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Price Drop Updates</Text>
              <Switch
                value={priceAlertsEnabled}
                onValueChange={setPriceAlertsEnabled}
                trackColor={{ false: '#2C2C30', true: Theme.colors.primary }}
                thumbColor={priceAlertsEnabled ? '#FFFFFF' : '#8E8E93'}
              />
            </View>
          </View>
          <View style={styles.rowDivider} />
          <TouchableOpacity
            style={styles.rowItem}
            onPress={() => Alert.alert('Privacy & Security', 'All personal discovery details and browsing logs are stored securely.')}
          >
            <View style={styles.rowLabel}>
              <Shield size={20} color={Theme.colors.textSecondary} />
              <Text style={styles.rowText}>Privacy & Security</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Button variant="secondary" style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={18} color={Theme.colors.danger} style={styles.logoutIcon} />
          {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
        </Button>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.md,
  },
  backBtn: {
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.sizes.h1,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: Theme.spacing.xs,
  },
  content: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxl,
    gap: Theme.spacing.xl,
  },
  profileEditSection: {
    gap: Theme.spacing.lg,
  },
  avatarContainer: {
    alignItems: 'center',
    position: 'relative',
    alignSelf: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Theme.colors.primary,
    padding: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 2,
    borderColor: Theme.colors.surface,
  },
  form: {
    gap: Theme.spacing.md,
  },
  saveBtn: {
    marginTop: Theme.spacing.md,
    width: '100%',
  },
  guestNotice: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  guestNoticeTitle: {
    fontSize: Theme.typography.sizes.lg,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  guestNoticeSub: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
  },
  groupCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
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
  signOutBtn: {
    width: '100%',
    borderColor: Theme.colors.border,
  },
  logoutIcon: {
    marginRight: Theme.spacing.sm,
  },
  // Personalization settings styles
  sectionTitle: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
    letterSpacing: Theme.typography.letterSpacing.wider,
  },
  pickerContainer: {
    marginBottom: Theme.spacing.md,
  },
  pickerLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilySemiBold,
    marginBottom: Theme.spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  pill: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderColor: Theme.colors.border,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
  },
  pillActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '15',
  },
  pillText: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  pillTextActive: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  notificationGroup: {
    paddingVertical: Theme.spacing.md,
  },
  rowLabelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
  },
  rowTextHeader: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
  },
  toggleLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
  },
});
