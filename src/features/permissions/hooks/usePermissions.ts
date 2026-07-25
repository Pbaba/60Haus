import { useContext } from 'react';
import { PermissionContext } from '../providers/PermissionProvider';

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};
