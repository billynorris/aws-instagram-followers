// packages/common/src/types/errors.ts
export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export class InstagramAPIError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'INSTAGRAM_API_ERROR', 500, details);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

export class RateLimitError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', 429, details);
  }
}

export class CacheError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CACHE_ERROR', 500, details);
  }
}

export class ConfigurationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
  }
}

// Helper function to determine if an error is one of our application errors
export const isApplicationError = (error: unknown): error is ApplicationError => {
  return error instanceof ApplicationError;
};

// Helper function to convert unknown errors to ApplicationError
export const normalizeError = (error: unknown): ApplicationError => {
  if (isApplicationError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ApplicationError(error.message, 'UNKNOWN_ERROR', 500, { originalError: error.name });
  }

  return new ApplicationError('An unknown error occurred', 'UNKNOWN_ERROR', 500, {
    originalError: error,
  });
};

// Type guard for checking error types
export const isErrorType = <T extends ApplicationError>(
  error: unknown,
  ErrorClass: new (...args: any[]) => T
): error is T => {
  return error instanceof ErrorClass;
};
