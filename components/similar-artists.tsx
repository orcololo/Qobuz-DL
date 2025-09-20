'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink, Music, Users, AlertCircle, Loader2 } from 'lucide-react'
import { QobuzArtist } from '@/lib/qobuz-dl'
import { TransformedSimilarArtist } from '@/lib/integrations/lastfm'
import { useSimilarArtists } from '@/hooks/use-similar-artists'

interface SimilarArtistsProps {
  artist: QobuzArtist
  onArtistSelect: (artist: QobuzArtist) => void
  className?: string
}

export function SimilarArtists({ artist, onArtistSelect, className }: SimilarArtistsProps) {
  const [showAll, setShowAll] = useState(false)
  const [searchingArtist, setSearchingArtist] = useState<string | null>(null)
  const { similarArtists: result, loading, error, fetchSimilarArtists, clearError } = useSimilarArtists()

  useEffect(() => {
    if (!artist?.name) return
    
    fetchSimilarArtists(artist.name, {
      limit: 20,
      includeQobuzData: true,
      minSimilarity: 0.1,
      autocorrect: true
    })
  }, [artist?.name, fetchSimilarArtists])

  const handleArtistClick = async (transformedArtist: TransformedSimilarArtist) => {
    if (transformedArtist.qobuzData) {
      // Artist already has Qobuz data, use it directly
      onArtistSelect(transformedArtist.qobuzData)
    } else {
      // Artist not found in initial search, try to find them in Qobuz
      setSearchingArtist(transformedArtist.lastFmData.name)
      try {
        const response = await fetch(`/api/get-music?q=${encodeURIComponent(transformedArtist.lastFmData.name)}&offset=0`)
        if (!response.ok) {
          throw new Error('Failed to search for artist')
        }
        
        const searchData = await response.json()
        const artists = searchData.data?.artists?.items || []
        
        if (artists.length > 0) {
          // Use the first matching artist
          onArtistSelect(artists[0])
        } else {
          // No artist found in Qobuz
          console.warn(`Artist "${transformedArtist.lastFmData.name}" not found in Qobuz`)
        }
      } catch (error) {
        console.error('Error searching for artist in Qobuz:', error)
      } finally {
        setSearchingArtist(null)
      }
    }
  }

  const handleRetry = () => {
    clearError()
    if (artist?.name) {
      fetchSimilarArtists(artist.name, {
        limit: 20,
        includeQobuzData: true,
        minSimilarity: 0.1,
        autocorrect: true
      })
    }
  }

  const similarArtists = result?.similarArtists || []
  const totalFound = result?.totalFound || 0
  const availableCount = result?.availableInQobuz || 0
  
  const visibleArtists = showAll 
    ? similarArtists 
    : similarArtists.slice(0, 6)

  // Check if Last.fm is configured by looking at error response
  const isConfigurationError = error?.includes('not configured') || error?.includes('API key')

  if (isConfigurationError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Similar Artists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Last.fm integration not configured</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Please set up your LASTFM_API_KEY environment variable.
              <div className="mt-2 text-xs">
                • Get a free API key from https://www.last.fm/api
                • Add LASTFM_API_KEY to your environment variables
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Similar Artists
          {availableCount > 0 && (
            <span className="ml-auto px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs">
              {availableCount} in Qobuz
            </span>
          )}
        </CardTitle>
        {totalFound > 0 && (
          <p className="text-sm text-muted-foreground">
            Found {totalFound} similar artists, {availableCount} available in Qobuz
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && similarArtists.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No similar artists found</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && visibleArtists.length > 0 && (
          <div className="space-y-2">
            {visibleArtists.map((transformedArtist, index) => {
              const { lastFmData, qobuzData, similarity, imageUrl } = transformedArtist
              const isAvailable = qobuzData !== null
              const isSearching = searchingArtist === lastFmData.name

              return (
                <div
                  key={`${lastFmData.name}-${index}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted cursor-pointer ${
                    !isAvailable ? 'opacity-70' : ''
                  }`}
                  onClick={() => handleArtistClick(transformedArtist)}
                >
                  <div className="relative">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={lastFmData.name}
                        className="h-12 w-12 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <Music className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-background/50 rounded-lg" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {qobuzData?.name || lastFmData.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{Math.round(similarity * 100)}% similar</span>
                      {qobuzData && lastFmData.name !== qobuzData.name && (
                        <span>• as "{lastFmData.name}"</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSearching ? (
                      <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Searching...
                      </span>
                    ) : isAvailable ? (
                      <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                        Available
                      </span>
                    ) : (
                      <span className="px-2 py-1 border border-border text-muted-foreground rounded text-xs">
                        Search in Qobuz
                      </span>
                    )}
                    
                    {lastFmData.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={lastFmData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {similarArtists.length > 6 && (
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full"
                >
                  {showAll 
                    ? `Show Less` 
                    : `Show ${similarArtists.length - 6} More`
                  }
                </Button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && availableCount > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Click on available artists to view their albums
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SimilarArtists