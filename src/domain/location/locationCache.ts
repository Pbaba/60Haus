import { NearbyPlace, CommuteEstimate, LocalityMetrics, NeighborhoodSnapshot } from './interfaces';

class LocationCacheManager {
  private nearbyPlacesCache = new Map<string, NearbyPlace[]>();
  private commuteCache = new Map<string, CommuteEstimate[]>();
  private metricsCache = new Map<string, LocalityMetrics>();
  private snapshotCache = new Map<string, NeighborhoodSnapshot>();

  getNearbyPlaces(key: string): NearbyPlace[] | undefined {
    return this.nearbyPlacesCache.get(key);
  }

  setNearbyPlaces(key: string, value: NearbyPlace[]) {
    this.nearbyPlacesCache.set(key, value);
  }

  getCommuteEstimates(key: string): CommuteEstimate[] | undefined {
    return this.commuteCache.get(key);
  }

  setCommuteEstimates(key: string, value: CommuteEstimate[]) {
    this.commuteCache.set(key, value);
  }

  getLocalityMetrics(key: string): LocalityMetrics | undefined {
    return this.metricsCache.get(key);
  }

  setLocalityMetrics(key: string, value: LocalityMetrics) {
    this.metricsCache.set(key, value);
  }

  getNeighborhoodSnapshot(key: string): NeighborhoodSnapshot | undefined {
    return this.snapshotCache.get(key);
  }

  setNeighborhoodSnapshot(key: string, value: NeighborhoodSnapshot) {
    this.snapshotCache.set(key, value);
  }

  clear() {
    this.nearbyPlacesCache.clear();
    this.commuteCache.clear();
    this.metricsCache.clear();
    this.snapshotCache.clear();
  }
}

export const locationCache = new LocationCacheManager();
