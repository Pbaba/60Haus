import { supabase } from '../../../lib/supabase';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export interface BetaFeedbackPayload {
  userId?: string;
  type: 'bug' | 'feature' | 'usability' | 'general';
  description: string;
  screenName?: string;
}

export interface BetaDiagnosticPayload {
  userId?: string;
  type: 'crash' | 'failed_request' | 'slow_api' | 'network_failure' | 'exception';
  errorMessage?: string;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

class BetaService {
  private getDeviceInfo() {
    return {
      app_version: Constants.expoConfig?.version || '1.0.0',
      device_model: Device.modelName || 'Unknown Device',
      os_version: `${Device.osName} ${Device.osVersion}` || 'Unknown OS',
    };
  }

  async submitFeedback(payload: BetaFeedbackPayload) {
    try {
      const { error } = await supabase.from('beta_feedback').insert([{
        user_id: payload.userId,
        type: payload.type,
        description: payload.description,
        screen_name: payload.screenName,
        ...this.getDeviceInfo()
      }]);

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Failed to submit beta feedback', err);
      return false;
    }
  }

  async submitDiagnostic(payload: BetaDiagnosticPayload) {
    try {
      const { error } = await supabase.from('beta_diagnostics').insert([{
        user_id: payload.userId,
        type: payload.type,
        error_message: payload.errorMessage,
        stack_trace: payload.stackTrace,
        metadata: payload.metadata,
        ...this.getDeviceInfo()
      }]);

      if (error) throw error;
      return true;
    } catch (err) {
      // Don't re-throw to avoid infinite loops if error reporting fails
      console.warn('Failed to submit beta diagnostic', err);
      return false;
    }
  }

  async fetchFeatureFlags() {
    try {
      const { data, error } = await supabase.from('feature_flags').select('*');
      if (error) throw error;
      
      const flags: Record<string, any> = {};
      data?.forEach((flag: any) => {
        flags[flag.key] = flag.value;
      });
      return flags;
    } catch (err) {
      console.warn('Failed to fetch feature flags', err);
      return {};
    }
  }
}

export const betaService = new BetaService();
