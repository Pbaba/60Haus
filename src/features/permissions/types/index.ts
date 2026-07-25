export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'limited' | 'unavailable';
export type PermissionType = 'location' | 'camera' | 'media' | 'notifications';

export interface PermissionState {
  location: PermissionStatus;
  camera: PermissionStatus;
  media: PermissionStatus;
  notifications: PermissionStatus;
}

export interface PermissionConfig {
  type: PermissionType;
  title: string;
  description: string;
}

export interface DeviceCapabilities {
  hasCamera: boolean;
  hasLocationServices: boolean;
  isSimulator: boolean;
}
