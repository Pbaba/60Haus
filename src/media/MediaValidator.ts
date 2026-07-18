export class MediaValidator {
  /**
   * Validates full media limits and properties before publishing.
   */
  static validateListingMedia(imageUris: string[], videoUri: string | null, videoDuration?: number) {
    // 1. Photo limit checks (1-5 photos required)
    if (imageUris.length === 0) {
      throw new Error('At least 1 photo is required to publish this listing.');
    }
    if (imageUris.length > 5) {
      throw new Error('You can upload a maximum of 5 photos.');
    }

    // 2. Video limit checks (exactly 1 walkthrough video required)
    if (!videoUri) {
      throw new Error('A walkthrough video is required to publish this listing.');
    }

    // 3. Video duration check (maximum 60 seconds)
    if (videoDuration) {
      const durationSec = videoDuration > 500 ? videoDuration / 1000 : videoDuration;
      if (durationSec > 60) {
        throw new Error('Walkthrough video duration cannot exceed 60 seconds.');
      }
    }
  }

  /**
   * Validates video format parameters upon picker selection.
   */
  static validateVideoAsset(uri: string, duration?: number) {
    const fileExt = uri.split('.').pop()?.toLowerCase() || '';
    if (fileExt !== 'mp4' && fileExt !== 'mov') {
      throw new Error('Unsupported walkthrough video format. Only MP4 and MOV walkthrough videos are allowed.');
    }
    if (duration) {
      const durationSec = duration > 500 ? duration / 1000 : duration;
      if (durationSec > 60) {
        throw new Error('Walkthrough video duration cannot exceed 60 seconds.');
      }
    }
    // Landscape videos are allowed as requested, so no orientation checks are applied.
  }
}
