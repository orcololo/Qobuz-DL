import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Simple environment variable check
    const apiKey = process.env.LASTFM_API_KEY?.trim()
    const apiSecret = process.env.LASTFM_API_SECRET?.trim()
    
    if (!apiKey || !apiSecret) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Last.fm API credentials not configured',
          debug: {
            hasApiKey: !!apiKey,
            hasApiSecret: !!apiSecret,
            keyLength: apiKey?.length || 0,
            secretLength: apiSecret?.length || 0
          }
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Last.fm integration configured',
        debug: {
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret,
          keyLength: apiKey.length,
          secretLength: apiSecret.length
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in similar-artists API:', error)
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}