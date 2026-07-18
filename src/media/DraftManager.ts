import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = '@60haus:property_draft';

export interface PropertyDraft {
  title: string;
  price: string;
  address: string;
  city: string;
  bhk: string;
  furnishing: string;
  propertyType: string;
  description: string;
  locality: string;
  contactPhone: string;
  listingType: 'rent' | 'buy';
  status: string;
  selectedAmenities: string[];
  selectedImages: string[];
  selectedVideo: string | null;
  carpetArea?: string;
  builtUpArea?: string;
  superBuiltUpArea?: string;
  plotArea?: string;
  propertyAge?: string;
  possessionStatus?: 'ready-to-move' | 'under-construction';
  ownershipType?: 'freehold' | 'leasehold' | 'co-operative' | 'power-of-attorney';
  securityDeposit?: string;
  monthlyMaintenance?: string;
  brokerage?: string;
  leaseDuration?: string;
  availableFrom?: string;
  preferredTenant?: 'anyone' | 'family' | 'bachelors' | 'company';
  updatedAt: number;
}

export class DraftManager {
  /**
   * Saves a listing draft to local AsyncStorage.
   */
  static async saveDraft(draft: Omit<PropertyDraft, 'updatedAt'>): Promise<void> {
    try {
      const payload: PropertyDraft = {
        ...draft,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[DraftManager] Failed to persist draft to AsyncStorage:', e);
    }
  }

  /**
   * Loads the existing draft if present.
   */
  static async loadDraft(): Promise<PropertyDraft | null> {
    try {
      const data = await AsyncStorage.getItem(DRAFT_KEY);
      if (data) {
        return JSON.parse(data) as PropertyDraft;
      }
    } catch (e) {
      console.warn('[DraftManager] Failed to load draft from AsyncStorage:', e);
    }
    return null;
  }

  /**
   * Removes the draft once published or discarded.
   */
  static async clearDraft(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      console.warn('[DraftManager] Failed to clear draft from AsyncStorage:', e);
    }
  }
}
