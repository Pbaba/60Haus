export interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
}

export type ProcessingStage =
  | 'idle'
  | 'validating'
  | 'creating_listing'
  | 'processing_images'
  | 'compressing_video'
  | 'generating_thumbnail'
  | 'uploading'
  | 'completed'
  | 'failed';

export interface PipelineProgress {
  stage: ProcessingStage;
  progress: number; // 0 to 100
  details?: string;
  completedStages: ProcessingStage[];
}

// Weighted progress increments for each stage to compile realistic overall progress
export const STAGE_WEIGHTS: Record<ProcessingStage, number> = {
  idle: 0,
  validating: 5,
  creating_listing: 10,
  processing_images: 20,
  compressing_video: 25,
  generating_thumbnail: 10,
  uploading: 20,
  completed: 10,
  failed: 0,
};
