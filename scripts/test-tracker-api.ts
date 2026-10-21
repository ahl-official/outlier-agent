import fetch from 'node-fetch';

async function testTracker() {
  const baseUrl = 'http://localhost:3001/api/tracker';
  console.log('Testing GET /api/tracker...');
  
  try {
    const getRes = await fetch(baseUrl);
    const getData = await getRes.json();
    console.log('GET Response:', getData);

    console.log('\nTesting POST /api/tracker with new video...');
    const postRes1 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submittedBy: 'Member 1 (Aman)',
        brand: 'AHL Hair Systems',
        platform: 'YouTube Shorts',
        videoTitle: 'Crazy Hair Patch Transformation in 30 Seconds',
        videoUrl: 'https://www.youtube.com/watch?v=TEST_DUPLICATE_CHECK_123',
        creator: 'HairCareExpert',
        followers: 12000,
        views: 89000,
        reachRatio: 7.4,
        outlierMultiplier: 4.8,
        outlierTier: 'Mega Outlier',
        visualHook: 'Immediate before-and-after split screen showing dramatic baldness reversal',
        audioStrategy: 'High-tempo trending bass boost audio with voiceover',
        secretFormula: 'Fast 1.5s hook, removes fear of patch maintenance, clear CTA'
      })
    });
    const postData1 = await postRes1.json();
    console.log('POST 1 (Fresh Submission):', postData1);

    console.log('\nTesting POST /api/tracker with DUPLICATE video (different URL params)...');
    const postRes2 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submittedBy: 'Member 2 (Priya)',
        brand: 'AHL Hair Systems',
        platform: 'YouTube Shorts',
        videoTitle: 'Crazy Hair Patch Transformation in 30 Seconds',
        videoUrl: 'https://youtu.be/TEST_DUPLICATE_CHECK_123?si=random_tracking_param',
        creator: 'HairCareExpert',
        followers: 12000,
        views: 89000,
        reachRatio: 7.4,
        outlierMultiplier: 4.8,
        outlierTier: 'Mega Outlier'
      })
    });
    const postData2 = await postRes2.json();
    console.log('POST 2 (Duplicate Attempt):', postData2);

  } catch (err: any) {
    console.error('Test error:', err.message);
  }
}

testTracker();
