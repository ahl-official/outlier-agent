import dotenv from 'dotenv';
dotenv.config();

import { searchYouTubeOutliers } from '../src/providers/youtube';

async function main() {
  console.log('\n--- OUTLIER AGENT: KEY & PROVIDER VERIFICATION ---');

  const ytKey = process.env.YOUTUBE_API_KEY;
  const igKey = process.env.INSTAGRAM_API_KEY;

  console.log(`[YouTube Key]: ${ytKey ? 'PRESENT (' + ytKey.substring(0, 4) + '...' + ytKey.slice(-4) + ')' : 'MISSING'}`);
  console.log(`[Instagram/Apify Key]: ${igKey ? 'PRESENT (' + igKey.substring(0, 4) + '...' + igKey.slice(-4) + ')' : 'MISSING'}`);

  if (ytKey) {
    try {
      console.log('\nTesting YouTube search for "hair system men"...');
      const results = await searchYouTubeOutliers({ keyword: 'hair system men', maxResults: 3 });
      console.log(`✅ YouTube API returned ${results.length} candidate(s)!`);
      if (results[0]) {
        console.log(`   Sample: "${results[0].title}"`);
        console.log(`   Views: ${results[0].viewCount.toLocaleString()} | Creator: ${results[0].creator.displayName} | Multiplier: ${results[0].outlierMultiplier}x`);
      }
    } catch (err: any) {
      console.error(`❌ YouTube API Error:`, err.message);
    }
  }

  if (igKey) {
    try {
      console.log('\nTesting Apify token validity via user endpoint...');
      const res = await fetch(`https://api.apify.com/v2/users/me?token=${igKey}`);
      if (res.ok) {
        const user = await res.json();
        console.log(`✅ Apify Token is valid! User: "${user.data?.username || 'Authenticated'}"`);
      } else {
        console.error(`❌ Apify Auth Error: HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.error(`❌ Apify Error:`, err.message);
    }
  }

  console.log('\nVerification complete.\n');
}

main().catch(console.error);
