import { useState, useEffect } from 'react';
import { retryQueueService } from '../services/retryQueueService';
import { useConnectivity } from './useConnectivity';

export function useRetryQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const isConnected = useConnectivity();

  useEffect(() => {
    // Basic polling for UI updates. In a real robust app we might use an event emitter on the queue.
    const interval = setInterval(() => {
      setPendingCount(retryQueueService.getPendingCount());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    pendingCount,
    isProcessing: isConnected && pendingCount > 0, // Optimistic UI state
  };
}
