import { QobuzAlbum, QobuzTrack, FetchedQobuzAlbum } from '../qobuz-dl'
import { SettingsProps } from '../settings-provider'
import { APP_CONSTANTS, RETRY_REASONS } from '../constants'
import type { RetryQueueProps, RetryReason } from '../status-bar/context'

/**
 * Centralized error handling for download operations
 */

export interface DownloadError extends Error {
  code?: string
  status?: number
  retryable?: boolean
  reason?: RetryReason
}

export class DownloadOperationError extends Error implements DownloadError {
  public readonly code?: string
  public readonly status?: number
  public readonly retryable: boolean
  public readonly reason?: RetryReason

  constructor(
    message: string,
    options: {
      code?: string
      status?: number
      retryable?: boolean
      reason?: RetryReason
      cause?: Error
    } = {}
  ) {
    super(message)
    this.name = 'DownloadOperationError'
    this.code = options.code
    this.status = options.status
    this.retryable = options.retryable ?? false
    this.reason = options.reason
    
    if (options.cause) {
      this.cause = options.cause
    }
  }
}

export const createDownloadError = (
  message: string,
  code?: string,
  status?: number,
  retryable: boolean = false,
  reason?: RetryReason
): DownloadOperationError => {
  return new DownloadOperationError(message, { code, status, retryable, reason })
}

/**
 * Determines if an error is retryable based on its characteristics
 */
export const isRetryableError = (error: Error | DownloadError): boolean => {
  if ('retryable' in error) {
    return error.retryable ?? false
  }

  // Network errors are generally retryable
  if (error.message.includes('network') || error.message.includes('timeout')) {
    return true
  }

  // Rate limiting errors are retryable
  if ('status' in error && error.status === 429) {
    return true
  }

  // Server errors (5xx) are retryable
  if ('status' in error && error.status && error.status >= 500) {
    return true
  }

  return false
}

/**
 * Gets the appropriate retry reason for an error
 */
export const getRetryReason = (error: Error | DownloadError): RetryReason => {
  if ('reason' in error && error.reason) {
    return error.reason
  }

  if ('status' in error) {
    switch (error.status) {
      case 429:
        return RETRY_REASONS.NETWORK_ERROR // Rate limiting falls under network issues
      case 404:
        return RETRY_REASONS.QUALITY_UNAVAILABLE // Not found typically means quality unavailable  
      case 403:
        return RETRY_REASONS.NETWORK_ERROR // Forbidden falls under network/auth issues
      default:
        if (error.status && error.status >= 500) {
          return RETRY_REASONS.NETWORK_ERROR // Server errors are network related
        }
    }
  }

  if (error.message.includes('network') || error.message.includes('timeout')) {
    return RETRY_REASONS.NETWORK_ERROR
  }

  return RETRY_REASONS.UNKNOWN_ERROR
}

/**
 * Handles retryable errors by adding them to the retry queue
 */
export const handleRetryableError = (
  result: QobuzAlbum | QobuzTrack,
  settings: SettingsProps,
  fetchedAlbumData: FetchedQobuzAlbum | null | undefined,
  retryQueue: RetryQueueProps | undefined,
  error: Error | DownloadError,
  autoRetry: boolean = true
) => {
  if (!retryQueue) return

  const reason = getRetryReason(error)
  const errorMessage = error.message

  retryQueue.addItem({
    result,
    settings,
    fetchedAlbumData,
    reason,
    maxAttempts: autoRetry ? APP_CONSTANTS.MAX_AUTO_RETRIES : APP_CONSTANTS.MANUAL_RETRY_ATTEMPTS,
    lastError: errorMessage,
    autoRetry
  })
}

/**
 * Wraps async operations with standardized error handling
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: {
    operation: string
    retryable?: boolean
    reason?: RetryReason
  }
): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    const downloadError = new DownloadOperationError(
      `Failed to ${context.operation}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        retryable: context.retryable,
        reason: context.reason,
        cause: error instanceof Error ? error : undefined
      }
    )
    
    throw downloadError
  }
}