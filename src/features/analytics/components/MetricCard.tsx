import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../../components/Card';
import { Theme } from '../../../theme';
import { LucideIcon } from 'lucide-react-native';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon?: LucideIcon;
  trend?: number; // percentage
  trendLabel?: string;
  highlight?: boolean;
}

export function MetricCard({ title, value, icon: Icon, trend, trendLabel, highlight }: MetricCardProps) {
  const isPositive = typeof trend === 'number' && trend > 0;
  const isNegative = typeof trend === 'number' && trend < 0;

  return (
    <Card style={[styles.container, highlight && styles.highlighted]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {Icon && <Icon size={16} color={highlight ? Theme.colors.primary : Theme.colors.textSecondary} />}
      </View>
      
      <Text style={[styles.value, highlight && styles.valueHighlight]}>{value}</Text>
      
      {trend !== undefined && (
        <View style={styles.trendRow}>
          <Text style={[
            styles.trendText,
            isPositive ? styles.trendPos : isNegative ? styles.trendNeg : styles.trendNeutral
          ]}>
            {isPositive ? '+' : ''}{trend}%
          </Text>
          {trendLabel && (
            <Text style={styles.trendLabel}>{trendLabel}</Text>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  highlighted: {
    backgroundColor: Theme.colors.primary + '0A',
    borderColor: Theme.colors.primary + '30',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  title: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: Theme.typography.sizes.h3,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  valueHighlight: {
    color: Theme.colors.primary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  trendPos: { color: Theme.colors.success },
  trendNeg: { color: Theme.colors.danger },
  trendNeutral: { color: Theme.colors.textSecondary },
  trendLabel: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
});
