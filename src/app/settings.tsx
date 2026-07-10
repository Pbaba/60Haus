import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
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

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, isGuest } = useAuth();
  const { profile, updateProfile } = useProfile();

  const [name, setName] = useState(profile?.fullName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [phone, setPhone] = useState(profile?.phoneNumber || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');

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
    try {
      await updateProfile({
        fullName: name,
        bio,
        phoneNumber: phone,
        avatarUrl,
      });
      Alert.alert('Success', 'Profile updated successfully.');
    } catch {
      // Errors handled inside profile context
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
              
              <Button variant="primary" style={styles.saveBtn} onPress={handleSaveChanges}>
                Save Profile Changes
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
          <TouchableOpacity
            style={styles.rowItem}
            onPress={() => alert('Notifications preferences')}
          >
            <View style={styles.rowLabel}>
              <Bell size={20} color={Theme.colors.textSecondary} />
              <Text style={styles.rowText}>Push Notifications</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity
            style={styles.rowItem}
            onPress={() => alert('Privacy preferences')}
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
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backBtn: {
    marginBottom: Theme.spacing.sm,
    marginLeft: -Theme.spacing.sm,
  },
  title: {
    fontSize: Theme.typography.sizes.h1,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: 2,
  },
  content: {
    padding: Theme.spacing.xl,
    gap: Theme.spacing.xxl,
  },
  profileEditSection: {
    alignItems: 'center',
    gap: Theme.spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Theme.colors.primary,
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Theme.colors.background,
  },
  form: {
    width: '100%',
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
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
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
});
