import axios from 'axios'
import { QobuzTrack } from '../qobuz-dl'
import { SettingsProps } from '../settings-provider'
import { QUALITY_MAP } from '../constants'
import { createDownloadError } from './error-handling'

/**
 * Quality fallback management for download operations
 */

export interface QualityAttempt {
  quality: string
  displayName: string
  success: boolean
  error?: Error
}

export interface DownloadAttemptResult {
  audioBuffer: ArrayBuffer
  actualQuality: string
  attempts: QualityAttempt[]
  fallbackUsed: boolean
}

/**
 * Get the ordered list of qualities to try for fallback
 */
export const getQualityFallbackOrder = (requestedQuality: string): string[] => {
  const qualityOrder = ['27', '7', '6'] // Hi-Res, CD, MP3 quality order
  const startIndex = qualityOrder.indexOf(requestedQuality)
  
  if (startIndex === -1) {
    return qualityOrder
  }
  
  // Return qualities starting from requested and falling back to lower
  return qualityOrder.slice(startIndex)
}

/**
 * Attempts to download audio with quality fallback
 */
export const downloadWithQualityFallback = async (
  track: QobuzTrack,
  settings: SettingsProps,
  onProgress?: (progress: number) => void
): Promise<DownloadAttemptResult> => {
  const requestedQuality = settings.outputQuality
  const qualities = getQualityFallbackOrder(requestedQuality)
  const attempts: QualityAttempt[] = []
  
  for (let i = 0; i < qualities.length; i++) {
    const quality = qualities[i]
    const isLastAttempt = i === qualities.length - 1
    
    try {
      const displayName = `${QUALITY_MAP[quality as keyof typeof QUALITY_MAP][0]}-bit / ${QUALITY_MAP[quality as keyof typeof QUALITY_MAP][1]} kHz`
      
      const response = await axios.get('/api/download-music', {
        params: {
          track_id: track.id,
          quality: quality
        },
        responseType: 'arraybuffer',
        onDownloadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100
            onProgress(progress)
          }
        }
      })
      
      attempts.push({
        quality,
        displayName,
        success: true
      })
      
      return {
        audioBuffer: response.data,
        actualQuality: quality,
        attempts,
        fallbackUsed: quality !== requestedQuality
      }
      
    } catch (error: any) {
      const displayName = `${QUALITY_MAP[quality as keyof typeof QUALITY_MAP][0]}-bit / ${QUALITY_MAP[quality as keyof typeof QUALITY_MAP][1]} kHz`
      
      attempts.push({
        quality,
        displayName,
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      })
      
      if (isLastAttempt) {
        throw createDownloadError(
          `All quality options failed. Last error: ${error.message}`,
          'QUALITY_EXHAUSTED',
          error.status,
          false,
          'quality_unavailable'
        )
      }
      
      // Continue to next quality
    }
  }
  
  throw createDownloadError(
    'No qualities available to try',
    'NO_QUALITIES',
    undefined,
    false,
    'quality_unavailable'
  )
}

/**
 * Gets the file extension for a given quality
 */
export const getFileExtensionForQuality = (quality: string, outputCodec?: string): string => {
  // For raw downloads, use original format
  if (!outputCodec) {
    switch (quality) {
      case '27':
      case '7':
        return 'flac'
      case '6':
        return 'flac' // CD quality is also FLAC
      case '5':
        return 'mp3'
      default:
        return 'flac'
    }
  }
  
  // For processed downloads, use output codec
  return outputCodec.toLowerCase()
}

/**
 * Creates a human-readable quality description
 */
export const getQualityDescription = (quality: string): string => {
  try {
    const [bitDepth, sampleRate] = QUALITY_MAP[quality as keyof typeof QUALITY_MAP]
    return `${bitDepth}-bit / ${sampleRate} kHz`
  } catch {
    return quality
  }
}