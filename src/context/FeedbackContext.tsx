import React, { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react-native';
import { Theme } from '../theme';
import { hapticsService } from '../services/hapticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type FeedbackLevelType = 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface FeedbackContextType {
  showToast: (message: string, type?: ToastType) => void;
  showTransactionFeedback: (
    type: FeedbackLevelType,
    title: string,
    description: string,
    actionText?: string,
    onAction?: () => void
  ) => Promise<void>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider');
  return context;
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Toast states
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTranslateY = useSharedValue(120);
  const toastOpacity = useSharedValue(0);
  const toastTimeoutRef = useRef<any>(null);

  // Transaction states
  const [feedback, setFeedback] = useState<{
    type: FeedbackLevelType;
    title: string;
    description: string;
    actionText?: string;
    onAction?: () => void;
    resolve?: () => void;
  } | null>(null);

  const overlayOpacity = useSharedValue(0);
  const overlayScale = useSharedValue(0.9);
  const iconScale = useSharedValue(0.5);

  const dismissToast = useCallback(() => {
    toastTranslateY.value = withSpring(120, Theme.motion.springs.default);
    toastOpacity.value = withTiming(0, { duration: Theme.motion.duration.fast }, () => {
      runOnJS(setToast)(null);
    });
  }, [toastTranslateY, toastOpacity]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    // 1. Play haptic
    if (type === 'success') hapticsService.light();
    else if (type === 'error') hapticsService.error();
    else if (type === 'warning') hapticsService.warning();
    else hapticsService.selection();

    // 2. Clear pending timeouts
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({ id: message, message, type });
    toastTranslateY.value = 120;
    toastOpacity.value = 0;
    
    // 3. Animate in
    toastTranslateY.value = withSpring(0, Theme.motion.springs.default);
    toastOpacity.value = withTiming(1, { duration: Theme.motion.duration.fast });

    // 4. Auto dismiss
    toastTimeoutRef.current = setTimeout(() => {
      dismissToast();
    }, 3200);
  }, [dismissToast, toastTranslateY, toastOpacity]);

  const showTransactionFeedback = useCallback((
    type: FeedbackLevelType,
    title: string,
    description: string,
    actionText?: string,
    onAction?: () => void
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (type === 'success') hapticsService.success();
      else if (type === 'error') hapticsService.error();
      else if (type === 'warning') hapticsService.warning();

      setFeedback({ type, title, description, actionText, onAction, resolve });
      overlayOpacity.value = withTiming(1, { duration: Theme.motion.duration.normal });
      overlayScale.value = withSpring(1, Theme.motion.springs.gentle);
      iconScale.value = withDelay(150, withSpring(1, Theme.motion.springs.bouncy));
    });
  }, [overlayOpacity, overlayScale, iconScale]);

  const dismissFeedback = useCallback((resolveCallback?: () => void) => {
    overlayOpacity.value = withTiming(0, { duration: Theme.motion.duration.fast });
    overlayScale.value = withTiming(0.9, { duration: Theme.motion.duration.fast }, () => {
      const pendingResolve = resolveCallback || feedback?.resolve;
      runOnJS(setFeedback)(null);
      if (pendingResolve) {
        runOnJS(pendingResolve)();
      }
    });
  }, [feedback, overlayOpacity, overlayScale]);

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Animated styles
  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
    transform: [{ translateY: toastTranslateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  // Helper icons mapping
  const renderToastIcon = (type: ToastType) => {
    const size = 18;
    switch (type) {
      case 'success':
        return <CheckCircle2 size={size} color={Theme.colors.success} />;
      case 'error':
        return <XCircle size={size} color={Theme.colors.danger} />;
      case 'warning':
        return <AlertTriangle size={size} color={Theme.colors.warning} />;
      default:
        return <Info size={size} color={Theme.colors.primary} />;
    }
  };

  const renderFeedbackIcon = (type: FeedbackLevelType) => {
    const size = 68;
    switch (type) {
      case 'success':
        return <CheckCircle2 size={size} color={Theme.colors.success} />;
      case 'error':
        return <XCircle size={size} color={Theme.colors.danger} />;
      case 'warning':
        return <AlertTriangle size={size} color={Theme.colors.warning} />;
    }
  };

  // Get background gradient styles based on transaction state
  const getFeedbackBgColor = (type: FeedbackLevelType) => {
    switch (type) {
      case 'success':
        return '#0A1E12'; // Deep success green
      case 'error':
        return '#1E0A0A'; // Deep failure red
      case 'warning':
        return '#1E1A0A'; // Deep warning gold
    }
  };

  const contextValue = useMemo(() => ({
    showToast,
    showTransactionFeedback,
  }), [showToast, showTransactionFeedback]);

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}

      {/* Global Animated Toast container */}
      {toast && (
        <Animated.View style={[styles.toastContainer, toastStyle]}>
          <BlurView intensity={35} tint="dark" style={[styles.toastBlur, styles[`toastBorder_${toast.type}`]]}>
            <View style={styles.toastContent}>
              {renderToastIcon(toast.type)}
              <Text style={styles.toastText} numberOfLines={2}>
                {toast.message}
              </Text>
            </View>
          </BlurView>
        </Animated.View>
      )}

      {/* Global Full-Screen Transaction Overlay */}
      {feedback && (
        <Animated.View
          style={[
            styles.feedbackOverlay,
            { backgroundColor: getFeedbackBgColor(feedback.type) },
            overlayStyle,
          ]}
        >
          <View style={styles.feedbackContent}>
            <Animated.View style={[styles.iconContainer, iconStyle]}>
              {renderFeedbackIcon(feedback.type)}
            </Animated.View>

            <Text style={styles.feedbackTitle}>{feedback.title}</Text>
            <Text style={styles.feedbackDesc}>{feedback.description}</Text>

            <View style={styles.feedbackButtons}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.primaryActionBtn}
                onPress={() => {
                  hapticsService.light();
                  if (feedback.onAction) feedback.onAction();
                  dismissFeedback();
                }}
              >
                <Text style={styles.primaryActionText}>{feedback.actionText || 'Continue'}</Text>
              </TouchableOpacity>

              {feedback.actionText && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.secondaryActionBtn}
                  onPress={() => {
                    hapticsService.selection();
                    dismissFeedback();
                  }}
                >
                  <Text style={styles.secondaryActionText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      )}
    </FeedbackContext.Provider>
  );
};

const styles = StyleSheet.create<any>({
  toastContainer: {
    position: 'absolute',
    bottom: Theme.floatingDock.height + 40,
    alignSelf: 'center',
    width: SCREEN_WIDTH - 48,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  toastBlur: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  toastBorder_success: {
    borderColor: 'rgba(50, 213, 131, 0.25)',
  },
  toastBorder_error: {
    borderColor: 'rgba(255, 92, 92, 0.25)',
  },
  toastBorder_warning: {
    borderColor: 'rgba(223, 185, 120, 0.25)',
  },
  toastBorder_info: {
    borderColor: 'rgba(250, 250, 250, 0.15)',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toastText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    fontFamily: Theme.typography.fontFamily,
  },
  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
  },
  feedbackContent: {
    width: SCREEN_WIDTH - 64,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  feedbackTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Theme.typography.fontFamily,
  },
  feedbackDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 16,
    fontFamily: Theme.typography.fontFamily,
  },
  feedbackButtons: {
    width: '100%',
    gap: 12,
  },
  primaryActionBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#0F0F12',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Theme.typography.fontFamily,
  },
  secondaryActionBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Theme.typography.fontFamily,
  },
});
