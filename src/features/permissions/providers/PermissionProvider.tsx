import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { PermissionState, PermissionType, PermissionStatus } from '../types';
import { permissionService } from '../services/permissionService';

interface PermissionContextValue {
  permissions: PermissionState;
  refreshPermissions: () => Promise<void>;
  requestPermission: (type: PermissionType) => Promise<PermissionStatus>;
  openSettings: () => void;
  isLoading: boolean;
}

export const PermissionContext = createContext<PermissionContextValue | null>(null);

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const [permissions, setPermissions] = useState<PermissionState>({
    location: 'undetermined',
    camera: 'undetermined',
    media: 'undetermined',
    notifications: 'undetermined',
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const statuses = await permissionService.getAllStatuses();
      setPermissions(statuses);
    } catch (e) {
      console.warn('Failed to refresh permissions', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPermissions();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refreshPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshPermissions]);

  const requestPermission = async (type: PermissionType): Promise<PermissionStatus> => {
    let newStatus: PermissionStatus = 'undetermined';
    
    try {
      switch (type) {
        case 'location':
          newStatus = await permissionService.requestLocation();
          break;
        case 'camera':
          newStatus = await permissionService.requestCamera();
          break;
        case 'media':
          newStatus = await permissionService.requestMediaLibrary();
          break;
        case 'notifications':
          newStatus = await permissionService.requestNotifications();
          break;
      }
      
      setPermissions(prev => ({ ...prev, [type]: newStatus }));
      return newStatus;
    } catch (e) {
      console.warn(`Failed to request ${type} permission`, e);
      return 'undetermined';
    }
  };

  const openSettings = () => {
    permissionService.openAppSettings();
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        refreshPermissions,
        requestPermission,
        openSettings,
        isLoading,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};
