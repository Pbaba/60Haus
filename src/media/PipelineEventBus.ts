import { ProcessingStage, PipelineProgress, STAGE_WEIGHTS } from './MediaTypes';

export type PipelineEventType =
  | 'stage_started'
  | 'stage_progress'
  | 'stage_completed'
  | 'stage_failed'
  | 'reset';

export interface PipelineEvent {
  type: PipelineEventType;
  stage: ProcessingStage;
  progress: number; // local stage progress 0-100
  details?: string;
  error?: string;
}

export type PipelineListener = (event: PipelineEvent, overallProgress: PipelineProgress) => void;

class PipelineEventBusClass {
  private listeners: Set<PipelineListener> = new Set();
  
  private currentProgress: PipelineProgress = {
    stage: 'idle',
    progress: 0,
    completedStages: [],
  };

  subscribe(listener: PipelineListener): () => void {
    this.listeners.add(listener);
    // Return unsubscribe callback
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset() {
    this.currentProgress = {
      stage: 'idle',
      progress: 0,
      completedStages: [],
    };
    this.emit({ type: 'reset', stage: 'idle', progress: 0 });
  }

  publish(type: PipelineEventType, stage: ProcessingStage, localProgress: number = 0, details?: string, error?: string) {
    // 1. Update current progress state
    this.currentProgress.stage = stage;
    this.currentProgress.details = details;

    if (type === 'stage_completed') {
      if (!this.currentProgress.completedStages.includes(stage)) {
        this.currentProgress.completedStages.push(stage);
      }
    } else if (type === 'stage_failed') {
      this.currentProgress.stage = 'failed';
    }

    // 2. Compute weighted overall progress
    // Overall progress is the sum of weights of completed stages plus the weighted fraction of the active stage
    let overallPct = 0;
    const stagesList: ProcessingStage[] = [
      'validating',
      'creating_listing',
      'processing_images',
      'compressing_video',
      'generating_thumbnail',
      'uploading',
      'completed'
    ];

    for (const s of stagesList) {
      const weight = STAGE_WEIGHTS[s];
      if (this.currentProgress.completedStages.includes(s)) {
        overallPct += weight;
      } else if (this.currentProgress.stage === s) {
        overallPct += Math.round(weight * (localProgress / 100));
      }
    }

    this.currentProgress.progress = Math.min(100, Math.max(0, overallPct));

    // 3. Dispatch to listeners
    const event: PipelineEvent = { type, stage, progress: localProgress, details, error };
    this.emit(event);
  }

  private emit(event: PipelineEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, { ...this.currentProgress });
      } catch (e) {
        console.error('[PipelineEventBus] Listener error:', e);
      }
    });
  }

  getCurrentProgress(): PipelineProgress {
    return { ...this.currentProgress };
  }
}

export const PipelineEventBus = new PipelineEventBusClass();
