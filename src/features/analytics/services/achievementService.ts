import { supabase } from '../../../lib/supabase';
import { OwnerAchievement, OwnerStatistics } from '../../../types';

export const BADGE_DEFINITIONS = {
  verified_owner: { title: 'Verified Owner', description: 'Completed identity verification.' },
  quick_responder: { title: 'Quick Responder', description: 'Average response time under 30 minutes.' },
  trusted_host: { title: 'Trusted Host', description: 'Trust score above 90.' },
  top_performer: { title: 'Top Performer', description: 'Top 10% of owners in lead conversion.' }
};

export const achievementService = {
  async getAchievements(ownerId: string): Promise<OwnerAchievement[]> {
    const { data, error } = await supabase
      .from('owner_achievements')
      .select('*')
      .eq('owner_id', ownerId);

    if (error) {
      console.warn('Failed to fetch achievements:', error);
      return [];
    }

    return data as unknown as OwnerAchievement[];
  },

  evaluateAchievements(stats: OwnerStatistics): string[] {
    const unlocked: string[] = [];

    if (stats.avg_response_time_minutes > 0 && stats.avg_response_time_minutes <= 30) {
      unlocked.push('quick_responder');
    }

    if (stats.avg_trust_score >= 90) {
      unlocked.push('trusted_host');
    }

    return unlocked;
  }
};
