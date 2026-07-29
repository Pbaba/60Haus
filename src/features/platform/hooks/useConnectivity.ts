import { useState, useEffect } from 'react';
import { connectivityService } from '../services/connectivityService';

export function useConnectivity() {
  const [isConnected, setIsConnected] = useState(connectivityService.isConnected);

  useEffect(() => {
    const unsubscribe = connectivityService.subscribe((status) => {
      setIsConnected(status);
    });

    return unsubscribe;
  }, []);

  return isConnected;
}
