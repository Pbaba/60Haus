import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../../../theme';
import { OwnerAchievement } from '../../../types';
import { BADGE_DEFINITIONS } from '../services/achievementService';
import { Award, CheckCircle, Zap, Star } from 'lucide-react-native';

interface AchievementCardProps {
  achievements: OwnerAchievement[];
}

export function AchievementCard({ achievements }: AchievementCardProps) {
  const allBadges = Object.entries(BADGE_DEFINITIONS);

  const getIcon = (key: string, unlocked: boolean) => {
    const color = unlocked ? Theme.colors.primary : Theme.colors.textSecondary + '40';
    switch (key) {
      case 'verified_owner': return <CheckCircle size={24} color={color} />;
      case 'quick_responder': return <Zap size={24} color={color} />;
      case 'trusted_host': return <ShieldCheck size={24} color={color} />;
      case 'top_performer': return <Star size={24} color={color} />;
      default: return <Award size={24} color={color} />;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marketplace Achievements</Text>
      
      <View style={styles.grid}>
        {allBadges.map(([key, def]) => {
          const unlocked = achievements.some(a => a.badge_key === key);
          
          return (
            <View key={key} style={[styles.badgeItem, !unlocked && styles.badgeLocked]}>
              <View style={[styles.iconContainer, unlocked && styles.iconUnlocked]}>
                {getIcon(key, unlocked)}
              </View>
              <Text style={[styles.badgeTitle, !unlocked && styles.textLocked]}>{def.title}</Text>
              <Text style={styles.badgeDesc} numberOfLines={2}>{def.description}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Need to import ShieldCheck for trusted_host
import { ShieldCheck } from 'lucide-react-native';

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    marginBottom: Theme.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  badgeItem: {
    width: '48%',
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    alignItems: 'center',
    gap: 8,
  },
  badgeLocked: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnlocked: {
    backgroundColor: Theme.colors.primary + '15',
  },
  badgeTitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    textAlign: 'center',
  },
  textLocked: {
    color: Theme.colors.textSecondary,
  },
  badgeDesc: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
  }
});
