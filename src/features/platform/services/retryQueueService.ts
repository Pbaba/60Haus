import AsyncStorage from '@react-native-async-storage/async-storage';
import { loggingService } from './loggingService';

export interface RetryAction {
  id: string;
  type: 'SAVE_PROPERTY' | 'SEND_MESSAGE' | 'UPDATE_PROFILE' | 'VISIT_REQUEST';
  payload: any;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = '@60haus_retry_queue';

class RetryQueueService {
  private queue: RetryAction[] = [];
  private isProcessing = false;
  private actionHandlers: Map<string, (payload: any) => Promise<void>> = new Map();

  registerHandler(type: RetryAction['type'], handler: (payload: any) => Promise<void>) {
    this.actionHandlers.set(type, handler);
  }

  async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        loggingService.info(`Loaded ${this.queue.length} pending actions from retry queue.`);
      }
    } catch (e) {
      loggingService.error('Failed to load retry queue', e);
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      loggingService.error('Failed to save retry queue', e);
    }
  }

  async enqueue(type: RetryAction['type'], payload: any) {
    const action: RetryAction = {
      id: Math.random().toString(36).substring(7),
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    
    this.queue.push(action);
    await this.saveQueue();
    loggingService.info(`Queued action: ${type}`, { actionId: action.id });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    loggingService.info(`Processing retry queue: ${this.queue.length} items`);

    const failedItems: RetryAction[] = [];

    for (const action of this.queue) {
      const handler = this.actionHandlers.get(action.type);
      
      if (!handler) {
        loggingService.warn(`No handler registered for action type: ${action.type}`);
        continue;
      }

      try {
        await handler(action.payload);
        loggingService.info(`Successfully processed queued action: ${action.type}`);
      } catch {
        loggingService.warn(`Retry failed for action: ${action.type}`, { retries: action.retries });
        action.retries += 1;
        
        if (action.retries < 5) {
          failedItems.push(action);
        } else {
          loggingService.error(`Action ${action.type} failed permanently after 5 retries. Dropping.`);
        }
      }
    }

    this.queue = failedItems;
    await this.saveQueue();
    this.isProcessing = false;
  }
  
  getPendingCount() {
    return this.queue.length;
  }
}

export const retryQueueService = new RetryQueueService();
