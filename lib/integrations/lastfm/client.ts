import axios from 'axios'
import { 
  LastFmApiParams, 
  LastFmResponse, 
  LastFmSimilarArtistsResponse, 
  LastFmErrorResponse,
  LASTFM_ERROR_CODES,
  LastFmErrorCode
} from './types'
import { ApiError } from '../../api-utils'

/**
 * Last.fm API client for artist data
 */

export class LastFmApiError extends ApiError {
  public readonly lastFmErrorCode?: LastFmErrorCode

  constructor(message: string, statusCode: number, lastFmErrorCode?: LastFmErrorCode) {
    super(message, statusCode)
    this.lastFmErrorCode = lastFmErrorCode
    this.name = 'LastFmApiError'
  }
}

class LastFmClient {
  private readonly baseUrl = 'https://ws.audioscrobbler.com/2.0/'
  private readonly apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Make a request to the Last.fm API
   */
  private async makeRequest<T>(params: LastFmApiParams): Promise<T> {
    try {
      const requestParams = {
        ...params,
        api_key: this.apiKey,
        format: 'json' as const
      }

      const response = await axios.get(this.baseUrl, {
        params: requestParams,
        timeout: 10000
      })

      // Check for Last.fm API errors
      if (response.data.error) {
        const errorCode = response.data.error as LastFmErrorCode
        const errorMessage = LASTFM_ERROR_CODES[errorCode] || response.data.message || 'Unknown Last.fm error'
        throw new LastFmApiError(errorMessage, 400, errorCode)
      }

      return response.data as T
    } catch (error: any) {
      if (error instanceof LastFmApiError) {
        throw error
      }

      if (error.code === 'ECONNABORTED') {
        throw new LastFmApiError('Last.fm API request timeout', 408)
      }

      if (error.response?.status === 429) {
        throw new LastFmApiError('Rate limit exceeded', 429, 29)
      }

      throw new LastFmApiError(
        error.message || 'Failed to connect to Last.fm API',
        error.response?.status || 500
      )
    }
  }

  /**
   * Get similar artists for a given artist
   */
  async getSimilarArtists(
    artist: string, 
    options: {
      limit?: number
      autocorrect?: boolean
      mbid?: string
    } = {}
  ): Promise<LastFmSimilarArtistsResponse> {
    const params: LastFmApiParams = {
      method: 'artist.getsimilar',
      api_key: this.apiKey
    }

    if (options.mbid) {
      params.mbid = options.mbid
    } else {
      params.artist = artist
    }

    if (options.limit) {
      params.limit = Math.min(Math.max(1, options.limit), 100) // Limit between 1-100
    }

    if (options.autocorrect !== undefined) {
      params.autocorrect = options.autocorrect ? 1 : 0
    }

    return this.makeRequest<LastFmSimilarArtistsResponse>(params)
  }

  /**
   * Test API key validity
   */
  async testApiKey(): Promise<boolean> {
    try {
      await this.getSimilarArtists('Cher', { limit: 1 })
      return true
    } catch (error) {
      return false
    }
  }
}

// Singleton instance
let lastFmClient: LastFmClient | null = null

/**
 * Initialize Last.fm client with API key
 */
export function initializeLastFm(apiKey: string): void {
  lastFmClient = new LastFmClient(apiKey)
}

/**
 * Get the Last.fm client instance
 */
export function getLastFmClient(): LastFmClient {
  if (!lastFmClient) {
    const apiKey = process.env.LASTFM_API_KEY
    if (!apiKey || apiKey.trim().length === 0) {
      throw new LastFmApiError('Last.fm API key not configured in environment variables', 500)
    }
    lastFmClient = new LastFmClient(apiKey.trim())
  }
  return lastFmClient
}

/**
 * Get similar artists for a given artist name
 */
export async function getSimilarArtists(
  artistName: string,
  options: {
    limit?: number
    autocorrect?: boolean
    mbid?: string
  } = {}
): Promise<LastFmSimilarArtistsResponse> {
  const client = getLastFmClient()
  return client.getSimilarArtists(artistName, options)
}