import * as ImageManipulator from 'expo-image-manipulator';

export class ImageProcessor {
  private static tempFiles: string[] = [];

  /**
   * Resizes and compresses a single photo.
   * Target max dimensions: 1920x1080 (preserves aspect ratio).
   */
  static async processImage(uri: string): Promise<string> {
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }

    try {
      // 1. Load initial image details. Expo ImageManipulator also corrects orientation automatically.
      const info = await ImageManipulator.manipulateAsync(uri, []);

      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1080;
      const actions: ImageManipulator.Action[] = [];

      // 2. Compute resize factors if dimensions exceed max boundaries
      if (info.width > MAX_WIDTH || info.height > MAX_HEIGHT) {
        const widthRatio = MAX_WIDTH / info.width;
        const heightRatio = MAX_HEIGHT / info.height;
        const ratio = Math.min(widthRatio, heightRatio);

        actions.push({
          resize: {
            width: Math.round(info.width * ratio),
            height: Math.round(info.height * ratio),
          },
        });
      }

      // 3. Compress and save to temp file, stripping EXIF details
      const result = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      this.tempFiles.push(result.uri);
      return result.uri;
    } catch (e) {
      console.warn('[ImageProcessor] Processing failed, using original uri:', uri, e);
      return uri;
    }
  }

  /**
   * Processes a list of image URIs sequentially.
   */
  static async processImages(uris: string[]): Promise<string[]> {
    const processed: string[] = [];
    for (const uri of uris) {
      const pUri = await this.processImage(uri);
      processed.push(pUri);
    }
    return processed;
  }

  static getTempFiles(): string[] {
    return this.tempFiles;
  }

  static clearTempFiles() {
    this.tempFiles = [];
  }
}
