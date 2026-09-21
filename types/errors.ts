export type AppErrorCode =
  | 'gps_disabled'
  | 'permission_denied'
  | 'background_permission_denied'
  | 'network_unavailable'
  | 'backend_unavailable'
  | 'backend_unconfigured'
  | 'google_api_error'
  | 'oauth_expired'
  | 'rate_limited'
  | 'malformed_response'
  | 'sqlite_error'
  | 'validation_error'
  | 'unknown';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly causeError?: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.causeError = cause;
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
