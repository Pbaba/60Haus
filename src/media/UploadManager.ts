import { PropertyListing } from '../types';
import { propertyService } from '../services/propertyService';
import { MediaValidator } from './MediaValidator';
import { ImageProcessor } from './ImageProcessor';
import { VideoProcessor } from './VideoProcessor';
import { ThumbnailGenerator } from './ThumbnailGenerator';
import { SupabaseStorageAdapter } from './StorageAdapter';
import { UploadQueue, UploadJob } from './UploadQueue';
import { MediaProcessor } from './MediaProcessor';
import { PipelineEventBus } from './PipelineEventBus';

export class UploadManager {
  private queue: UploadQueue;

  constructor() {
    this.queue = new UploadQueue(new SupabaseStorageAdapter());
  }

  /**
   * Publishes a new listing following the strict transactional publishing sequence:
   * 1. Validate listing details and media constraints.
   * 2. Insert database listing in 'pending' status.
   * 3. Process images and compress walkthrough video client-side.
   * 4. Generate video thumbnail.
   * 5. Upload files via the uploader queue (with exponential retries).
   * 6. Finalize URL paths in DB and mark status as 'published'.
   * 7. Clean up processed temporary files.
   */
  async publishListing(
    listingData: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUri: string | null,
    videoDuration?: number
  ): Promise<string> {
    PipelineEventBus.reset();
    let propertyId = '';

    try {
      // Step 1: Validating Listing
      PipelineEventBus.publish('stage_started', 'validating', 0, 'Validating listing specifications...');
      MediaValidator.validateListingMedia(imageUrls, videoUri, videoDuration);
      PipelineEventBus.publish('stage_completed', 'validating', 100);

      // Step 2: Create listing in database with pending status
      PipelineEventBus.publish('stage_started', 'creating_listing', 0, 'Creating pending listing...');
      const pendingData = {
        ...listingData,
        status: 'pending' as const, // Force pending status initially
      };
      propertyId = await propertyService.createListingPlaceholder(pendingData);
      PipelineEventBus.publish('stage_completed', 'creating_listing', 100);

      // Step 3: Optimize images
      PipelineEventBus.publish('stage_started', 'processing_images', 0, 'Optimizing property photos...');
      const optimizedImages = await ImageProcessor.processImages(imageUrls);
      PipelineEventBus.publish('stage_completed', 'processing_images', 100);

      // Step 4: Compress video
      let optimizedVideo = videoUri || '';
      if (videoUri) {
        PipelineEventBus.publish('stage_started', 'compressing_video', 0, 'Compressing walkthrough video...');
        optimizedVideo = await VideoProcessor.compressVideo(videoUri);
        PipelineEventBus.publish('stage_completed', 'compressing_video', 100);
      }

      // Step 5: Generate thumbnail
      let thumbnailUri = '';
      if (optimizedVideo) {
        PipelineEventBus.publish('stage_started', 'generating_thumbnail', 0, 'Extracting video thumbnail...');
        thumbnailUri = await ThumbnailGenerator.generateThumbnail(optimizedVideo);
        PipelineEventBus.publish('stage_completed', 'generating_thumbnail', 100);
      }

      // Step 6: Setup and execute Upload jobs
      PipelineEventBus.publish('stage_started', 'uploading', 0, 'Preparing uploads queue...');
      const jobs: UploadJob[] = [];
      // Setup image jobs
      optimizedImages.forEach((uri, idx) => {
        if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
          const ext = uri.split('.').pop() || 'jpg';
          jobs.push({
            bucket: 'property-images',
            path: `${propertyId}/image_${idx}_${Date.now()}.${ext}`,
            localUri: uri,
          });
        }
      });

      // Setup thumbnail job
      let thumbJobIndex = -1;
      if (thumbnailUri) {
        const ext = thumbnailUri.split('.').pop() || 'jpg';
        thumbJobIndex = jobs.length;
        jobs.push({
          bucket: 'property-thumbnails',
          path: `${propertyId}/thumb_${Date.now()}.${ext}`,
          localUri: thumbnailUri,
        });
      }

      // Setup video job
      let videoJobIndex = -1;
      if (optimizedVideo && !optimizedVideo.startsWith('http://') && !optimizedVideo.startsWith('https://')) {
        const ext = optimizedVideo.split('.').pop() || 'mp4';
        videoJobIndex = jobs.length;
        jobs.push({
          bucket: 'property-videos',
          path: `${propertyId}/video_${Date.now()}.${ext}`,
          localUri: optimizedVideo,
        });
      }

      // Execute upload queue
      const uploadedUrls = await this.queue.uploadAll(propertyId, jobs);
      PipelineEventBus.publish('stage_completed', 'uploading', 100);

      // Re-map uploaded public URLs
      const finalImageUrls: string[] = [];
      let finalThumbUrl = imageUrls[0] || '';
      let finalVideoUrl = videoUri || '';

      let jobIdx = 0;
      optimizedImages.forEach((uri) => {
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
          finalImageUrls.push(uri);
        } else {
          finalImageUrls.push(uploadedUrls[jobIdx++]);
        }
      });

