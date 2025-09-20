import { NextRequest, NextResponse } from 'next/server'
import { getSimilarArtistsWithQobuz, getLastFmStatus } from '@/lib/integrations/lastfm'
import z from 'zod'

const getSimilarArtistsSchema = z.object({
  artist: z.string().min(1, 'Artist name is required'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  autocorrect: z.coerce.boolean().optional().default(true),
  includeQobuzData: z.coerce.boolean().optional().default(true),
  minSimilarity: z.coerce.number().min(0).max(1).optional().default(0.1),
  onlyAvailable: z.coerce.boolean().optional().default(false),
  mbid: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    // Check if Last.fm is configured
    const status = getLastFmStatus()
    
    if (!status.configured) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Last.fm integration not configured',
          requirements: status.requirements
        }),
        { status: 503 }
      )
    }

    // Parse and validate query parameters
    const params = Object.fromEntries(new URL(request.url).searchParams.entries())
    const validatedParams = getSimilarArtistsSchema.parse(params)

    // Get similar artists
    const result = await getSimilarArtistsWithQobuz(validatedParams.artist, {
      limit: validatedParams.limit,
      autocorrect: validatedParams.autocorrect,
      includeQobuzData: validatedParams.includeQobuzData,
      minSimilarity: validatedParams.minSimilarity,
      onlyAvailable: validatedParams.onlyAvailable,
      mbid: validatedParams.mbid
    })

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: result
      }),
      { 
        status: 200,
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' // Cache for 1 hour, serve stale for 1 day
        }
      }
    )

  } catch (error: any) {
    console.error('Error getting similar artists:', error)

    if (error.name === 'ZodError') {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Invalid parameters',
          details: error.errors
        }),
        { status: 400 }
      )
    }

    if (error.name === 'LastFmApiError') {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: error.message,
          lastFmError: error.lastFmErrorCode
        }),
        { status: error.statusCode || 500 }
      )
    }

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to get similar artists'
      }),
      { status: 500 }
    )
  }
}