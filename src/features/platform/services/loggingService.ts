import { betaService } from '../../beta/services/betaService';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}


class LoggingService {
  private level: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;
  private appVersion = '1.0.0'; // Should be read from constants in real app

  setLogLevel(level: LogLevel) {
    this.level = level;
  }

  private formatMessage(level: string, message: string, context?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  debug(message: string, context?: Record<string, any>) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: Record<string, any>) {
    if (this.level <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: Record<string, any>) {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>) {
    if (this.level <= LogLevel.ERROR) {
      const errDetails = error instanceof Error ? ` | Error: ${error.message}\n${error.stack}` : ` | Error: ${String(error)}`;
      console.error(this.formatMessage('ERROR', message, context) + errDetails);
      
      // Future Integration Point: Sentry / Crashlytics
      // if (!__DEV__) Sentry.captureException(error, { extra: context });
      
      // Beta Diagnostics
      if (!__DEV__ || true) { // Always capture in beta/dev for now
        betaService.submitDiagnostic({
          type: 'crash',
          errorMessage: error instanceof Error ? error.message : String(error),
          stackTrace: error instanceof Error ? error.stack : undefined,
          metadata: context,
        });
      }
    }
  }
}

export const loggingService = new LoggingService();