      if (thumbJobIndex !== -1) {
        finalThumbUrl = uploadedUrls[thumbJobIndex];
      }

      if (videoJobIndex !== -1) {
        finalVideoUrl = uploadedUrls[videoJobIndex];
      }

      // Step 7: Finalize listing URLs and set status Active (published)
      PipelineEventBus.publish('stage_started', 'completed', 0, 'Publishing listing...');
      await propertyService.updateListingUrls(
        propertyId,
        finalImageUrls,
        finalVideoUrl,
        finalThumbUrl
      );
      
      // Update listing status from 'pending' to 'published' (Active)
      await propertyService.updateListingStatus(propertyId, 'published');
      PipelineEventBus.publish('stage_completed', 'completed', 100);

      return propertyId;
    } catch (error: any) {
      PipelineEventBus.publish('stage_failed', 'failed', 0, undefined, error.message || 'Pipeline failed');
      throw error;
    } finally {
      // Always cleanup temporary files at the end of execution
      await MediaProcessor.cleanupTempFiles();
    }
  }

  /**
   * Updates an existing listing.
   */
  async updateListing(
    propertyId: string,
    updates: Omit<PropertyListing, 'id' | 'createdAt'>,
    imageUrls: string[],
    videoUri?: string,
    videoAssetInfo?: any
  ): Promise<void> {
    // Media editing and synchronization
    // 1. Identify removed images and delete
    const previousListing = await propertyService.getListing(propertyId);
    if (!previousListing) throw new Error('Listing not found');

    const currentImages = previousListing.imageUrls || [];
    const removedImages = currentImages.filter((url) => !imageUrls.includes(url));
    const storage = new SupabaseStorageAdapter();

    for (const url of removedImages) {
      const parts = url.split('property-images/');
      if (parts.length > 1) {
        const path = decodeURIComponent(parts[1]);
        try {
          await storage.deleteFile('property-images', path);
        } catch (e) {
          console.warn('[UploadManager] Failed to delete removed image file:', path, e);
        }
      }
    }

    // 2. Identify new images and process/upload
    const processedImages = await ImageProcessor.processImages(imageUrls);
    const finalImages: string[] = [];

    for (let i = 0; i < processedImages.length; i++) {
      const uri = processedImages[i];
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        finalImages.push(uri);
      } else {
        const ext = uri.split('.').pop() || 'jpg';
        const path = `${propertyId}/image_edit_${i}_${Date.now()}.${ext}`;
        const url = await storage.uploadFile('property-images', path, uri);
        finalImages.push(url);
      }
    }

    // 3. Process video if replaced
    let finalVideoUrl = previousListing.videoUrl || '';
    let finalThumbUrl = previousListing.thumbnailUrl || '';

    if (videoUri && videoUri !== previousListing.videoUrl) {
      // Remove old video and thumb
      const oldVideoParts = finalVideoUrl.split('property-videos/');
      if (oldVideoParts.length > 1) {
        const path = decodeURIComponent(oldVideoParts[1]);
        try {
          await storage.deleteFile('property-videos', path);
        } catch {}
      }
      const oldThumbParts = finalThumbUrl.split('property-thumbnails/');
      if (oldThumbParts.length > 1) {
        const path = decodeURIComponent(oldThumbParts[1]);
        try {
          await storage.deleteFile('property-thumbnails', path);
        } catch {}
      }

      // Compress and upload new video
      const compressedVideo = await VideoProcessor.compressVideo(videoUri);
      const thumbnail = await ThumbnailGenerator.generateThumbnail(compressedVideo);

      const vExt = compressedVideo.split('.').pop() || 'mp4';
      const tExt = thumbnail.split('.').pop() || 'jpg';

      finalThumbUrl = await storage.uploadFile(
        'property-thumbnails',
        `${propertyId}/thumb_edit_${Date.now()}.${tExt}`,
        thumbnail
      );
      finalVideoUrl = await storage.uploadFile(
        'property-videos',
        `${propertyId}/video_edit_${Date.now()}.${vExt}`,
        compressedVideo
      );
    }

    // Clean up temporary files
    await MediaProcessor.cleanupTempFiles();

    // Save final details in database
    await propertyService.updateListing(
      propertyId,
      {
        ...updates,
        thumbnailUrl: finalThumbUrl,
      },
      finalImages,
      finalVideoUrl,
      finalThumbUrl
    );
  }
}
