import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export const profileService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      username: data.username,
      fullName: data.full_name || '',
      avatarUrl: data.avatar_url || '',
      bio: data.bio || '',
      phoneNumber: data.phone_number || '',
      role: data.role as 'hunter' | 'owner',
      createdAt: data.created_at,
    };
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const payload: any = {};
    if (updates.fullName !== undefined) payload.full_name = updates.fullName;
    if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.phoneNumber !== undefined) payload.phone_number = updates.phoneNumber;

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (error) throw error;
  },

  async upgradeToOwner(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'owner' })
      .eq('id', userId);

    if (error) throw error;
  },
};
