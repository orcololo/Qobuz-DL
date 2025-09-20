// Common constants used throughout the application
export const APP_CONSTANTS = {
  // File restrictions
  MAX_FILE_SIZE: 300000, // 5 minutes in milliseconds
  UPLOAD_TIMEOUT: 300000,
  
  // Audio settings
  DEFAULT_BITRATE: 320,
  MIN_BITRATE: 24,
  MAX_BITRATE: 320,
  
  // Retry settings
  MAX_AUTO_RETRIES: 3,
  MANUAL_RETRY_ATTEMPTS: 1,
  
  // Job processing
  DEFAULT_MAX_CONCURRENT_JOBS: 3,
  MIN_CONCURRENT_JOBS: 1,
  MAX_CONCURRENT_JOBS: 10,
  
  // File naming
  BANNED_FILENAME_CHARS: ['/', '\\', '?', ':', '*', '"', '<', '>', '|'],
  REPLACEMENT_CHAR: '_',
  
  // UI settings
  LOGO_ANIMATION_DELAY: 100,
  LOGO_ANIMATION_DURATION: 0.5,
  
  // Download progress logging
  PROGRESS_LOG_INTERVAL: 450
} as const

// Quality mappings for audio formats
export const QUALITY_MAP = {
  '27': [24, 192],
  '7': [24, 96],
  '6': [16, 44.1],
  '5': [16, 44.1]
} as const

// Lossless codec types
export const LOSSLESS_CODECS = ['FLAC', 'ALAC', 'WAV'] as const

// Settings form specific constants
export const SETTINGS_CONSTANTS = {
  MIN_ALBUM_ART_SIZE: 100,
  MAX_ALBUM_ART_SIZE: 3600,
  MIN_ALBUM_ART_QUALITY: 0.1,
  MAX_ALBUM_ART_QUALITY: 1.0,
  DEFAULT_ALBUM_ART_SIZE: 3600,
  DEFAULT_ALBUM_ART_QUALITY: 1.0
} as const

// File size units for formatting
export const FILE_SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'] as const

// Environment validation messages
export const ENV_ERROR_MESSAGES = {
  QOBUZ_APP_ID: 'Deployment is missing QOBUZ_APP_ID environment variable.',
  QOBUZ_AUTH_TOKENS: 'Deployment is missing QOBUZ_AUTH_TOKENS environment variable.',
  QOBUZ_SECRET: 'Deployment is missing QOBUZ_SECRET environment variable.',
  QOBUZ_API_BASE: 'Deployment is missing QOBUZ_API_BASE environment variable.'
} as const

// Retry reason types
export const RETRY_REASONS = {
  SHORTER_THAN_EXPECTED: 'shorter_than_expected',
  NETWORK_ERROR: 'network_error',
  QUALITY_UNAVAILABLE: 'quality_unavailable',
  PROCESSING_ERROR: 'processing_error',
  UNKNOWN_ERROR: 'unknown_error'
} as const

// Common HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const