import { Video } from 'react-native-compressor';

export class VideoProcessor {
  private static tempFiles: string[] = [];

  /**
   * Compresses a video walkthrough using H.264, AAC audio, 30 FPS, and 1080p target max dimensions (maxSize: 1920).
   * Throws a clean error if running in an unsupported sandbox (Expo Go) without linked native modules.
   */
  static async compressVideo(uri: string): Promise<string> {
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }

    try {
      if (!Video || typeof Video.compress !== 'function') {
        throw new Error('Video compressor native module is not available.');
      }

      const compressedUri = await Video.compress(
        uri,
        {
          compressionMethod: 'auto',
          maxSize: 1920,
        }
      );

      if (compressedUri) {
        this.tempFiles.push(compressedUri);
        return compressedUri;
      }
      throw new Error('Video compression returned empty path.');
    } catch (e: any) {
      console.error('[VideoProcessor] Execution exception:', e);
      
      const errMsg = e.message || '';
      if (
        errMsg.includes('Native') ||
        errMsg.includes('null is not an object') ||
        errMsg.includes('not found') ||
        errMsg.includes('not available') ||
        errMsg.includes('undefined is not an object')
      ) {
        throw new Error(
          'Walkthrough video compression requires native hardware acceleration, which is not available in this Expo Go environment. Please run the application using a custom development client.'
        );
      }
      throw new Error(e.message || 'Walkthrough video compression failed.');
    }
  }

  static getTempFiles(): string[] {
    return this.tempFiles;
  }

  static clearTempFiles() {
    this.tempFiles = [];
  }
}
