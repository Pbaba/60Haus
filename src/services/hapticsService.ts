import * as Haptics from 'expo-haptics';

export const hapticsService = {
  selection() {
    try {
      Haptics.selectionAsync();
    } catch (e) {
      console.warn('Haptic selection feedback failed', e);
    }
  },

  light() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('Haptic light feedback failed', e);
    }
  },

  medium() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.warn('Haptic medium feedback failed', e);
    }
  },

  heavy() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      console.warn('Haptic heavy feedback failed', e);
    }
  },

  success() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('Haptic success feedback failed', e);
    }
  },

  warning() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      console.warn('Haptic warning feedback failed', e);
    }
  },

  error() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      console.warn('Haptic error feedback failed', e);
    }
  },
};
