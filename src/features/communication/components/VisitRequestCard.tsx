import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Theme } from '../../../theme';
import { VisitRequest } from '../../../types';
import { Calendar, Clock } from 'lucide-react-native';

interface VisitRequestCardProps {
  visitRequest: VisitRequest | null;
  isOwner: boolean;
  onAction?: (action: 'accept' | 'decline' | 'reschedule') => void;
}

export const VisitRequestCard: React.FC<VisitRequestCardProps> = ({ visitRequest, isOwner, onAction }) => {
  if (!visitRequest) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Visit Request</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(visitRequest.status) }]}>
          <Text style={styles.statusText}>{visitRequest.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Calendar size={14} color={Theme.colors.textSecondary} />
          <Text style={styles.detailText}>{visitRequest.requested_date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Clock size={14} color={Theme.colors.textSecondary} />
          <Text style={styles.detailText}>{visitRequest.requested_time}</Text>
        </View>
        {visitRequest.note ? (
          <Text style={styles.note}>"{visitRequest.note}"</Text>
        ) : null}
      </View>

      {isOwner && visitRequest.status === 'pending' && onAction && (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.btn, styles.declineBtn]} 
            onPress={() => onAction('decline')}
          >
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.btn, styles.acceptBtn]} 
            onPress={() => onAction('accept')}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

function getStatusColor(status: string) {
  switch (status) {
    case 'accepted': return Theme.colors.success + '20';
    case 'declined': return Theme.colors.danger + '20';
    case 'rescheduled': return Theme.colors.warning + '20';
    default: return Theme.colors.primary + '20';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    width: 260,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontFamily: Theme.typography.fontFamilyBold,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
  },
  statusText: {
    fontFamily: Theme.typography.fontFamilyBold,
    fontSize: 10,
    color: Theme.colors.textPrimary,
  },
  details: {
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
  },
  note: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
  },
  declineBtn: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  declineText: {
    fontFamily: Theme.typography.fontFamilyMedium,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
  },
  acceptBtn: {
    backgroundColor: Theme.colors.primary,
  },
  acceptText: {
    fontFamily: Theme.typography.fontFamilyMedium,
    fontSize: Theme.typography.sizes.sm,
    color: '#fff',
  }
});
