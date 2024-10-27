// import middy from '@middy/core';

interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

class Logger {
  private context: LogContext = {};

  addContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  private formatLog(level: string, message: string, context?: LogContext, error?: any) {
    return {
      level,
      timestamp: new Date().toISOString(),
      message,
      ...this.context,
      ...(context || {}),
      ...(error && {
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      }),
    };
  }

  debug(message: string, context?: LogContext): void {
    console.debug(JSON.stringify(this.formatLog('DEBUG', message, context)));
  }

  info(message: string, context?: LogContext): void {
    console.info(JSON.stringify(this.formatLog('INFO', message, context)));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(JSON.stringify(this.formatLog('WARN', message, context)));
  }

  error(message: string, error?: any, context?: LogContext): void {
    console.error(JSON.stringify(this.formatLog('ERROR', message, context, error)));
  }
}

export const logger = new Logger();
