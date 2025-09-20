# Last.fm Integration

This module provides Last.fm integration for discovering similar artists within the Qobuz-DL application.

## Features

- **Similar Artists Discovery**: Get artists similar to the currently viewed artist using Last.fm's music recommendation engine
- **Qobuz Cross-referencing**: Automatically find similar artists that are available in Qobuz
- **Artist Navigation**: Click on similar artists to navigate between artists and view their albums
- **Quality Matching**: Shows similarity scores and indicates which artists have matches in Qobuz
- **Error Handling**: Robust error handling with retry mechanisms and fallback behavior

## Setup

### 1. Get a Last.fm API Key

1. Visit [https://www.last.fm/api](https://www.last.fm/api)
2. Create a free account if you don't have one
3. Create a new API application
4. Copy your API key

### 2. Configure Environment Variable

Add your Last.fm API key to your environment variables:

```bash
LASTFM_API_KEY=your_api_key_here
```

Or add it to your `.env.local` file:

```
LASTFM_API_KEY=your_api_key_here
```

## Usage

### In Artist Dialog

The similar artists feature is automatically available in the artist detail dialog:

1. Open any artist's detail page
2. Scroll down to see the "Similar Artists" section
3. Click on any available artist to navigate to their page
4. View their albums and continue discovering music

### API Endpoint

You can also use the API directly:

```bash
GET /api/similar-artists?artist=Cher&limit=20
```

**Parameters:**
- `artist` (required): Artist name to find similar artists for
- `limit` (optional): Maximum number of results (1-50, default: 20)
- `autocorrect` (optional): Auto-correct artist names (default: true)
- `includeQobuzData` (optional): Include Qobuz artist data (default: true)
- `minSimilarity` (optional): Minimum similarity threshold 0-1 (default: 0.1)
- `onlyAvailable` (optional): Only return artists available in Qobuz (default: false)
- `mbid` (optional): MusicBrainz ID instead of artist name

## Module Structure

```
lib/integrations/lastfm/
├── index.ts          # Main module exports
├── types.ts          # TypeScript type definitions
├── client.ts         # Last.fm API client
└── transformer.ts    # Data transformation utilities

components/
└── similar-artists.tsx  # React component for UI

hooks/
└── use-similar-artists.ts  # React hook for API calls

app/api/
└── similar-artists/route.ts  # Next.js API route
```

## API Response Format

```json
{
  "success": true,
  "data": {
    "originalArtist": "Cher",
    "similarArtists": [
      {
        "lastFmData": {
          "name": "Sonny & Cher",
          "match": "0.95",
          "url": "https://www.last.fm/music/Sonny+%26+Cher",
          "image": [...],
          "streamable": "1"
        },
        "qobuzData": {
          "id": "123",
          "name": "Sonny & Cher",
          "picture_small": "...",
          "albums_count": 15
        },
        "similarity": 0.95,
        "imageUrl": "https://...",
        "fallbackUsed": false
      }
    ],
    "totalFound": 25,
    "availableInQobuz": 18
  }
}
```

## Error Handling

The integration includes comprehensive error handling:

- **Configuration Errors**: Clear messages when API key is missing
- **Rate Limiting**: Handles Last.fm rate limits gracefully
- **Network Errors**: Automatic retry with exponential backoff
- **Data Validation**: Input validation and sanitization
- **Fallback Behavior**: Graceful degradation when services are unavailable

## Components

### SimilarArtists Component

```tsx
import SimilarArtists from '@/components/similar-artists'

<SimilarArtists 
  artist={currentArtist}
  onArtistSelect={(newArtist) => {
    // Handle artist navigation
  }}
  className="custom-styling"
/>
```

### useSimilarArtists Hook

```tsx
import { useSimilarArtists } from '@/hooks/use-similar-artists'

const { 
  similarArtists, 
  loading, 
  error, 
  fetchSimilarArtists 
} = useSimilarArtists()

// Fetch similar artists
await fetchSimilarArtists('Cher', {
  limit: 10,
  onlyAvailable: true
})
```

## Configuration Options

The integration supports various configuration options:

- **Similarity Threshold**: Filter out artists below a certain similarity score
- **Result Limits**: Control how many artists to fetch and display
- **Auto-correction**: Let Last.fm correct misspelled artist names
- **Qobuz Filtering**: Only show artists that are available in Qobuz
- **Image Quality**: Automatic selection of best available artist images

## Performance Considerations

- **Caching**: API responses are cached for 1 hour to reduce load
- **Lazy Loading**: Similar artists are loaded only when the artist dialog is opened
- **Optimistic Updates**: UI updates immediately while data loads in background
- **Error Recovery**: Automatic retry with exponential backoff for failed requests

## Last.fm API Rate Limits

Be aware of Last.fm's rate limiting:
- Standard rate limit: 5 requests per second per IP
- Burst allowance: Short bursts up to 20 requests
- Daily limits apply for high-volume usage

The integration handles rate limiting automatically with retry logic.