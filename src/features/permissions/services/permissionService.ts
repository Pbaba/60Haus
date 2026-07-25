import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { PermissionStatus, PermissionState } from '../types';
import { deviceService } from './deviceService';

const normalizeStatus = (status: any): PermissionStatus => {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  if (status === 'undetermined') return 'undetermined';
  // Note: some packages might return 'limited' (like iOS photo library), but typically it falls under granted or needs special handling. 
  // We'll treat limited as granted for most simplicity, or map it if it exists.
  if (status === 'limited') return 'limited';
  return 'undetermined';
};

export const permissionService = {
  openAppSettings: () => {
    Linking.openSettings();
  },

  async getLocationStatus(): Promise<PermissionStatus> {
    if (Platform.OS === 'web') return 'unavailable';
    const { status } = await Location.getForegroundPermissionsAsync();
    return normalizeStatus(status);
  },

  async requestLocation(): Promise<PermissionStatus> {
    if (Platform.OS === 'web') return 'unavailable';
    const { status } = await Location.requestForegroundPermissionsAsync();
    return normalizeStatus(status);
  },

  async getCameraStatus(): Promise<PermissionStatus> {
    if (deviceService.isSimulator) return 'unavailable';
    const { status } = await Camera.Camera.getCameraPermissionsAsync();
    return normalizeStatus(status);
  },

  async requestCamera(): Promise<PermissionStatus> {
    if (deviceService.isSimulator) return 'unavailable';
    const { status } = await Camera.Camera.requestCameraPermissionsAsync();
    return normalizeStatus(status);
  },

  async getMediaStatus(): Promise<PermissionStatus> {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    return normalizeStatus(status);
  },

  async requestMediaLibrary(): Promise<PermissionStatus> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return normalizeStatus(status);
  },

  async getNotificationsStatus(): Promise<PermissionStatus> {
    if (deviceService.isSimulator) return 'unavailable';
    const { status } = await Notifications.getPermissionsAsync();
    return normalizeStatus(status);
  },

  async requestNotifications(): Promise<PermissionStatus> {
    if (deviceService.isSimulator) return 'unavailable';
    const { status } = await Notifications.requestPermissionsAsync();
    return normalizeStatus(status);
  },

  async getAllStatuses(): Promise<PermissionState> {
    const [location, camera, media, notifications] = await Promise.all([
      this.getLocationStatus(),
      this.getCameraStatus(),
      this.getMediaStatus(),
      this.getNotificationsStatus(),
    ]);

    return { location, camera, media, notifications };
  }
};
