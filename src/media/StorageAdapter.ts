import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

export interface StorageAdapter {
  uploadFile(
    bucketName: string,
    path: string,
    localUri: string,
    onProgress?: (progress: number) => void
  ): Promise<string>;
  deleteFile(bucketName: string, path: string): Promise<void>;
  getPublicUrl(bucketName: string, path: string): string;
}

export class SupabaseStorageAdapter implements StorageAdapter {
  async uploadFile(
    bucketName: string,
    path: string,
    localUri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (onProgress) onProgress(10);
    
    // Read file as Base64 and decode to ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    if (onProgress) onProgress(40);
    const arrayBuffer = decode(base64);
    
    if (onProgress) onProgress(60);

    const fileExt = path.split('.').pop()?.toLowerCase() || '';
    let contentType = 'application/octet-stream';
    if (fileExt === 'jpg' || fileExt === 'jpeg') {
      contentType = 'image/jpeg';
    } else if (fileExt === 'png') {
      contentType = 'image/png';
    } else if (fileExt === 'mp4') {
      contentType = 'video/mp4';
    } else if (fileExt === 'mov') {
      contentType = 'video/quicktime';
    }

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(path, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error) throw error;
    if (onProgress) onProgress(100);

    return this.getPublicUrl(bucketName, path);
  }

  async deleteFile(bucketName: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucketName).remove([path]);
    if (error) throw error;
  }

  getPublicUrl(bucketName: string, path: string): string {
    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  }
}
