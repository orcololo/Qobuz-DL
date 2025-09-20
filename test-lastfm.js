// Test script to verify Last.fm API integration
// Run with: node test-lastfm.js

const axios = require('axios');

const LASTFM_API_KEY = 'ebc8338c400ce815456a001956adf285';
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

async function testLastFmApi() {
  console.log('🎵 Testing Last.fm API integration...\n');

  try {
    // Test the API key with a simple request
    console.log('1. Testing API key validity...');
    const response = await axios.get(LASTFM_BASE_URL, {
      params: {
        method: 'artist.getsimilar',
        artist: 'Cher',
        api_key: LASTFM_API_KEY,
        format: 'json',
        limit: 5
      },
      timeout: 10000
    });

    console.log('✅ API key is valid!');
    console.log(`📊 Response status: ${response.status}`);
    
    if (response.data.error) {
      console.log(`❌ Last.fm API error: ${response.data.message} (Code: ${response.data.error})`);
      return false;
    }

    if (response.data.similarartists) {
      const artists = response.data.similarartists.artist || [];
      console.log(`✅ Found ${artists.length} similar artists for Cher:`);
      
      artists.slice(0, 3).forEach((artist, index) => {
        console.log(`   ${index + 1}. ${artist.name} (${Math.round(parseFloat(artist.match) * 100)}% similar)`);
      });

      console.log('\n🎯 Last.fm integration is working correctly!');
      return true;
    } else {
      console.log('❌ Unexpected response format');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return false;
    }

  } catch (error) {
    console.log('❌ Error testing Last.fm API:');
    
    if (error.code === 'ECONNABORTED') {
      console.log('   - Request timeout (check internet connection)');
    } else if (error.response) {
      console.log(`   - HTTP ${error.response.status}: ${error.response.statusText}`);
      if (error.response.data) {
        console.log(`   - Response: ${JSON.stringify(error.response.data)}`);
      }
    } else {
      console.log(`   - ${error.message}`);
    }
    
    return false;
  }
}

// Run the test
testLastFmApi().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});