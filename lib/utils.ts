import { formatArtists, formatDuration, formatTitle, type QobuzAlbum, type QobuzTrack } from './qobuz-dl'
import { twMerge } from 'tailwind-merge'
import { type ClassValue, clsx } from 'clsx'
import { APP_CONSTANTS, FILE_SIZE_UNITS } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const sizeInUnit = bytes / Math.pow(1024, i)

  const formattedSize = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: i >= 3 ? 2 : 0
  }).format(sizeInUnit)

  return `${formattedSize} ${FILE_SIZE_UNITS[i]}`
}

export const cleanFileName = (filename: string) => {
  let cleanedFilename = filename
  for (const char of APP_CONSTANTS.BANNED_FILENAME_CHARS) {
    cleanedFilename = cleanedFilename.replaceAll(char, APP_CONSTANTS.REPLACEMENT_CHAR)
  }
  return cleanedFilename
}

export function getTailwindBreakpoint(width: any) {
  if (width >= 1536) {
    return '2xl'
  } else if (width >= 1280) {
    return 'xl'
  } else if (width >= 1024) {
    return 'lg'
  } else if (width >= 768) {
    return 'md'
  } else if (width >= 640) {
    return 'sm'
  } else {
    return 'base' // Base size (less than 640px)
  }
}

export async function resizeImage(imageURL: string, maxSize: number, quality: number = 0.92): Promise<string | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const imgToResize = new Image()
    imgToResize.crossOrigin = 'anonymous'
    imgToResize.src = imageURL

    imgToResize.onerror = () => resolve(null)

    imgToResize.onload = () => {
      const { width, height } = imgToResize

      if (width <= maxSize && height <= maxSize) {
        resolve(imageURL)
        return
      }

      let targetWidth = width
      let targetHeight = height

      if (width > height) {
        targetWidth = maxSize
        targetHeight = (height / width) * maxSize
      } else {
        targetHeight = maxSize
        targetWidth = (width / height) * maxSize
      }

      canvas.width = targetWidth
      canvas.height = targetHeight

      context!.drawImage(imgToResize, 0, 0, targetWidth, targetHeight)

      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(dataUrl)
    }
  })
}

export function formatCustomTitle(titleSetting: string, result: QobuzAlbum | QobuzTrack): string {
  // Check if this is a track (has track_number) or album
  const isTrack = 'track_number' in result
  
  let formatted = titleSetting
    .replaceAll('{artists}', formatArtists(result))
    .replaceAll('{name}', formatTitle(result))
    .replaceAll('{year}', String(new Date(result.released_at * 1000).getFullYear()))
    .replaceAll('{duration}', String(formatDuration(result.duration)))
  
  // Add track-specific replacements
  if (isTrack) {
    const track = result as QobuzTrack
    formatted = formatted
      .replaceAll('{track_number}', String(track.track_number).padStart(2, '0'))
      .replaceAll('{explicit}', track.parental_warning ? ' [Explicit]' : '')
  } else {
    // For albums, remove track-specific placeholders
    formatted = formatted
      .replaceAll('{track_number}', '')
      .replaceAll('{explicit}', '')
  }
  
  return formatted
}

export function createFolderName(name: string): string {
  // Clean the name for use as a folder name
  const bannedChars = ['/', '\\', '?', ':', '*', '"', '<', '>', '|']
  let cleanName = name
  for (const char of bannedChars) {
    cleanName = cleanName.replaceAll(char, '_')
  }
  // Remove leading/trailing dots and spaces
  cleanName = cleanName.replace(/^[\s.]+|[\s.]+$/g, '').trim()
  
  // If the name is empty after cleaning, provide a fallback
  if (!cleanName || cleanName.length === 0) {
    cleanName = 'Unknown'
  }
  
  return cleanName
}

export function getArtistFolderName(result: QobuzAlbum | QobuzTrack): string {
  return createFolderName(formatArtists(result))
}

export function getAlbumFolderName(result: QobuzAlbum | QobuzTrack): string {
  const album = (result as QobuzTrack).album || (result as QobuzAlbum)
  return createFolderName(formatTitle(album))
}
