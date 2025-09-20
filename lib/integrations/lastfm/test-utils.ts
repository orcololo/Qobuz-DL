/**
 * Basic test utilities for Last.fm integration
 * These are simple verification functions, not full unit tests
 */

import { getSimilarArtistsWithQobuz, isLastFmConfigured, getLastFmStatus } from './index'

/**
 * Test Last.fm configuration
 */
export async function testLastFmConfiguration(): Promise<{
  configured: boolean
  status: string
  details?: any
}> {
  const status = getLastFmStatus()
  
  if (!status.configured) {
    return {
      configured: false,
      status: 'Not configured',
      details: status.requirements
    }
  }

  try {
    // Test with a well-known artist
    const result = await getSimilarArtistsWithQobuz('Cher', {
      limit: 5,
      includeQobuzData: false // Skip Qobuz lookup for faster test
    })

    return {
      configured: true,
      status: 'Working correctly',
      details: {
        totalFound: result.totalFound,
        sampleArtist: result.similarArtists[0]?.lastFmData.name
      }
    }
  } catch (error: any) {
    return {
      configured: false,
      status: 'Configuration error',
      details: error.message
    }
  }
}

/**
 * Test the full integration including Qobuz lookup
 */
export async function testFullIntegration(artistName: string = 'Radiohead'): Promise<{
  success: boolean
  message: string
  results?: any
}> {
  try {
    const result = await getSimilarArtistsWithQobuz(artistName, {
      limit: 10,
      includeQobuzData: true,
      minSimilarity: 0.3
    })

    const availableArtists = result.similarArtists.filter(a => a.qobuzData !== null)

    return {
      success: true,
      message: `Found ${result.totalFound} similar artists, ${availableArtists.length} available in Qobuz`,
      results: {
        originalArtist: result.originalArtist,
        totalFound: result.totalFound,
        availableInQobuz: result.availableInQobuz,
        sampleResults: result.similarArtists.slice(0, 3).map(artist => ({
          name: artist.lastFmData.name,
          similarity: artist.similarity,
          availableInQobuz: artist.qobuzData !== null,
          qobuzName: artist.qobuzData?.name
        }))
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Integration test failed: ${error.message}`
    }
  }
}

/**
 * Console-friendly test runner
 */
export async function runLastFmTests(): Promise<void> {
  console.log('🎵 Testing Last.fm Integration...\n')

  // Test 1: Configuration
  console.log('1. Testing configuration...')
  const configTest = await testLastFmConfiguration()
  console.log(`   Status: ${configTest.status}`)
  if (configTest.details) {
    console.log(`   Details:`, configTest.details)
  }
  console.log('')

  if (!configTest.configured) {
    console.log('❌ Cannot continue tests - Last.fm not configured properly')
    return
  }

  // Test 2: Full integration
  console.log('2. Testing full integration...')
  const integrationTest = await testFullIntegration()
  console.log(`   ${integrationTest.success ? '✅' : '❌'} ${integrationTest.message}`)
  if (integrationTest.results) {
    console.log(`   Sample results:`)
    integrationTest.results.sampleResults.forEach((result: any, index: number) => {
      console.log(`     ${index + 1}. ${result.name} (${Math.round(result.similarity * 100)}% similar)`)
      if (result.availableInQobuz) {
        console.log(`        ✅ Available in Qobuz as "${result.qobuzName}"`)
      } else {
        console.log(`        ❌ Not found in Qobuz`)
      }
    })
  }
  console.log('')

  console.log('🎵 Last.fm integration test complete!')
}

/**
 * Run tests from Node.js environment
 * Usage: node -e "require('./lib/integrations/lastfm/test-utils.js').runLastFmTests()"
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testLastFmConfiguration,
    testFullIntegration,
    runLastFmTests
  }
}