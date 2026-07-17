import { supabase } from '../lib/supabase';
import { AlertSubscription } from '../types';

export const alertService = {
  /**
   * Subscribes a user to a specific type of search alert.
   */
  async createAlert(
    userId: string,
    searchId: string,
    alertType: 'new_matching_property' | 'price_drop' | 'verified_owner' | 'listing_updated',
  ): Promise<AlertSubscription> {
    const { data, error } = await supabase
      .from('alert_subscriptions')
      .insert({
        user_id: userId,
        search_id: searchId,
        alert_type: alertType,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      searchId: data.search_id,
      alertType: data.alert_type,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  },

  /**
   * Toggles alert subscription activation state.
   */
  async toggleAlert(alertId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('alert_subscriptions')
      .update({ is_active: isActive })
      .eq('id', alertId);

    if (error) throw error;
  },

  /**
   * Deletes/cancels an alert subscription.
   */
  async deleteAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('alert_subscriptions')
      .delete()
      .eq('id', alertId);

    if (error) throw error;
  },

  /**
   * Retrieves all search alert subscriptions for a user.
   */
  async getAlerts(userId: string): Promise<AlertSubscription[]> {
    const { data, error } = await supabase
      .from('alert_subscriptions')
      .select('*, saved_searches(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      searchId: item.search_id,
      alertType: item.alert_type,
      isActive: item.is_active,
      createdAt: item.created_at,
      searchName: item.saved_searches?.name,
    }));
  },

  /**
   * Simulates alert trigger validation for a new or updated property.
   * Compares listing details with user active alert criteria.
   */
  simulateIncomingListingTrigger(
    property: any,
    activeAlerts: any[],
    triggerNotification: (title: string, message: string) => void,
  ) {
    if (__DEV__) {
      console.log('[Alert Simulation] Evaluating listing changes for triggers:', property.title);
    }

    activeAlerts.forEach((alert) => {
      if (!alert.isActive) return;

      // Price Drop Trigger check
      if (alert.alertType === 'price_drop') {
        const previousPrice = property.previousPrice;
        if (previousPrice && property.price < previousPrice) {
          const savings = previousPrice - property.price;
          triggerNotification(
            'Price Drop Alert! 📉',
            `"${property.title}" in ${property.locality || property.city} just dropped by $${savings}/mo! New price: $${property.price}/mo.`,
          );
        }
      }

      // Verified Owner check
      if (alert.alertType === 'verified_owner' && property.isVerifiedOwner) {
        triggerNotification(
          'Verified Owner Match! 🛡️',
          `A new listing by a verified owner appeared in ${property.city}: "${property.title}" for $${property.price}/mo.`,
        );
      }

      // New matching property under active search
      if (alert.alertType === 'new_matching_property') {
        // Mock matching evaluation: check location/bedrooms
        const filters = alert.filters || {};
        const matchesCity = !filters.city || filters.city === property.city;
        const matchesBHK = !filters.bedrooms || Number(filters.bedrooms) === Number(property.bedrooms);
        if (matchesCity && matchesBHK) {
          triggerNotification(
            'New Listing Matches Search! 🏠',
            `"${property.title}" matched your search alert in ${property.locality || property.city} at $${property.price}/mo.`,
          );
        }
      }
    });
  },
};
