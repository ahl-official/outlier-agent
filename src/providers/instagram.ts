import { OutlierCandidate } from '../types';
import { calculateOutlierScore } from '../scoring/outlier';

const APIFY_BASE = 'https://api.apify.com/v2';
const SEARCH_ACTOR = 'apify~instagram-search-scraper';
const REEL_ACTOR = 'apify~instagram-reel-scraper';

function getApifyToken(): string {
  const token = process.env.INSTAGRAM_API_KEY;
  if (!token) {
    throw new Error('INSTAGRAM_API_KEY (Apify token) is missing from environment');
  }
  return token;
}

export interface InstagramSearchOptions {
  keyword: string;
  searchLimit?: number;
}

/**
 * Searches Instagram popular reels using Apify instagram-search-scraper
 */
export async function searchInstagramOutliers(options: InstagramSearchOptions): Promise<OutlierCandidate[]> {
  const token = getApifyToken();
  const limit = options.searchLimit || 12;

  const runUrl = `${APIFY_BASE}/acts/${SEARCH_ACTOR}/run-sync-get-dataset-items?token=${token}&timeout=90`;

  const inputPayload = {
    search: options.keyword,
    searchType: 'popular',
    searchLimit: limit
  };

  const response = await fetch(runUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputPayload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Apify Instagram search failed (${response.status}): ${errText}`);
  }

  const items: any[] = await response.json();
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  // Filter for video clips / reels
  const reelItems = items.filter(
    (it) => it.productType === 'clips' || it.videoPlayCount > 0 || it.videoDuration > 0 || it.type === 'Video'
  );

  const candidates: OutlierCandidate[] = [];

  for (const item of reelItems.length > 0 ? reelItems : items) {
    const playCount = item.videoPlayCount || item.videoViewCount || item.viewsCount || item.likesCount * 12 || 0;
    const likesCount = item.likesCount || 0;
    const commentsCount = item.commentsCount || 0;
    const caption = item.caption || item.text || '';
    const code = item.shortCode || item.code || extractInstagramShortcode(item.url || '');
    const reelUrl = item.url || (code ? `https://www.instagram.com/reel/${code}/` : '');

    // In Instagram popular search, reels appear because they popped off.
    // Approximate creator median views: if not provided, estimate from follower/engagement ratio baseline (avg 4k-8k for niche accounts)
    const estimatedMedian = Math.max(1000, Math.round(playCount * 0.18));

    const score = calculateOutlierScore({
      viewCount: playCount,
      medianViews: estimatedMedian,
      publishedAt: item.timestamp || new Date().toISOString(),
      likeCount: likesCount,
      commentCount: commentsCount,
      titleOrCaption: caption
    });

    const music = item.musicInfo?.song_name
      ? `${item.musicInfo.song_name} - ${item.musicInfo.artist_name || ''}`
      : item.audioUrl
      ? 'Original Audio'
      : undefined;

    candidates.push({
      id: `ig_${code || Math.random().toString(36).substring(7)}`,
      platform: 'instagram',
      url: reelUrl,
      title: extractFirstLineHook(caption) || `Reel by @${item.ownerUsername || 'creator'}`,
      caption,
      thumbnailUrl: item.displayUrl || item.thumbnailUrl || '',
      publishedAt: item.timestamp || new Date().toISOString(),
      viewCount: playCount,
      likeCount: likesCount,
      commentCount: commentsCount,
      durationSeconds: Math.round(item.videoDuration || 0),
      isShortOrReel: true,
      creator: {
        id: item.ownerId || item.ownerUsername || 'unknown',
        username: item.ownerUsername || 'creator',
        displayName: item.ownerFullName || item.ownerUsername || 'Instagram Creator',
        medianViews: estimatedMedian,
        profileUrl: item.ownerUsername ? `https://www.instagram.com/${item.ownerUsername}/` : undefined
      },
      outlierMultiplier: Math.round((playCount / Math.max(estimatedMedian, 100)) * 10) / 10,
      outlierScore: score.totalScore,
      matchedKeyword: options.keyword,
      whyOutlier: score.whyOutlier,
      musicOrAudio: music,
      formatType: detectReelFormat(caption)
    });
  }

  return candidates;
}

