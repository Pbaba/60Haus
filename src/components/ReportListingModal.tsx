import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Theme } from '../theme';
import { reportService } from '../services/reportService';
import { AlertTriangle, X } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';

interface ReportListingModalProps {
  propertyId: string | null;
  visible: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Already Sold',
  'Already Rented',
  'Fake Listing',
  'Duplicate Listing',
  'Incorrect Information',
  'Spam',
  'Offensive Content',
  'Other'
];

export const ReportListingModal: React.FC<ReportListingModalProps> = ({ propertyId, visible, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user) {
      setErrorMsg('You must be logged in to report a listing.');
      return;
    }
    if (!propertyId || !selectedReason) return;
    
    setLoading(true);
    setErrorMsg(null);
    try {
      await reportService.submitReport(propertyId, selectedReason, details);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setSelectedReason(null);
    setDetails('');
    setErrorMsg(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Report Listing</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={24} color={Theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {success ? (
            <View style={styles.successContainer}>
              <View style={styles.iconCircle}>
                <AlertTriangle size={32} color={Theme.colors.primary} />
              </View>
              <Text style={styles.successTitle}>Report Submitted</Text>
              <Text style={styles.successDesc}>
                Thank you for helping us maintain marketplace integrity. Our moderation team will review this listing shortly.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <Text style={styles.subtitle}>
                Why are you reporting this listing?
              </Text>

              {errorMsg && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              <View style={styles.reasonList}>
                {REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonBtn,
                      selectedReason === reason && styles.reasonBtnActive
                    ]}
                    onPress={() => setSelectedReason(reason)}
                  >
                    <Text style={[
                      styles.reasonText,
                      selectedReason === reason && styles.reasonTextActive
                    ]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedReason === 'Other' && (
                <TextInput
                  style={styles.textInput}
                  placeholder="Please provide more details..."
                  placeholderTextColor={Theme.colors.textMuted}
                  multiline
                  value={details}
                  onChangeText={setDetails}
                  maxLength={500}
                />
              )}

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!selectedReason || loading) && styles.submitBtnDisabled
                ]}
                disabled={!selectedReason || loading}
                onPress={handleSubmit}
              >
                {loading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Theme.spacing.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.lg,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginBottom: Theme.spacing.lg,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: Theme.spacing.md,
  },
  errorText: {
    color: '#ef4444',
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.sm,
  },
  reasonList: {
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.xl,
  },
  reasonBtn: {
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  reasonBtnActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '10',
  },
  reasonText: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  reasonTextActive: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  textInput: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: Theme.spacing.xl,
  },
  submitBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#000',
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  successContainer: {
    padding: Theme.spacing.xxl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
  },
  successTitle: {
    fontSize: Theme.typography.sizes.xl,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    marginBottom: Theme.spacing.sm,
  },
  successDesc: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: 22,
  },
});
