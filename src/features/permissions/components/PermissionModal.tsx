import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import { Shield, X, MapPin, Camera, Image as ImageIcon, Bell } from 'lucide-react-native';
import { Theme } from '../../../theme';
import { Button } from '../../../components/Button';
import { PermissionType } from '../types';

interface PermissionModalProps {
  visible: boolean;
  type: PermissionType;
  title: string;
  description: string;
  onContinue: () => void;
  onCancel: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  visible,
  type,
  title,
  description,
  onContinue,
  onCancel,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'location': return <MapPin size={32} color={Theme.colors.primary} />;
      case 'camera': return <Camera size={32} color={Theme.colors.primary} />;
      case 'media': return <ImageIcon size={32} color={Theme.colors.primary} />;
      case 'notifications': return <Bell size={32} color={Theme.colors.primary} />;
      default: return <Shield size={32} color={Theme.colors.primary} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel} />
        <View style={styles.sheet}>
          <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
            <X size={20} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          
          <View style={styles.actions}>
            <Button variant="primary" style={styles.continueBtn} onPress={onContinue}>
              Continue
            </Button>
            <Button variant="secondary" style={styles.cancelBtn} onPress={onCancel}>
              Not Now
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxxl,
    minHeight: 300,
  },
  closeBtn: {
    position: 'absolute',
    top: Theme.spacing.lg,
    right: Theme.spacing.lg,
    padding: Theme.spacing.xs,
    zIndex: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    marginTop: Theme.spacing.sm,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    marginBottom: Theme.spacing.sm,
  },
  description: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    lineHeight: 22,
    marginBottom: Theme.spacing.xl,
  },
  actions: {
    gap: Theme.spacing.sm,
  },
  continueBtn: {
    width: '100%',
  },
  cancelBtn: {
    width: '100%',
  }
});