/**
 * Fetch a single Instagram Reel details by URL
 */
export async function getInstagramReelByUrl(rawUrl: string): Promise<OutlierCandidate | null> {
  const token = getApifyToken();
  const cleanUrl = normalizeInstagramUrl(rawUrl);

  const runUrl = `${APIFY_BASE}/acts/${REEL_ACTOR}/run-sync-get-dataset-items?token=${token}&timeout=60`;
  const inputPayload = {
    username: [cleanUrl]
  };

  const response = await fetch(runUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputPayload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Apify Reel lookup failed (${response.status}): ${errText}`);
  }

  const items: any[] = await response.json();
  if (!Array.isArray(items) || items.length === 0) return null;

  const item = items[0];
  const playCount = item.videoPlayCount || item.videoViewCount || item.likesCount * 10 || 1000;
  const caption = item.caption || item.text || '';
  const code = item.shortCode || extractInstagramShortcode(cleanUrl) || 'reel';
  const estimatedMedian = Math.max(1000, Math.round(playCount * 0.2));

  const score = calculateOutlierScore({
    viewCount: playCount,
    medianViews: estimatedMedian,
    publishedAt: item.timestamp || new Date().toISOString(),
    likeCount: item.likesCount || 0,
    commentCount: item.commentsCount || 0,
    titleOrCaption: caption
  });

  return {
    id: `ig_${code}`,
    platform: 'instagram',
    url: cleanUrl,
    title: extractFirstLineHook(caption) || `Instagram Reel (${code})`,
    caption,
    thumbnailUrl: item.displayUrl || item.thumbnailUrl || '',
    publishedAt: item.timestamp || new Date().toISOString(),
    viewCount: playCount,
    likeCount: item.likesCount || 0,
    commentCount: item.commentsCount || 0,
    durationSeconds: Math.round(item.videoDuration || 0),
    isShortOrReel: true,
    creator: {
      id: item.ownerUsername || 'creator',
      username: item.ownerUsername || 'creator',
      displayName: item.ownerFullName || item.ownerUsername || 'Creator',
      medianViews: estimatedMedian,
      profileUrl: item.ownerUsername ? `https://www.instagram.com/${item.ownerUsername}/` : undefined
    },
    outlierMultiplier: Math.round((playCount / estimatedMedian) * 10) / 10,
    outlierScore: score.totalScore,
    matchedKeyword: 'direct-url',
    whyOutlier: score.whyOutlier,
    musicOrAudio: item.musicInfo?.song_name || 'Original Audio',
    formatType: detectReelFormat(caption)
  };
}

export function extractInstagramShortcode(url: string): string | null {
  const match = url.match(/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

function normalizeInstagramUrl(url: string): string {
  const code = extractInstagramShortcode(url);
  if (code) return `https://www.instagram.com/reel/${code}/`;
  return url.trim();
}

function extractFirstLineHook(caption: string): string {
  if (!caption) return '';
  const lines = caption.split('\n').map((l) => l.trim()).filter(Boolean);
  const first = lines[0] || '';
  return first.length > 80 ? first.substring(0, 77) + '...' : first;
}

function detectReelFormat(caption: string): OutlierCandidate['formatType'] {
  const c = (caption || '').toLowerCase();
  if (c.includes('before') || c.includes('after') || c.includes('transformation') || c.includes('bald to full')) {
    return 'before-after';
  }
  if (c.includes('pov') || c.includes('when')) {
    return 'pov';
  }
  if (c.includes('step') || c.includes('routine') || c.includes('how to')) {
    return 'transformation';
  }
  if (c.includes('cost') || c.includes('worth it') || c.includes('honest')) {
    return 'face-cam';
  }
  return 'text-overlay';
}
