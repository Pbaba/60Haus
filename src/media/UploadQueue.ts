import { StorageAdapter } from './StorageAdapter';
import { PipelineEventBus } from './PipelineEventBus';

export interface UploadJob {
  bucket: string;
  path: string;
  localUri: string;
}

export class UploadQueue {
  private adapter: StorageAdapter;
  private maxRetries = 3;
  private baseDelay = 1500; // 1.5s exponential base

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  /**
   * Executes a retry operation with exponential backoff.
   */
  private async executeWithRetry<T>(taskName: string, fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        if (attempt >= this.maxRetries) {
          throw error;
        }
        const delay = this.baseDelay * Math.pow(2, attempt);
        console.warn(`[UploadQueue] Task "${taskName}" failed (attempt ${attempt}/${this.maxRetries}). Retrying in ${delay}ms...`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error(`Task "${taskName}" failed after ${this.maxRetries} attempts.`);
  }

  /**
   * Uploads all assets sequentially or in batch while reporting overall stage progress.
   */
  async uploadAll(propertyId: string, jobs: UploadJob[]): Promise<string[]> {
    const uploadedUrls: string[] = [];
    const totalJobs = jobs.length;
    
    // Track progressive weights: each job takes an equal fraction of the uploading stage weight
    const jobProgressions = new Array(totalJobs).fill(0);

    for (let i = 0; i < totalJobs; i++) {
      const job = jobs[i];
      
      const uploadTask = async () => {
        return await this.adapter.uploadFile(
          job.bucket,
          job.path,
          job.localUri,
          (progress) => {
            jobProgressions[i] = progress;
            // Calculate overall local stage progress (average of all job progresses)
            const sum = jobProgressions.reduce((acc, curr) => acc + curr, 0);
            const stagePct = Math.round(sum / totalJobs);
            PipelineEventBus.publish('stage_progress', 'uploading', stagePct, `Uploading item ${i + 1} of ${totalJobs}...`);
          }
        );
      };

      const publicUrl = await this.executeWithRetry(
        `Upload ${job.path} to bucket ${job.bucket}`,
        uploadTask
      );

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  }
}
