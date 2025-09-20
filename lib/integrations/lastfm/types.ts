/**
 * Last.fm API types and interfaces
 */

export interface LastFmImage {
  '#text': string
  size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega'
}

export interface LastFmSimilarArtist {
  name: string
  mbid?: string
  match: string
  url: string
  image: LastFmImage[]
  streamable: string
}

export interface LastFmSimilarArtistsResponse {
  similarartists: {
    artist: LastFmSimilarArtist[]
    '@attr': {
      artist: string
    }
  }
}

export interface LastFmErrorResponse {
  error: number
  message: string
}

export interface LastFmApiParams {
  method: string
  artist?: string
  mbid?: string
  api_key: string
  format?: 'json' | 'xml'
  limit?: number
  autocorrect?: 0 | 1
}

export type LastFmResponse<T> = T | LastFmErrorResponse

export const LASTFM_ERROR_CODES = {
  2: 'Invalid service - This service does not exist',
  3: 'Invalid Method - No method with that name in this package',
  4: 'Authentication Failed - You do not have permissions to access the service',
  5: 'Invalid format - This service doesn\'t exist in that format',
  6: 'Invalid parameters - Your request is missing a required parameter',
  7: 'Invalid resource specified',
  8: 'Operation failed - Something else went wrong',
  9: 'Invalid session key - Please re-authenticate',
  10: 'Invalid API key - You must be granted a valid key by last.fm',
  11: 'Service Offline - This service is temporarily offline. Try again later.',
  13: 'Invalid method signature supplied',
  16: 'There was a temporary error processing your request. Please try again',
  26: 'Suspended API key - Access for your account has been suspended, please contact Last.fm',
  29: 'Rate limit exceeded - Your IP has made too many requests in a short period'
} as const

export type LastFmErrorCode = keyof typeof LASTFM_ERROR_CODES