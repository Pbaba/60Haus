import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

const profileCache: Record<string, { profile: UserProfile | null; expiry: number }> = {};
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache duration

export const profileService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const now = Date.now();
    const cached = profileCache[userId];
    if (cached && cached.expiry > now) {
      return cached.profile;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!data) return null;

    const profile: UserProfile = {
      id: data.id,
      username: data.username,
      fullName: data.full_name || '',
      avatarUrl: data.avatar_url || '',
      bio: data.bio || '',
      phoneNumber: data.phone_number || '',
      role: data.role as 'hunter' | 'owner',
      createdAt: data.created_at,
      preferredCity: data.preferred_city || undefined,
      preferredListingType: data.preferred_listing_type || undefined,
      preferredBudget: data.preferred_budget ? Number(data.preferred_budget) : undefined,
    };

    profileCache[userId] = {
      profile,
      expiry: now + CACHE_DURATION_MS,
    };

    return profile;
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    // Invalidate cache immediately on profile modification
    delete profileCache[userId];

    const payload: any = {};
    if (updates.fullName !== undefined) payload.full_name = updates.fullName;
    if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.phoneNumber !== undefined) payload.phone_number = updates.phoneNumber;
    if (updates.preferredCity !== undefined) payload.preferred_city = updates.preferredCity;
    if (updates.preferredListingType !== undefined) payload.preferred_listing_type = updates.preferredListingType;
    if (updates.preferredBudget !== undefined) payload.preferred_budget = updates.preferredBudget;

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (error) throw error;
  },

  async upgradeToOwner(userId: string): Promise<void> {
    // Invalidate cache immediately on upgrade
    delete profileCache[userId];

    const { error } = await supabase
      .from('profiles')
      .update({ role: 'owner' })
      .eq('id', userId);

    if (error) throw error;
  },
};
