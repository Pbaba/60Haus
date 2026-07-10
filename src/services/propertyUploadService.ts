import { supabase } from '../lib/supabase';
import * as VideoThumbnails from 'expo-video-thumbnails';

export interface VideoAsset {
  uri: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
}

export const propertyUploadService = {
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

  async generateThumbnail(videoUri: string): Promise<string> {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000, // extract frame at 1 second mark
      });
      return uri;
    } catch (e) {
      console.warn('Failed to extract thumbnail from video frame:', e);
      throw new Error('Failed to auto-generate video thumbnail.');
    }
  },

  async uploadPhoto(
    uri: string,
    bucket: 'avatars' | 'property-images' | 'property-thumbnails',
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      if (onProgress) {
        onProgress(10);
        setTimeout(() => onProgress(45), 150);
        setTimeout(() => onProgress(80), 300);
      }

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (error) throw error;

      if (onProgress) {
        onProgress(100);
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (e: any) {
      console.error('Photo upload failed:', e);
      throw new Error(e.message || 'Image upload failed.');
    }
  },

  async uploadVideo(
    uri: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = uri.split('.').pop() || 'mp4';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      if (onProgress) {
        onProgress(10);
        setTimeout(() => onProgress(40), 200);
        setTimeout(() => onProgress(70), 400);
      }

      const { error } = await supabase.storage
        .from('property-videos')
        .upload(filePath, blob, {
          contentType: `video/${fileExt === 'mov' ? 'quicktime' : 'mp4'}`,
          upsert: true,
        });

      if (error) throw error;

      if (onProgress) {
        onProgress(100);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('property-videos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (e: any) {
      console.error('Video upload failed:', e);
      throw new Error(e.message || 'Video upload failed.');
    }
  },
};
