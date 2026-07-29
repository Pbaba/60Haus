import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Bug, Lightbulb, UserCheck, X } from 'lucide-react-native';
import { Theme } from '../../../theme';
import { Button } from '../../../components/Button';
import { betaService } from '../services/betaService';
import { useAuth } from '../../../hooks/useAuth';
import { useFeedback } from '../../../context/FeedbackContext';

interface BetaFeedbackSheetProps {
  isVisible: boolean;
  onClose: () => void;
  currentScreen?: string;
}

type FeedbackType = 'bug' | 'feature' | 'usability' | 'general';

export function BetaFeedbackSheet({ isVisible, onClose, currentScreen }: BetaFeedbackSheetProps) {
  const [type, setType] = useState<FeedbackType>('bug');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { showToast } = useFeedback();

  if (!isVisible) return null;

  const handleSubmit = async () => {
    if (!description.trim()) {
      showToast('Please provide a description', 'warning');
      return;
    }

    setIsSubmitting(true);
    const success = await betaService.submitFeedback({
      userId: user?.id,
      type,
      description,
      screenName: currentScreen || 'Unknown',
    });
    setIsSubmitting(false);

    if (success) {
      showToast('Feedback submitted successfully. Thank you!', 'success');
      setDescription('');
      onClose();
    } else {
      showToast('Failed to submit feedback. Please try again.', 'error');
    }
  };

  const renderTypeSelector = (selectedType: FeedbackType, Icon: any, label: string) => (
    <TouchableOpacity 
      style={[styles.typeOption, type === selectedType && styles.typeOptionSelected]}
      onPress={() => setType(selectedType)}
      key={selectedType}
    >
      <Icon size={20} color={type === selectedType ? Theme.colors.primary : Theme.colors.textSecondary} />
      <Text style={[styles.typeOptionText, type === selectedType && styles.typeOptionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Beta Feedback</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>What kind of feedback do you have?</Text>
          
          <View style={styles.typeSelector}>
            {renderTypeSelector('bug', Bug, 'Bug')}
            {renderTypeSelector('usability', UserCheck, 'Usability')}
            {renderTypeSelector('feature', Lightbulb, 'Feature')}
          </View>

          <TextInput
            style={styles.input}
            multiline
            placeholder="Describe the issue or idea in detail..."
            placeholderTextColor={Theme.colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            autoFocus
          />

          <Button 
            variant="primary" 
            onPress={handleSubmit} 
            disabled={isSubmitting || !description.trim()}
          >
            {isSubmitting ? <ActivityIndicator color="#fff" /> : 'Submit Feedback'}
          </Button>
          
          <Text style={styles.disclaimer}>
            Device info and app version will be attached automatically to help us diagnose issues.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontFamily: Theme.typography.fontFamilyBold,
    fontSize: Theme.typography.sizes.h3,
    color: Theme.colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontFamily: Theme.typography.fontFamilyMedium,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  typeOptionSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: `${Theme.colors.primary}10`,
  },
  typeOptionText: {
    fontFamily: Theme.typography.fontFamilyMedium,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
  },
  typeOptionTextSelected: {
    color: Theme.colors.primary,
  },
  input: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: Theme.spacing.lg,
  },
  disclaimer: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: Theme.spacing.md,
  }
});
