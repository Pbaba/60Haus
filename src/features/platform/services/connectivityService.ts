import * as Network from 'expo-network';
import { retryQueueService } from './retryQueueService';
import { loggingService } from './loggingService';

class ConnectivityService {
  private isOffline = false;
  private listeners: Set<(isConnected: boolean) => void> = new Set();
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  async init() {
    await this.checkStatus();
    
    // expo-network doesn't have an event listener built-in across all platforms consistently
    // like NetInfo does, so we poll gently if offline, or rely on active action checks.
    // However, expo-network exposes addNetworkStateListener in newer versions if available,
    // but a reliable fallback is a gentle interval or checking before requests.
    this.checkInterval = setInterval(this.checkStatus.bind(this), 5000);
  }

  async checkStatus() {
    try {
      const state = await Network.getNetworkStateAsync();
      const isConnected = !!state.isConnected && !!state.isInternetReachable;
      
      if (this.isOffline === isConnected) { // state changed
        this.isOffline = !isConnected;
        this.notifyListeners();

        if (isConnected) {
          loggingService.info('Network restored. Processing retry queue...');
          retryQueueService.processQueue();
        } else {
          loggingService.info('Network offline.');
        }
      }
      
      return isConnected;
    } catch {
      return false; // assume offline on error to be safe
    }
  }

  subscribe(listener: (isConnected: boolean) => void) {
    this.listeners.add(listener);
    // initial state
    listener(!this.isOffline);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(!this.isOffline));
  }

  get isConnected() {
    return !this.isOffline;
  }
}

export const connectivityService = new ConnectivityService();
