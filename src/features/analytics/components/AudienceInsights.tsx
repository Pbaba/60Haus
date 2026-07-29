import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../../../theme';
import { Users, MapPin, Clock } from 'lucide-react-native';

interface AudienceInsightsProps {
  mockData?: boolean;
}

export function AudienceInsights({ mockData = true }: AudienceInsightsProps) {
  // If we had real anonymous tracking, we'd pull from `useDashboard` 
  // For the demo / sprint requirements, we seed realistic mock data.
  const data = mockData ? {
    topCities: [
      { name: 'Mumbai', pct: 45 },
      { name: 'Bangalore', pct: 30 },
      { name: 'Pune', pct: 15 }
    ],
    commonBudget: '₹40,000 - ₹60,000 /mo',
    preferredType: '2 BHK Apartments',
    activeHours: '6:00 PM - 9:00 PM'
  } : null;

  if (!data) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audience Insights (Last 30 Days)</Text>
      
      <View style={styles.grid}>
        {/* Top Cities */}
        <View style={styles.card}>
          <View style={styles.header}>
            <MapPin size={16} color={Theme.colors.primary} />
            <Text style={styles.cardTitle}>Top Cities</Text>
          </View>
          {data.topCities.map((city, idx) => (
            <View key={idx} style={styles.cityRow}>
              <Text style={styles.cityText}>{city.name}</Text>
              <Text style={styles.cityPct}>{city.pct}%</Text>
            </View>
          ))}
        </View>

        {/* Demographics */}
        <View style={styles.card}>
          <View style={styles.header}>
            <Users size={16} color={Theme.colors.primary} />
            <Text style={styles.cardTitle}>Preferences</Text>
          </View>
          
          <View style={styles.prefItem}>
            <Text style={styles.prefLabel}>Avg Budget</Text>
            <Text style={styles.prefValue}>{data.commonBudget}</Text>
          </View>
          
          <View style={styles.prefItem}>
            <Text style={styles.prefLabel}>Favors</Text>
            <Text style={styles.prefValue}>{data.preferredType}</Text>
          </View>

          <View style={styles.headerSpacer} />

          <View style={styles.header}>
            <Clock size={16} color={Theme.colors.primary} />
            <Text style={styles.cardTitle}>Peak Hours</Text>
          </View>
          <View style={styles.prefItem}>
            <Text style={styles.prefValue}>{data.activeHours}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    marginBottom: Theme.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Theme.spacing.sm,
  },
  headerSpacer: {
    marginTop: Theme.spacing.md,
  },
  cardTitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilyBold,
    textTransform: 'uppercase',
  },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cityText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  cityPct: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  prefItem: {
    marginBottom: 8,
  },
  prefLabel: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  prefValue: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  }
});
