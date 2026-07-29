import { useFeatureFlagsContext } from '../providers/FeatureFlagProvider';

export function useFeatureFlags() {
  const { flags, isLoading, getFlag } = useFeatureFlagsContext();
  
  return {
    flags,
    isLoading,
    isFeatureEnabled: (key: string, defaultValue: boolean = false): boolean => {
      return Boolean(getFlag(key, defaultValue));
    },
    getFeatureValue: <T>(key: string, defaultValue: T): T => {
      return getFlag(key, defaultValue) as T;
    }
  };
}
