import { QobuzTrack, FetchedQobuzAlbum } from '../qobuz-dl'

/**
 * Download progress tracking and reporting
 */

export interface TrackProgress {
  trackId: number
  title: string
  progress: number
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'failed'
  error?: Error
  actualQuality?: string
  fallbackUsed?: boolean
  downloadedSize?: number
  totalSize?: number
}

export interface AlbumProgress {
  albumId: string
  title: string
  artist: string
  totalTracks: number
  completedTracks: number
  failedTracks: number
  tracks: Map<number, TrackProgress>
  overallProgress: number
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled'
  startTime?: Date
  endTime?: Date
}

export interface DownloadProgressState {
  albums: Map<string, AlbumProgress>
  activeDownloads: number
  totalDownloads: number
  completedDownloads: number
  failedDownloads: number
}

export type ProgressCallback = (state: DownloadProgressState) => void

/**
 * Download progress tracker for managing multiple album downloads
 */
export class DownloadProgressTracker {
  private state: DownloadProgressState = {
    albums: new Map(),
    activeDownloads: 0,
    totalDownloads: 0,
    completedDownloads: 0,
    failedDownloads: 0
  }
  
  private callbacks: Set<ProgressCallback> = new Set()
  
  /**
   * Subscribe to progress updates
   */
  subscribe(callback: ProgressCallback): () => void {
    this.callbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback)
    }
  }
  
  /**
   * Notify all subscribers of state changes
   */
  private notifySubscribers(): void {
    this.callbacks.forEach(callback => {
      try {
        callback({ ...this.state })
      } catch (error) {
        console.error('Error in progress callback:', error)
      }
    })
  }
  
  /**
   * Initialize album progress tracking
   */
  initializeAlbum(album: FetchedQobuzAlbum): void {
    const albumProgress: AlbumProgress = {
      albumId: album.id,
      title: album.title,
      artist: album.artist.name,
      totalTracks: album.tracks.items.length,
      completedTracks: 0,
      failedTracks: 0,
      tracks: new Map(),
      overallProgress: 0,
      status: 'pending',
      startTime: new Date()
    }
    
    // Initialize all tracks
    album.tracks.items.forEach((track: QobuzTrack) => {
      albumProgress.tracks.set(track.id, {
        trackId: track.id,
        title: track.title,
        progress: 0,
        status: 'pending'
      })
    })
    
    this.state.albums.set(album.id, albumProgress)
    this.state.totalDownloads++
    this.notifySubscribers()
  }
  
  /**
   * Update track progress
   */
  updateTrackProgress(
    albumId: string,
    trackId: number,
    progress: number,
    status?: TrackProgress['status']
  ): void {
    const album = this.state.albums.get(albumId)
    if (!album) return
    
    const track = album.tracks.get(trackId)
    if (!track) return
    
    track.progress = Math.max(0, Math.min(100, progress))
    if (status) {
      track.status = status
    }
    
    this.updateAlbumProgress(albumId)
    this.notifySubscribers()
  }
  
  /**
   * Mark track as completed
   */
  completeTrack(
    albumId: string,
    trackId: number,
    actualQuality?: string,
    fallbackUsed?: boolean
  ): void {
    const album = this.state.albums.get(albumId)
    if (!album) return
    
    const track = album.tracks.get(trackId)
    if (!track) return
    
    track.progress = 100
    track.status = 'completed'
    track.actualQuality = actualQuality
    track.fallbackUsed = fallbackUsed
    
    album.completedTracks++
    
    this.updateAlbumProgress(albumId)
    this.notifySubscribers()
  }
  
  /**
   * Mark track as failed
   */
  failTrack(albumId: string, trackId: number, error: Error): void {
    const album = this.state.albums.get(albumId)
    if (!album) return
    
    const track = album.tracks.get(trackId)
    if (!track) return
    
    track.status = 'failed'
    track.error = error
    
    album.failedTracks++
    
    this.updateAlbumProgress(albumId)
    this.notifySubscribers()
  }
  
  /**
   * Update album overall progress
   */
  private updateAlbumProgress(albumId: string): void {
    const album = this.state.albums.get(albumId)
    if (!album) return
    
    // Calculate overall progress
    const trackProgresses = Array.from(album.tracks.values())
    const totalProgress = trackProgresses.reduce((sum, track) => sum + track.progress, 0)
    album.overallProgress = Math.round(totalProgress / album.totalTracks)
    
    // Update album status
    const completedTracks = album.completedTracks
    const failedTracks = album.failedTracks
    const totalTracks = album.totalTracks
    
    if (completedTracks + failedTracks === totalTracks) {
      album.status = failedTracks > 0 ? 'failed' : 'completed'
      album.endTime = new Date()
      
      if (album.status === 'completed') {
        this.state.completedDownloads++
      } else {
        this.state.failedDownloads++
      }
    } else {
      album.status = 'downloading'
    }
  }
  
  /**
   * Get current state
   */
  getState(): DownloadProgressState {
    return { ...this.state }
  }
  
  /**
   * Get album progress
   */
  getAlbumProgress(albumId: string): AlbumProgress | undefined {
    return this.state.albums.get(albumId)
  }
  
  /**
   * Get track progress
   */
  getTrackProgress(albumId: string, trackId: number): TrackProgress | undefined {
    const album = this.state.albums.get(albumId)
    return album?.tracks.get(trackId)
  }
  
  /**
   * Clear completed albums
   */
  clearCompleted(): void {
    for (const [albumId, album] of this.state.albums.entries()) {
      if (album.status === 'completed') {
        this.state.albums.delete(albumId)
      }
    }
    this.notifySubscribers()
  }
  
  /**
   * Clear all progress
   */
  clear(): void {
    this.state = {
      albums: new Map(),
      activeDownloads: 0,
      totalDownloads: 0,
      completedDownloads: 0,
      failedDownloads: 0
    }
    this.notifySubscribers()
  }
}

/**
 * Global progress tracker instance
 */
export const downloadProgressTracker = new DownloadProgressTracker()