import * as VideoThumbnails from 'expo-video-thumbnails';

export class ThumbnailGenerator {
  private static tempFiles: string[] = [];

  /**
   * Generates a thumbnail image from a local video walkthrough at the 1000ms mark.
   */
  static async generateThumbnail(videoUri: string): Promise<string> {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000,
      });
      this.tempFiles.push(uri);
      return uri;
    } catch (e) {
      console.warn('[ThumbnailGenerator] Failed to extract thumbnail:', e);
      throw new Error('Failed to auto-generate video thumbnail.');
    }
  }

  static getTempFiles(): string[] {
    return this.tempFiles;
  }

  static clearTempFiles() {
    this.tempFiles = [];
  }
}
