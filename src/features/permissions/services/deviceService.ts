import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { DeviceCapabilities } from '../types';

export const deviceService = {
  isSimulator: !Device.isDevice,

  async getCapabilities(): Promise<DeviceCapabilities> {
    const hasLocation = await Location.hasServicesEnabledAsync().catch(() => false);
    
    return {
      isSimulator: this.isSimulator,
      hasCamera: true, // We could potentially check for hardware, but expo-camera handles lack of camera gracefully via permissions/status usually, or we can assume phones have cameras. Let's assume true unless it's a specific device type without one.
      hasLocationServices: hasLocation,
    };
  }
};
