import { ListingStatistics } from '../../../types';

export interface InsightSuggestion {
  text: string;
  boost: number;
  type: 'improvement' | 'warning' | 'success';
}

export const insightEngine = {
  analyzeListing(stats: ListingStatistics | null): InsightSuggestion[] {
    const suggestions: InsightSuggestion[] = [];
    
    if (!stats) return suggestions;

    // 1. High views, low messages
    if (stats.total_views > 100 && stats.messages_received < 2) {
      suggestions.push({
        text: 'High traffic, but low inquiries. Consider improving your description or adjusting the price.',
        boost: 15,
        type: 'improvement'
      });
    }

    // 2. High saves, no visits
    if (stats.saves > 20 && stats.visit_requests === 0) {
      suggestions.push({
        text: 'Many users saved this property. Reach out to them or offer a quick video tour.',
        boost: 25,
        type: 'improvement'
      });
    }

    // 3. Excellent Conversion
    if (stats.messages_received > 0 && stats.visit_requests > 0 && (stats.visit_requests / stats.messages_received) > 0.5) {
      suggestions.push({
        text: 'Great conversion from messages to visits! Keep responding quickly.',
        boost: 0,
        type: 'success'
      });
    }

    // 4. Low Health Score
    if (stats.health_score < 60) {
      suggestions.push({
        text: 'Your listing health is low. Complete all property details and add more high-quality photos.',
        boost: 30,
        type: 'warning'
      });
    }

    return suggestions;
  }
};
