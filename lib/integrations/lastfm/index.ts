/**
 * Main Last.fm integration module
 * Provides high-level functions for getting similar artists with Qobuz integration
 */

export * from './types'
export * from './client'
export * from './transformer'

import { getSimilarArtists as getSimilarArtistsApi } from './client'
import { transformSimilarArtists, filterAvailableArtists, TransformedSimilarArtist } from './transformer'
import { QobuzArtist } from '../../qobuz-dl'

export interface SimilarArtistsOptions {
  /** Maximum number of similar artists to return */
  limit?: number
  /** Whether to auto-correct artist name spelling */
  autocorrect?: boolean
  /** MusicBrainz ID of the artist (alternative to name) */
  mbid?: string
  /** Include Qobuz data for each similar artist */
  includeQobuzData?: boolean
  /** Minimum similarity threshold (0-1) */
  minSimilarity?: number
  /** Only return artists available in Qobuz */
  onlyAvailable?: boolean
}

export interface SimilarArtistsResult {
  /** Original artist name that was searched */
  originalArtist: string
  /** Array of similar artists with Last.fm and Qobuz data */
  similarArtists: TransformedSimilarArtist[]
  /** Total number found before filtering */
  totalFound: number
  /** Number of artists available in Qobuz */
  availableInQobuz: number
}

/**
 * Get similar artists for a given artist with Qobuz integration
 */
export async function getSimilarArtistsWithQobuz(
  artistName: string,
  options: SimilarArtistsOptions = {}
): Promise<SimilarArtistsResult> {
  const {
    limit = 20,
    autocorrect = true,
    includeQobuzData = true,
    minSimilarity = 0.1,
    onlyAvailable = false,
    mbid
  } = options

  try {
    // Get similar artists from Last.fm
    const lastFmResponse = await getSimilarArtistsApi(artistName, {
      limit: Math.min(limit * 2, 100), // Get more to account for filtering
      autocorrect,
      mbid
    })

    const lastFmArtists = lastFmResponse.similarartists.artist || []
    
    // Transform and enrich with Qobuz data
    const transformedArtists = await transformSimilarArtists(lastFmArtists, {
      includeQobuzData,
      maxResults: limit * 2,
      minSimilarity
    })

    // Filter and sort results
    let finalArtists = transformedArtists
    
    if (onlyAvailable && includeQobuzData) {
      finalArtists = filterAvailableArtists(transformedArtists)
    }

    // Apply final limit
    finalArtists = finalArtists.slice(0, limit)

    const availableCount = finalArtists.filter(artist => artist.qobuzData !== null).length

    return {
      originalArtist: lastFmResponse.similarartists['@attr']?.artist || artistName,
      similarArtists: finalArtists,
      totalFound: lastFmArtists.length,
      availableInQobuz: availableCount
    }

  } catch (error: any) {
    throw new Error(`Failed to get similar artists: ${error.message}`)
  }
}

/**
 * Get similar artists that are available in Qobuz
 */
export async function getAvailableSimilarArtists(
  artistName: string,
  limit: number = 10
): Promise<QobuzArtist[]> {
  const result = await getSimilarArtistsWithQobuz(artistName, {
    limit: limit * 2, // Get more to account for filtering
    onlyAvailable: true,
    includeQobuzData: true,
    minSimilarity: 0.2 // Higher threshold for better matches
  })

  return result.similarArtists
    .filter(artist => artist.qobuzData !== null)
    .slice(0, limit)
    .map(artist => artist.qobuzData!)
}

/**
 * Check if Last.fm integration is properly configured
 */
export function isLastFmConfigured(): boolean {
  const apiKey = process.env.LASTFM_API_KEY?.trim()
  const apiSecret = process.env.LASTFM_API_SECRET?.trim()
  
  return !!(apiKey && apiKey.length > 0 && apiSecret && apiSecret.length > 0)
}

/**
 * Get Last.fm configuration status and requirements
 */
export function getLastFmStatus(): {
  configured: boolean
  apiKey?: string
  requirements: string[]
} {
  const apiKey = process.env.LASTFM_API_KEY?.trim()
  const apiSecret = process.env.LASTFM_API_SECRET?.trim()
  const configured = isLastFmConfigured()
  
  const requirements: string[] = []

  if (!apiKey || apiKey.length === 0) {
    requirements.push('LASTFM_API_KEY environment variable must be set')
  }
  
  if (!apiSecret || apiSecret.length === 0) {
    requirements.push('LASTFM_API_SECRET environment variable must be set')
  }
  
  if (requirements.length === 0 && !configured) {
    requirements.push('Last.fm configuration validation failed')
  }
  
  if (requirements.length > 0) {
    requirements.push('Get free API credentials from https://www.last.fm/api')
  }

  const status = {
    configured,
    apiKey: configured ? 'configured' : undefined,
    requirements
  }
  
  return status
}