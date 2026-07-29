import { loggingService } from './loggingService';

class PerformanceService {
  private timers: Map<string, number> = new Map();

  startTimer(id: string) {
    this.timers.set(id, performance.now());
  }

  endTimer(id: string, logLabel: string) {
    const startTime = this.timers.get(id);
    if (!startTime) {
      loggingService.warn(`Performance timer ${id} ended without starting.`);
      return;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(id);

    loggingService.debug(`Performance | ${logLabel}`, { durationMs: Math.round(duration) });
    
    // Future Integration Point: PostHog / Datadog
    // if (duration > 1000) loggingService.warn('Slow operation detected', { id, duration });
    
    return duration;
  }

  async trackAsync<T>(id: string, logLabel: string, operation: () => Promise<T>): Promise<T> {
    this.startTimer(id);
    try {
      const result = await operation();
      return result;
    } finally {
      this.endTimer(id, logLabel);
    }
  }
}

export const performanceService = new PerformanceService();
