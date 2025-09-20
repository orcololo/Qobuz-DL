import { LastFmSimilarArtist, LastFmImage } from './types'
import { QobuzArtist } from '../../qobuz-dl'
import { search, getArtist } from '../../qobuz-dl'

/**
 * Transform Last.fm data to Qobuz format
 */

export interface TransformedSimilarArtist {
  lastFmData: LastFmSimilarArtist
  qobuzData: QobuzArtist | null
  similarity: number
  imageUrl?: string
}

/**
 * Get the best image URL from Last.fm images array
 */
export function getBestImageUrl(images: LastFmImage[]): string | undefined {
  // Priority: extralarge > large > medium > small > mega
  const priorities: LastFmImage['size'][] = ['extralarge', 'large', 'medium', 'small', 'mega']
  
  for (const size of priorities) {
    const image = images.find(img => img.size === size && img['#text'])
    if (image?.['#text']) {
      return image['#text']
    }
  }
  
  return undefined
}

/**
 * Clean artist name for better Qobuz search matching
 */
export function cleanArtistName(name: string): string {
  return name
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[""'']/g, '"') // Normalize quotes
    .replace(/[–—]/g, '-') // Normalize dashes
    .trim()
}

/**
 * Search for a Qobuz artist by name with fuzzy matching
 */
export async function findQobuzArtist(artistName: string): Promise<QobuzArtist | null> {
  try {
    const cleanName = cleanArtistName(artistName)
    
    // Try exact search first
    const searchResults = await search(cleanName, 5)
    
    if (searchResults.artists.items.length > 0) {
      // Look for exact or close matches
      const exactMatch = searchResults.artists.items.find(
        artist => artist.name.toLowerCase() === cleanName.toLowerCase()
      )
      
      if (exactMatch) {
        return exactMatch
      }
      
      // Look for partial matches
      const partialMatch = searchResults.artists.items.find(
        artist => {
          const artistNameLower = artist.name.toLowerCase()
          const cleanNameLower = cleanName.toLowerCase()
          return artistNameLower.includes(cleanNameLower) || cleanNameLower.includes(artistNameLower)
        }
      )
      
      if (partialMatch) {
        return partialMatch
      }
      
      // Return first result as fallback
      return searchResults.artists.items[0]
    }
    
    // Try alternative search strategies
    const words = cleanName.split(' ')
    if (words.length > 1) {
      // Try searching with just the first word
      const firstWordResults = await search(words[0], 3)
      const firstWordMatch = firstWordResults.artists.items.find(
        artist => artist.name.toLowerCase().includes(cleanName.toLowerCase())
      )
      
      if (firstWordMatch) {
        return firstWordMatch
      }
    }
    
    return null
  } catch (error) {
    console.warn(`Failed to find Qobuz artist for "${artistName}":`, error)
    return null
  }
}

/**
 * Transform Last.fm similar artists to include Qobuz data
 */
export async function transformSimilarArtists(
  lastFmArtists: LastFmSimilarArtist[],
  options: {
    includeQobuzData?: boolean
    maxResults?: number
    minSimilarity?: number
  } = {}
): Promise<TransformedSimilarArtist[]> {
  const {
    includeQobuzData = true,
    maxResults = 20,
    minSimilarity = 0.1
  } = options

  const results: TransformedSimilarArtist[] = []
  
  for (const artist of lastFmArtists.slice(0, maxResults)) {
    const similarity = parseFloat(artist.match)
    
    // Skip artists below minimum similarity threshold
    if (similarity < minSimilarity) {
      continue
    }
    
    const transformedArtist: TransformedSimilarArtist = {
      lastFmData: artist,
      qobuzData: null,
      similarity,
      imageUrl: getBestImageUrl(artist.image)
    }
    
    // Fetch Qobuz data if requested
    if (includeQobuzData) {
      try {
        transformedArtist.qobuzData = await findQobuzArtist(artist.name)
      } catch (error) {
        console.warn(`Failed to fetch Qobuz data for ${artist.name}:`, error)
      }
    }
    
    results.push(transformedArtist)
  }
  
  // Sort by similarity (highest first)
  return results.sort((a, b) => b.similarity - a.similarity)
}

/**
 * Get similarity score between two artist names
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const clean1 = cleanArtistName(name1).toLowerCase()
  const clean2 = cleanArtistName(name2).toLowerCase()
  
  if (clean1 === clean2) return 1.0
  
  // Simple similarity based on common words
  const words1 = clean1.split(' ')
  const words2 = clean2.split(' ')
  
  const commonWords = words1.filter(word => words2.includes(word))
  const totalWords = Math.max(words1.length, words2.length)
  
  return commonWords.length / totalWords
}

/**
 * Filter and rank similar artists by availability in Qobuz
 */
export function filterAvailableArtists(artists: TransformedSimilarArtist[]): TransformedSimilarArtist[] {
  return artists
    .filter(artist => artist.qobuzData !== null)
    .sort((a, b) => {
      // Primary sort: similarity
      if (Math.abs(a.similarity - b.similarity) > 0.1) {
        return b.similarity - a.similarity
      }
      
      // Secondary sort: name similarity
      if (a.qobuzData && b.qobuzData) {
        const nameSimA = calculateNameSimilarity(a.lastFmData.name, a.qobuzData.name)
        const nameSimB = calculateNameSimilarity(b.lastFmData.name, b.qobuzData.name)
        return nameSimB - nameSimA
      }
      
      return 0
    })
}