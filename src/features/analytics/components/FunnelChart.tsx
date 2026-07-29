import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Theme } from '../../../theme';

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

interface FunnelChartProps {
  data: FunnelStep[];
}

export function FunnelChart({ data }: FunnelChartProps) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(data[0].value, 1);

  return (
    <View style={styles.container}>
      {data.map((step, index) => {
        const widthPct = Math.max((step.value / maxVal) * 100, 5); // min 5% width for visibility
        const prevVal = index > 0 ? data[index - 1].value : null;
        const conversion = prevVal && prevVal > 0 ? Math.round((step.value / prevVal) * 100) : null;

        return (
          <View key={step.label} style={styles.stepContainer}>
            {/* Conversion line between steps */}
            {index > 0 && (
              <View style={styles.conversionBox}>
                <View style={styles.line} />
                <Text style={styles.conversionText}>{conversion}%</Text>
              </View>
            )}

            <View style={styles.barRow}>
              <View style={styles.labelCol}>
                <Text style={styles.stepLabel}>{step.label}</Text>
                <Text style={styles.stepValue}>{step.value}</Text>
              </View>
              
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { width: `${widthPct}%`, backgroundColor: step.color }
                  ]} 
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
    marginVertical: Theme.spacing.sm,
  },
  stepContainer: {
    alignItems: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  labelCol: {
    width: 80,
    alignItems: 'flex-end',
    paddingRight: Theme.spacing.md,
  },
  stepLabel: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  stepValue: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  barContainer: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  bar: {
    height: 24,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  conversionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    width: '100%',
    paddingLeft: 80 + Theme.spacing.md,
  },
  line: {
    width: 2,
    height: 30,
    backgroundColor: Theme.colors.border,
    marginLeft: 12,
  },
  conversionText: {
    marginLeft: Theme.spacing.sm,
    fontSize: 10,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    backgroundColor: Theme.colors.backgroundSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden'
  }
});
