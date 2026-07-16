import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Theme } from '../theme';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  destructive?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}) => {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay} accessibilityRole="alert" accessibilityLabel={title} accessibilityHint={message}>
        <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelText}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.btn,
                destructive ? styles.destructiveBtn : styles.confirmBtn,
              ]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              <Text
                style={[
                  styles.btnText,
                  destructive ? styles.destructiveText : styles.confirmText,
                ]}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: Theme.spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Theme.colors.surface,
    borderColor: Theme.colors.border,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xl,
    gap: Theme.spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    textAlign: 'center',
  },
  message: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: Theme.typography.lineHeights.md,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.xs,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtn: {
    borderColor: Theme.colors.border,
    backgroundColor: 'transparent',
  },
  confirmBtn: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '15',
  },
  destructiveBtn: {
    borderColor: Theme.colors.danger,
    backgroundColor: Theme.colors.danger + '15',
  },
  cancelText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  btnText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  confirmText: {
    color: Theme.colors.primary,
  },
  destructiveText: {
    color: Theme.colors.danger,
  },
});
