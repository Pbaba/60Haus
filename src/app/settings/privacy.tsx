import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Theme } from '../../theme';
import { ArrowLeft, MapPin, Camera, Image as ImageIcon, Bell, ExternalLink, Shield } from 'lucide-react-native';
import { usePermissions } from '../../features/permissions/hooks/usePermissions';
import { PermissionType, PermissionStatus } from '../../features/permissions/types';

export default function PrivacyDashboardScreen() {
  const router = useRouter();
  const { permissions, openSettings } = usePermissions();

  const getStatusColor = (status: PermissionStatus) => {
    switch (status) {
      case 'granted':
      case 'limited':
        return Theme.colors.success || '#34C759';
      case 'denied':
        return Theme.colors.danger;
      case 'undetermined':
        return Theme.colors.textMuted;
      case 'unavailable':
        return Theme.colors.textMuted;
      default:
        return Theme.colors.textMuted;
    }
  };

  const getStatusText = (status: PermissionStatus) => {
    switch (status) {
      case 'granted': return 'Granted';
      case 'limited': return 'Limited Access';
      case 'denied': return 'Denied';
      case 'undetermined': return 'Not Requested';
      case 'unavailable': return 'Unavailable';
      default: return 'Unknown';
    }
  };

  const items: {
    type: PermissionType;
    title: string;
    description: string;
    icon: any;
    status: PermissionStatus;
  }[] = [
    {
      type: 'location',
      title: 'Location Services',
      description: 'Used to find nearby properties and calculate accurate distances to listings.',
      icon: MapPin,
      status: permissions.location,
    },
    {
      type: 'camera',
      title: 'Camera Access',
      description: 'Used to capture property photos and walkthrough videos directly from the app.',
      icon: Camera,
      status: permissions.camera,
    },
    {
      type: 'media',
      title: 'Photo & Media Library',
      description: 'Used to select and upload existing photos and videos when creating listings.',
      icon: ImageIcon,
      status: permissions.media,
    },
    {
      type: 'notifications',
      title: 'Push Notifications',
      description: 'Used to send you listing verifications, marketplace updates, and saved search alerts.',
      icon: Bell,
      status: permissions.notifications,
    }
  ];

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy & Permissions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrapper}>
            <Shield size={32} color={Theme.colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Your Data, Your Control</Text>
          <Text style={styles.heroText}>
            60Haus only requests permissions when they are needed for specific features. You can manage these at any time in your device settings.
          </Text>
        </View>

        <View style={styles.list}>
          {items.map((item, index) => {
            const Icon = item.icon;
            const statusColor = getStatusColor(item.status);
            
            return (
              <View key={item.type} style={[
                styles.card,
                index === items.length - 1 && styles.cardLast
              ]}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <Icon size={20} color={Theme.colors.primary} />
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={styles.statusBadge}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {getStatusText(item.status)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity 
          style={styles.settingsBtn} 
          onPress={openSettings}
          activeOpacity={Theme.motion.presets.press.scale}
        >
          <Text style={styles.settingsBtnText}>Open Device Settings</Text>
          <ExternalLink size={16} color={Theme.colors.primary} />
        </TouchableOpacity>
      </ScrollView>
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
  },
  backBtn: {
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.sizes.h1,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
  },
  content: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxxl,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: Theme.spacing.xl,
  },
  heroIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  heroTitle: {
    fontSize: Theme.typography.sizes.lg,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    marginBottom: Theme.spacing.xs,
  },
  heroText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Theme.spacing.md,
  },
  list: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
    marginBottom: Theme.spacing.xl,
  },
  card: {
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  cardLast: {
    borderBottomWidth: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  cardHeaderRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Theme.colors.background,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  cardDescription: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    lineHeight: 20,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.primary + '10',
    borderRadius: Theme.borderRadius.md,
    gap: Theme.spacing.sm,
  },
  settingsBtnText: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  }
});
