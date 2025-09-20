import axios from 'axios'
import { SettingsProps } from '../settings-provider'
import { QobuzTrack, FetchedQobuzAlbum } from '../qobuz-dl'
import { downloadWithQualityFallback } from './quality-fallback'
import { downloadProgressTracker, DownloadProgressTracker } from './progress-tracker'
import { handleRetryableError, createDownloadError } from './error-handling'
import { formatCustomTitle, getFileExtension, validateFileSize, extractFileMetadata } from './file-operations'
import { makeApiRequest } from '../api-utils'
import { APP_CONSTANTS } from '../constants'

/**
 * Main download job orchestrator
 */

export interface DownloadJobOptions {
  track: QobuzTrack
  settings: SettingsProps
  album?: FetchedQobuzAlbum
  progressTracker?: DownloadProgressTracker
  onProgress?: (progress: number) => void
  onComplete?: (result: DownloadResult) => void
  onError?: (error: Error) => void
}

export interface DownloadResult {
  success: boolean
  filename: string
  actualQuality?: string
  fallbackUsed?: boolean
  fileSize?: number
  processingTime?: number
  error?: Error
}

/**
 * Downloads a single track with full error handling and progress tracking
 */
export const downloadTrack = async (options: DownloadJobOptions): Promise<DownloadResult> => {
  const { track, settings, album, progressTracker, onProgress, onComplete, onError } = options
  const startTime = Date.now()
  
  try {
    // Update progress tracker
    if (progressTracker && album) {
      progressTracker.updateTrackProgress(album.id, track.id, 0, 'downloading')
    }
    
    // Download audio with quality fallback
    const downloadResult = await downloadWithQualityFallback(
      track,
      settings,
      (progress) => {
        if (progressTracker && album) {
          progressTracker.updateTrackProgress(album.id, track.id, progress * 0.8, 'downloading')
        }
        onProgress?.(progress * 0.8)
      }
    )
    
    // Validate file size
    const sizeValidation = validateFileSize(downloadResult.audioBuffer.byteLength, settings)
    if (!sizeValidation.valid) {
      throw createDownloadError(
        sizeValidation.message!,
        'FILE_TOO_LARGE',
        413,
        false,
        'processing_error'
      )
    }
    
    // Generate filename
    const filename = `${formatCustomTitle(settings.trackName, track)}.${getFileExtension(settings.outputCodec)}`
    
    // Process audio if needed (conversion, metadata, etc.)
    if (progressTracker && album) {
      progressTracker.updateTrackProgress(album.id, track.id, 90, 'processing')
    }
    onProgress?.(90)
    
    // Extract metadata for tagging
    const metadata = extractFileMetadata(track)
    
    const result: DownloadResult = {
      success: true,
      filename,
      actualQuality: downloadResult.actualQuality,
      fallbackUsed: downloadResult.fallbackUsed,
      fileSize: downloadResult.audioBuffer.byteLength,
      processingTime: Date.now() - startTime
    }
    
    // Complete progress tracking
    if (progressTracker && album) {
      progressTracker.completeTrack(album.id, track.id, downloadResult.actualQuality, downloadResult.fallbackUsed)
    }
    onProgress?.(100)
    onComplete?.(result)
    
    return result
    
  } catch (error: any) {
    const downloadError = error instanceof Error ? error : new Error(String(error))
    
    // Mark as failed in progress tracker
    if (progressTracker && album) {
      progressTracker.failTrack(album.id, track.id, downloadError)
    }
    
    const result: DownloadResult = {
      success: false,
      filename: '',
      error: downloadError,
      processingTime: Date.now() - startTime
    }
    
    onError?.(downloadError)
    return result
  }
}

/**
 * Downloads all tracks in an album with progress tracking
 */
export const downloadAlbum = async (
  album: FetchedQobuzAlbum,
  settings: SettingsProps,
  onProgress?: (albumProgress: number, trackProgress: number, currentTrack: string) => void
): Promise<DownloadResult[]> => {
  
  // Initialize album progress tracking
  downloadProgressTracker.initializeAlbum(album)
  
  const results: DownloadResult[] = []
  const tracks = album.tracks.items
  
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i]
    const albumProgress = ((i) / tracks.length) * 100
    
    onProgress?.(albumProgress, 0, track.title)
    
    try {
      const result = await downloadTrack({
        track: {
          ...track,
          album: album
        },
        settings,
        album,
        progressTracker: downloadProgressTracker,
        onProgress: (trackProgress) => {
          onProgress?.(albumProgress, trackProgress, track.title)
        }
      })
      
      results.push(result)
      
    } catch (error: any) {
      // Create simple error result instead of using retry handler
      const downloadError = error instanceof Error ? error : new Error(String(error))
      
      results.push({
        success: false,
        filename: '',
        error: downloadError
      })
    }
  }
  
  return results
}

/**
 * Downloads artist discography with batch processing
 */
export const downloadArtistDiscography = async (
  artistId: string,
  settings: SettingsProps,
  onProgress?: (overallProgress: number, currentAlbum: string) => void
): Promise<{ albums: DownloadResult[][]; errors: Error[] }> => {
  
  const results: DownloadResult[][] = []
  const errors: Error[] = []
  
  try {
    // Get artist releases
    const releasesResponse = await makeApiRequest(() =>
      axios.get(`/api/get-releases?artist_id=${artistId}&type=album&limit=50`)
    )
    
    const releases = (releasesResponse as any).data.albums.items
    
    for (let i = 0; i < releases.length; i++) {
      const release = releases[i]
      const overallProgress = (i / releases.length) * 100
      
      onProgress?.(overallProgress, release.title)
      
      try {
        // Get full album data with tracks
        const albumResponse = await makeApiRequest(() =>
          axios.get(`/api/get-album?album_id=${release.id}`)
        )
        const album: FetchedQobuzAlbum = (albumResponse as any).data.data
        
        // Download album
        const albumResults = await downloadAlbum(
          album,
          settings,
          (albumProgress, trackProgress, currentTrack) => {
            const totalProgress = overallProgress + (albumProgress / releases.length)
            onProgress?.(totalProgress, `${release.title} - ${currentTrack}`)
          }
        )
        
        results.push(albumResults)
        
      } catch (error: any) {
        const downloadError = error instanceof Error ? error : new Error(String(error))
        errors.push(downloadError)
        
        // Add empty result set for this album
        results.push([{
          success: false,
          filename: '',
          error: downloadError
        }])
      }
    }
    
  } catch (error: any) {
    const overallError = error instanceof Error ? error : new Error(String(error))
    errors.push(overallError)
  }
  
  return { albums: results, errors }
}

/**
 * Get download statistics from progress tracker
 */
export const getDownloadStatistics = () => {
  const state = downloadProgressTracker.getState()
  
  return {
    totalAlbums: state.albums.size,
    completedAlbums: Array.from(state.albums.values()).filter(a => a.status === 'completed').length,
    failedAlbums: Array.from(state.albums.values()).filter(a => a.status === 'failed').length,
    activeDownloads: state.activeDownloads,
    totalTracks: Array.from(state.albums.values()).reduce((sum, album) => sum + album.totalTracks, 0),
    completedTracks: Array.from(state.albums.values()).reduce((sum, album) => sum + album.completedTracks, 0),
    failedTracks: Array.from(state.albums.values()).reduce((sum, album) => sum + album.failedTracks, 0)
  }
}