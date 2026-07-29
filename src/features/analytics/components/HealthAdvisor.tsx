import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../../../theme';
import { InsightSuggestion } from '../services/insightEngine';
import { ShieldCheck, ShieldAlert, ArrowUpRight } from 'lucide-react-native';

interface HealthAdvisorProps {
  score: number;
  suggestions: InsightSuggestion[];
}

export function HealthAdvisor({ score, suggestions }: HealthAdvisorProps) {
  const isGood = score >= 80;
  const isOk = score >= 50 && score < 80;
  const scoreColor = isGood ? Theme.colors.success : isOk ? '#DFB978' : Theme.colors.danger;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {isGood ? (
            <ShieldCheck size={20} color={scoreColor} />
          ) : (
            <ShieldAlert size={20} color={scoreColor} />
          )}
          <Text style={styles.title}>Listing Health</Text>
        </View>
        <Text style={[styles.score, { color: scoreColor }]}>{score}%</Text>
      </View>

      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${score}%`, backgroundColor: scoreColor }]} />
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Recommendations</Text>
          {suggestions.map((sug, idx) => (
            <View key={idx} style={styles.suggestionRow}>
              <View style={[
                styles.dot, 
                sug.type === 'success' ? { backgroundColor: Theme.colors.success } :
                sug.type === 'warning' ? { backgroundColor: Theme.colors.danger } : 
                { backgroundColor: Theme.colors.primary }
              ]} />
              <View style={styles.suggestionTextContainer}>
                <Text style={styles.suggestionText}>{sug.text}</Text>
                {sug.boost > 0 && (
                  <View style={styles.boostPill}>
                    <ArrowUpRight size={10} color={Theme.colors.success} />
                    <Text style={styles.boostText}>+{sug.boost}% views</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginVertical: Theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  score: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  barBg: {
    height: 8,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Theme.spacing.lg,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  suggestionsContainer: {
    gap: Theme.spacing.sm,
  },
  suggestionsTitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  suggestionTextContainer: {
    flex: 1,
    gap: 4,
  },
  suggestionText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    lineHeight: 20,
  },
  boostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.success + '15',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  boostText: {
    fontSize: 10,
    color: Theme.colors.success,
    fontFamily: Theme.typography.fontFamilyBold,
  },
});
