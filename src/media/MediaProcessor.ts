import * as FileSystem from 'expo-file-system/legacy';
import { ImageProcessor } from './ImageProcessor';
import { VideoProcessor } from './VideoProcessor';
import { ThumbnailGenerator } from './ThumbnailGenerator';

export class MediaProcessor {
  /**
   * Cleans up all temporary files generated during processing.
   * This is called after uploading or on execution failures.
   */
  static async cleanupTempFiles() {
    const files = [
      ...ImageProcessor.getTempFiles(),
      ...VideoProcessor.getTempFiles(),
      ...ThumbnailGenerator.getTempFiles(),
    ];

    console.log(`[MediaProcessor] Starting cleanup of ${files.length} processed temporary files...`);
    
    for (const uri of files) {
      try {
        if (uri.startsWith('file://')) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      } catch (e) {
        console.warn('[MediaProcessor] Failed to delete temp file:', uri, e);
      }
    }

    // Reset track lists
    ImageProcessor.clearTempFiles();
    VideoProcessor.clearTempFiles();
    ThumbnailGenerator.clearTempFiles();
    console.log('[MediaProcessor] Processed temporary files cleaned successfully.');
  }
}
