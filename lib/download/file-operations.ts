import { SettingsProps } from '../settings-provider'
import { QobuzTrack } from '../qobuz-dl'
import { APP_CONSTANTS } from '../constants'

/**
 * File handling utilities for downloads
 */

export interface FileMetadata {
  title: string
  artist: string
  album: string
  albumArtist: string
  trackNumber: number
  discNumber: number
  year?: number
  genre?: string
  composer?: string
  performer?: string
  isrc?: string
  copyright?: string
}

/**
 * Sanitize filename for safe file system usage
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove or replace invalid characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars with underscore
    .replace(/\.\./g, '_') // Replace double dots
    .replace(/^\./, '_') // Replace leading dot
    .replace(/\.$/, '_') // Replace trailing dot
    .trim()
    .substring(0, 255) // Limit length
}

/**
 * Format custom title based on settings template
 */
export const formatCustomTitle = (template: string, track: QobuzTrack): string => {
  const replacements = {
    '{artist}': track.album?.artist?.name || track.performer?.name || 'Unknown Artist',
    '{title}': track.title || 'Unknown Title',
    '{album}': track.album?.title || 'Unknown Album',
    '{track}': track.track_number?.toString().padStart(2, '0') || '00',
    '{disc}': track.media_number?.toString() || '1',
    '{year}': track.album?.released_at ? new Date(track.album.released_at * 1000).getFullYear().toString() : '',
    '{genre}': track.album?.genre?.name || '',
    '{version}': track.version || ''
  }

  let formatted = template
  for (const [placeholder, value] of Object.entries(replacements)) {
    formatted = formatted.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value)
  }

  return sanitizeFilename(formatted)
}

/**
 * Generate unique filename to avoid conflicts
 */
export const generateUniqueFilename = (baseName: string, extension: string, existingFiles: Set<string>): string => {
  let filename = `${baseName}.${extension}`
  let counter = 1
  
  while (existingFiles.has(filename)) {
    filename = `${baseName} (${counter}).${extension}`
    counter++
  }
  
  return filename
}

/**
 * Extract metadata from track for file tagging
 */
export const extractFileMetadata = (track: QobuzTrack): FileMetadata => {
  return {
    title: track.title,
    artist: track.performer?.name || 'Unknown Artist',
    album: track.album?.title || 'Unknown Album',
    albumArtist: track.album?.artist?.name || track.performer?.name || 'Unknown Artist',
    trackNumber: track.track_number || 1,
    discNumber: track.media_number || 1,
    year: track.album?.released_at ? new Date(track.album.released_at * 1000).getFullYear() : undefined,
    genre: track.album?.genre?.name,
    composer: track.composer?.name,
    performer: track.performer?.name,
    isrc: track.isrc || undefined,
    copyright: track.copyright
  }
}

/**
 * Get file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Validate file size against limits
 */
export const validateFileSize = (sizeBytes: number, settings: SettingsProps): { valid: boolean; message?: string } => {
  const maxSize = APP_CONSTANTS.MAX_FILE_SIZE // This is in bytes
  
  if (sizeBytes > maxSize) {
    return {
      valid: false,
      message: `File size ${formatFileSize(sizeBytes)} exceeds maximum allowed size of ${formatFileSize(maxSize)}`
    }
  }
  
  return { valid: true }
}

/**
 * Create directory structure for organized downloads
 */
export const createDirectoryStructure = (track: QobuzTrack, settings: SettingsProps): string[] => {
  const paths: string[] = []
  
  const artist = sanitizeFilename(track.album?.artist?.name || track.performer?.name || 'Unknown Artist')
  const album = sanitizeFilename(track.album?.title || 'Unknown Album')
  
  // Base artist directory
  paths.push(artist)
  
  // Album subdirectory (always create for organization)
  paths.push(`${artist}/${album}`)
  
  return paths
}

/**
 * Get the appropriate file extension for codec
 */
export const getFileExtension = (codec: string): string => {
  const codecMap: Record<string, string> = {
    'flac': 'flac',
    'mp3': 'mp3',
    'wav': 'wav',
    'aac': 'm4a',
    'ogg': 'ogg',
    'opus': 'opus'
  }
  
  return codecMap[codec.toLowerCase()] || 'bin'
}

/**
 * Validate filename length and characters
 */
export const validateFilename = (filename: string): { valid: boolean; message?: string } => {
  if (filename.length === 0) {
    return { valid: false, message: 'Filename cannot be empty' }
  }
  
  if (filename.length > 255) {
    return { valid: false, message: 'Filename too long (max 255 characters)' }
  }
  
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(filename)) {
    return { valid: false, message: 'Filename contains invalid characters' }
  }
  
  return { valid: true }
}