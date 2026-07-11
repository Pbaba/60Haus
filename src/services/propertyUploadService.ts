import { supabase } from '../lib/supabase';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export interface VideoAsset {
  uri: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
}

export interface UploadedFile {
  bucket: string;
  path: string;
  publicUrl: string;
}

const generateUuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const propertyUploadService = {
  // Validate video parameters before upload begins
  validateVideo(asset: VideoAsset) {
    const fileExt = asset.uri.split('.').pop()?.toLowerCase() || '';
    if (fileExt !== 'mp4' && fileExt !== 'mov') {
      throw new Error('Unsupported format. Only MP4 and MOV walkthrough videos are allowed.');
    }
    if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) {
      throw new Error('Walkthrough video file size exceeds the 100MB threshold.');
    }
    if (asset.duration && asset.duration > 90) {
      throw new Error('Walkthrough video duration exceeds the 90 seconds limit.');
    }
    if (asset.width && asset.height && asset.width > asset.height) {
      throw new Error('Walkthrough video must be in portrait orientation (vertical view).');
    }
  },

  // Image manipulation: Only compress and resize if width exceeds 1080px
  async compressImages(uris: string[]): Promise<string[]> {
    const compressedUris: string[] = [];
    for (const uri of uris) {
      // Skip already uploaded web URLs
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        compressedUris.push(uri);
        continue;
      }
      try {
        const manipResult = await ImageManipulator.manipulateAsync(uri, []);
        if (manipResult.width > 1080) {
          const compressed = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1080 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          compressedUris.push(compressed.uri);
        } else {
          compressedUris.push(uri);
        }
      } catch (e) {
        console.warn('Compression check failed for:', uri, e);
        compressedUris.push(uri);
      }
    }
    return compressedUris;
  },

  // Upload optimized image assets
  async uploadImages(
    propertyId: string,
    uris: string[],
    onProgress?: (progress: number) => void
  ): Promise<UploadedFile[]> {
    const uploadedFiles: UploadedFile[] = [];
    
    for (let i = 0; i < uris.length; i++) {
      const uri = uris[i];
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        uploadedFiles.push({
          bucket: 'property-images',
          path: '',
          publicUrl: uri,
        });
        continue;
      }

      if (onProgress) {
        onProgress(Math.floor(((i + 0.1) / uris.length) * 100));
      }

      const fileExt = uri.split('.').pop() || 'jpg';
      const fileUuid = generateUuid();
      const filePath = `${propertyId}/${fileUuid}.${fileExt}`;

      // Read file as Base64 and decode to ArrayBuffer for React Native compatibility
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(base64);

      const { error } = await supabase.storage
        .from('property-images')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      uploadedFiles.push({
        bucket: 'property-images',
        path: filePath,
        publicUrl,
      });

      if (onProgress) {
        onProgress(Math.floor(((i + 1) / uris.length) * 100));
      }
    }
    
    return uploadedFiles;
  },

  // Upload walkthrough video
  async uploadVideo(
    propertyId: string,
    uri: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadedFile> {
    const fileExt = uri.split('.').pop() || 'mp4';
    const fileUuid = generateUuid();
    const filePath = `${propertyId}/${fileUuid}.${fileExt}`;

    if (onProgress) onProgress(15);

    // Read file as Base64 and decode to ArrayBuffer for React Native compatibility
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);

    if (onProgress) onProgress(45);

    const { error } = await supabase.storage
      .from('property-videos')
      .upload(filePath, arrayBuffer, {
        contentType: `video/${fileExt === 'mov' ? 'quicktime' : 'mp4'}`,
        upsert: false,
      });

    if (error) throw error;

    if (onProgress) onProgress(90);

    const { data: { publicUrl } } = supabase.storage
      .from('property-videos')
      .getPublicUrl(filePath);

    if (onProgress) onProgress(100);

    return {
      bucket: 'property-videos',
      path: filePath,
      publicUrl,
    };
  },

  // Extract thumbnail and upload it to Supabase
  async uploadThumbnail(propertyId: string, videoUri: string): Promise<UploadedFile> {
    let localThumbUri = '';
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000,
      });
      localThumbUri = uri;
    } catch (e) {
      console.warn('Thumbnail extraction failed, using original video instead:', e);
      throw new Error('Failed to auto-generate video thumbnail.');
    }

    const fileExt = localThumbUri.split('.').pop() || 'jpg';
    const fileUuid = generateUuid();
    const filePath = `${propertyId}/${fileUuid}.${fileExt}`;

    // Read file as Base64 and decode to ArrayBuffer for React Native compatibility
    const base64 = await FileSystem.readAsStringAsync(localThumbUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);

    const { error } = await supabase.storage
      .from('property-thumbnails')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('property-thumbnails')
      .getPublicUrl(filePath);

    return {
      bucket: 'property-thumbnails',
      path: filePath,
      publicUrl,
    };
  },

  // Synchronize listing media: upload new, delete removed, and returns updated URLs
  async syncMedia(
    propertyId: string,
    currentImages: string[],
    nextImages: string[],
    currentVideo?: string,
    nextVideo?: string,
    onProgress?: (progress: number) => void
  ): Promise<{ imageUrls: string[]; videoUrl: string; thumbnailUrl: string }> {
    // 1. Identify removed images and delete from Storage
    const removedImages = currentImages.filter((url) => !nextImages.includes(url));
    for (const url of removedImages) {
      const pathParts = url.split('property-images/');
      if (pathParts.length > 1) {
        const filePath = decodeURIComponent(pathParts[1]);
        try {
          await supabase.storage.from('property-images').remove([filePath]);
        } catch (e) {
          console.warn('Failed to delete image file during sync:', filePath, e);
        }
      }
    }

    // 2. Classify and upload new local images
    const finalImageUrls: string[] = [];
    const localImagesToUpload: string[] = [];

    for (const img of nextImages) {
      if (img.startsWith('file://') || img.startsWith('content://')) {
        localImagesToUpload.push(img);
      } else {
        finalImageUrls.push(img);
      }
    }

    if (localImagesToUpload.length > 0) {
      const compressed = await this.compressImages(localImagesToUpload);
      const uploaded = await this.uploadImages(propertyId, compressed, onProgress);
      finalImageUrls.push(...uploaded.map((f) => f.publicUrl));
    }

    // 3. Handle video & thumbnail differences
    let finalVideoUrl = currentVideo || '';
    let finalThumbnailUrl = '';

    // Retrieve previous thumbnail URL
    const { data: propData } = await supabase
      .from('properties')
      .select('thumbnail_url')
      .eq('id', propertyId)
      .single();
    finalThumbnailUrl = propData?.thumbnail_url || '';

    const isVideoChanged = nextVideo !== currentVideo;
    if (isVideoChanged) {
      // Delete old video file from storage
      if (currentVideo) {
        const videoParts = currentVideo.split('property-videos/');
        if (videoParts.length > 1) {
          const videoPath = decodeURIComponent(videoParts[1]);
          try {
            await supabase.storage.from('property-videos').remove([videoPath]);
          } catch (e) {
            console.warn('Failed to delete old video during sync:', videoPath, e);
          }
        }
        // Delete old video thumbnail from storage
        if (finalThumbnailUrl && finalThumbnailUrl.includes('property-thumbnails/')) {
          const thumbParts = finalThumbnailUrl.split('property-thumbnails/');
          if (thumbParts.length > 1) {
            const thumbPath = decodeURIComponent(thumbParts[1]);
            try {
              await supabase.storage.from('property-thumbnails').remove([thumbPath]);
            } catch (e) {
              console.warn('Failed to delete old thumbnail during sync:', thumbPath, e);
            }
          }
        }
      }

      // Upload new video & generate thumbnail
      if (nextVideo && (nextVideo.startsWith('file://') || nextVideo.startsWith('content://'))) {
        try {
          const thumbFile = await this.uploadThumbnail(propertyId, nextVideo);
          finalThumbnailUrl = thumbFile.publicUrl;
        } catch (thumbErr) {
          console.warn('Failed to create new thumbnail:', thumbErr);
        }

        const videoFile = await this.uploadVideo(propertyId, nextVideo);
        finalVideoUrl = videoFile.publicUrl;
      } else {
        finalVideoUrl = nextVideo || '';
      }
    }

    return {
      imageUrls: finalImageUrls,
      videoUrl: finalVideoUrl,
      thumbnailUrl: finalThumbnailUrl || finalImageUrls[0] || '',
    };
  },

  // Delete all storage assets matching URLs
  async deletePropertyMedia(
    imageUrls: string[],
    videoUrl?: string,
    thumbnailUrl?: string
  ): Promise<void> {
    const filesToDelete: { bucket: string; path: string }[] = [];

    for (const url of imageUrls) {
      const parts = url.split('property-images/');
      if (parts.length > 1) {
        filesToDelete.push({ bucket: 'property-images', path: decodeURIComponent(parts[1]) });
      }
    }

    if (videoUrl) {
      const parts = videoUrl.split('property-videos/');
      if (parts.length > 1) {
        filesToDelete.push({ bucket: 'property-videos', path: decodeURIComponent(parts[1]) });
      }
    }

    if (thumbnailUrl && thumbnailUrl.includes('property-thumbnails/')) {
      const parts = thumbnailUrl.split('property-thumbnails/');
      if (parts.length > 1) {
        filesToDelete.push({ bucket: 'property-thumbnails', path: decodeURIComponent(parts[1]) });
      }
    }

    if (filesToDelete.length > 0) {
      await this.cleanupUploads(filesToDelete);
    }
  },

  // Delete already uploaded files during rollback
  async cleanupUploads(uploadedFiles: { bucket: string; path: string }[]): Promise<void> {
    for (const file of uploadedFiles) {
      if (!file.path) continue;
      try {
        await supabase.storage
          .from(file.bucket)
          .remove([file.path]);
      } catch (e) {
        console.warn(`Cleanup failed for file: ${file.bucket}/${file.path}`, e);
      }
    }
  },

  // Upload user avatar image to Supabase Storage
  async uploadAvatar(userId: string, uri: string): Promise<string> {
    if (!uri) return '';
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }

    const fileExt = uri.split('.').pop() || 'jpg';
    const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`;

    // Read file as Base64 and decode to ArrayBuffer for React Native compatibility
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);

    const { error } = await supabase.storage
      .from('property-images')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: true,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('property-images')
      .getPublicUrl(filePath);

    return publicUrl;
  },
};
