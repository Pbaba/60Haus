import React, { createContext, useContext, useEffect, useState } from 'react';
import { betaService } from '../services/betaService';

interface FeatureFlagContextType {
  flags: Record<string, any>;
  isLoading: boolean;
  getFlag: (key: string, defaultValue?: any) => any;
}

const FeatureFlagContext = createContext<FeatureFlagContextType>({
  flags: {},
  isLoading: true,
  getFlag: () => false,
});

export const useFeatureFlagsContext = () => useContext(FeatureFlagContext);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const initFlags = async () => {
      const remoteFlags = await betaService.fetchFeatureFlags();
      if (mounted) {
        setFlags(remoteFlags);
        setIsLoading(false);
      }
    };

    initFlags();

    return () => { mounted = false; };
  }, []);

  const getFlag = (key: string, defaultValue: any = false) => {
    return flags[key] !== undefined ? flags[key] : defaultValue;
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, isLoading, getFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};
