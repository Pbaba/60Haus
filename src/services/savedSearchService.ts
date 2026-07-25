import { supabase } from '../lib/supabase';
import { SavedSearch } from '../types';
import { SearchFilters } from '../features/discovery/components/FilterSheet';

export const savedSearchService = {
  /**
   * Saves a search configuration filter set.
   */
  async saveSearch(
    userId: string,
    filters: SearchFilters,
    name?: string,
  ): Promise<SavedSearch> {
    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: userId,
        filters,
        name: name || `Search - ${filters.city || 'All Cities'}`,
        is_pinned: false,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      filters: data.filters,
      isPinned: data.is_pinned,
      createdAt: data.created_at,
    };
  },

  /**
   * Renames a saved search preset.
   */
  async renameSavedSearch(searchId: string, name: string): Promise<void> {
    const { error } = await supabase
      .from('saved_searches')
      .update({ name })
      .eq('id', searchId);

    if (error) throw error;
  },

  /**
   * Pins or unpins a saved search.
   */
  async togglePinSavedSearch(searchId: string, isPinned: boolean): Promise<void> {
    const { error } = await supabase
      .from('saved_searches')
      .update({ is_pinned: isPinned })
      .eq('id', searchId);

    if (error) throw error;
  },

  /**
   * Deletes a saved search preset.
   */
  async deleteSavedSearch(searchId: string): Promise<void> {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', searchId);

    if (error) throw error;
  },

  /**
   * Retrieves all saved searches for a user.
   */
  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      filters: item.filters,
      isPinned: item.is_pinned,
      createdAt: item.created_at,
    }));
  },
};
