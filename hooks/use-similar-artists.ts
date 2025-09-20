'use client'

import { useState, useCallback } from 'react'
import { QobuzArtist } from '@/lib/qobuz-dl'
import { SimilarArtistsResult } from '@/lib/integrations/lastfm'

interface UseSimilarArtistsOptions {
  limit?: number
  autocorrect?: boolean
  includeQobuzData?: boolean
  minSimilarity?: number
  onlyAvailable?: boolean
}

interface UseSimilarArtistsReturn {
  similarArtists: SimilarArtistsResult | null
  loading: boolean
  error: string | null
  fetchSimilarArtists: (artistName: string, options?: UseSimilarArtistsOptions) => Promise<void>
  clearError: () => void
}

export function useSimilarArtists(): UseSimilarArtistsReturn {
  const [similarArtists, setSimilarArtists] = useState<SimilarArtistsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSimilarArtists = useCallback(async (
    artistName: string,
    options: UseSimilarArtistsOptions = {}
  ) => {
    if (!artistName.trim()) {
      setError('Artist name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        artist: artistName.trim(),
        ...(options.limit && { limit: options.limit.toString() }),
        ...(options.autocorrect !== undefined && { autocorrect: options.autocorrect.toString() }),
        ...(options.includeQobuzData !== undefined && { includeQobuzData: options.includeQobuzData.toString() }),
        ...(options.minSimilarity !== undefined && { minSimilarity: options.minSimilarity.toString() }),
        ...(options.onlyAvailable !== undefined && { onlyAvailable: options.onlyAvailable.toString() })
      })

      const response = await fetch(`/api/similar-artists?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to get similar artists')
      }

      setSimilarArtists(data.data)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch similar artists'
      setError(errorMessage)
      console.error('Error fetching similar artists:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    similarArtists,
    loading,
    error,
    fetchSimilarArtists,
    clearError
  }
}

export default useSimilarArtists