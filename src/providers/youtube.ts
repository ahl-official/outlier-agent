import { OutlierCandidate, RealComment } from '../types';
import { calculateOutlierScore } from '../scoring/outlier';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface ChannelCacheEntry {
  medianViews: number;
  subCount: number;
  title: string;
  avatarUrl?: string;
  recentUploads?: { title: string; views: number; publishedAt?: string }[];
  timestamp: number;
}

// In-memory cache for channel medians to conserve API quota
const channelMedianCache = new Map<string, ChannelCacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

export interface YouTubeSearchOptions {
  keyword: string;
  maxResults?: number;
  publishedAfterDays?: number;
  videoDuration?: 'short' | 'any';
}

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error('YOUTUBE_API_KEY is missing from environment');
  }
  return key;
}

/**
 * Searches YouTube for recent niche videos and returns outlier-scored candidates.
 */
export async function searchYouTubeOutliers(options: YouTubeSearchOptions): Promise<OutlierCandidate[]> {
  const apiKey = getApiKey();
  const maxResults = options.maxResults || 8;
  const days = options.publishedAfterDays || 14;

  const publishedAfter = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1. Search videos
  const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('q', options.keyword);
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('order', 'relevance');
  searchUrl.searchParams.set('publishedAfter', publishedAfter);
  searchUrl.searchParams.set('maxResults', String(maxResults));
  if (options.videoDuration) {
    searchUrl.searchParams.set('videoDuration', options.videoDuration);
  }
  searchUrl.searchParams.set('key', apiKey);

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`YouTube search failed (${searchRes.status}): ${errText}`);
  }

  const searchData = await searchRes.json();
  const items = searchData.items || [];
  if (items.length === 0) return [];

  const videoIds = items.map((it: any) => it.id?.videoId).filter(Boolean);
  if (videoIds.length === 0) return [];

  // 2. Batch get detailed video statistics (only costs 1 quota unit for up to 50 videos)
  const videoDetails = await getVideoDetailsBatch(videoIds, apiKey);

  // 3. Collect unique channel IDs to inspect channel baseline
  const channelIds = Array.from(new Set(items.map((it: any) => it.snippet?.channelId).filter(Boolean))) as string[];
  const channelBaselines = await getChannelBaselines(channelIds, apiKey);

  // 4. Transform and score candidates
  const candidates: OutlierCandidate[] = [];

  for (const item of items) {
    const videoId = item.id?.videoId;
    if (!videoId) continue;

    const details = videoDetails.get(videoId);
    const snippet = item.snippet || {};
    const channelId = snippet.channelId;
    const channelInfo = channelBaselines.get(channelId) || {
      medianViews: 2000,
      subCount: 0,
      title: snippet.channelTitle || 'Creator',
      avatarUrl: undefined,
      recentUploads: []
    };

    const viewCount = details ? parseInt(details.statistics?.viewCount || '0', 10) : 0;
    const likeCount = details ? parseInt(details.statistics?.likeCount || '0', 10) : 0;
    const commentCount = details ? parseInt(details.statistics?.commentCount || '0', 10) : 0;
    const durationIso = details?.contentDetails?.duration || '';
    const durationSeconds = parseIsoDuration(durationIso);
    const isShort = durationSeconds > 0 && durationSeconds <= 65;

    const rawTitle = snippet.title || 'Untitled';
    const cleanTitle = decodeHtmlEntities(rawTitle);
    const cleanDesc = decodeHtmlEntities(snippet.description || '');

    const score = calculateOutlierScore({
      viewCount,
      medianViews: channelInfo.medianViews,
      publishedAt: snippet.publishedAt,
      likeCount,
      commentCount,
      titleOrCaption: `${cleanTitle} ${cleanDesc}`
    });

    const thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '';

    candidates.push({
      id: `yt_${videoId}`,
      platform: 'youtube',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: cleanTitle,
      caption: cleanDesc,
      thumbnailUrl,
      publishedAt: snippet.publishedAt,
      viewCount,
      likeCount,
      commentCount,
      durationSeconds,
      isShortOrReel: isShort,
      tags: details?.snippet?.tags || [],
      creator: {
        id: channelId,
        username: channelInfo.title,
        displayName: channelInfo.title,
        avatarUrl: channelInfo.avatarUrl,
        medianViews: channelInfo.medianViews,
        subscriberOrFollowerCount: channelInfo.subCount,
        profileUrl: `https://www.youtube.com/channel/${channelId}`,
        recentUploads: channelInfo.recentUploads
      },
      outlierMultiplier: Math.round((viewCount / Math.max(channelInfo.medianViews, 50)) * 10) / 10,
      outlierScore: score.totalScore,
      matchedKeyword: options.keyword,
      whyOutlier: score.whyOutlier,
      formatType: detectFormatType(cleanTitle, cleanDesc)
    });
  }

  return candidates;
}

/**
 * Fetch a single YouTube video by URL or ID with deep metadata
 */
export async function getYouTubeVideoByUrl(rawUrlOrId: string): Promise<OutlierCandidate | null> {
  const apiKey = getApiKey();
  const videoId = extractYouTubeVideoId(rawUrlOrId);
  if (!videoId) return null;

  const detailsMap = await getVideoDetailsBatch([videoId], apiKey);
  const details = detailsMap.get(videoId);
  if (!details) return null;

  const snippet = details.snippet || {};
  const channelId = snippet.channelId;
  const channelBaselines = await getChannelBaselines([channelId], apiKey);
  const channelInfo = channelBaselines.get(channelId) || {
    medianViews: 2000,
    subCount: 0,
    title: snippet.channelTitle || 'Creator',
    avatarUrl: undefined,
    recentUploads: []
  };

  const viewCount = parseInt(details.statistics?.viewCount || '0', 10);
  const likeCount = parseInt(details.statistics?.likeCount || '0', 10);
  const commentCount = parseInt(details.statistics?.commentCount || '0', 10);
  const durationSeconds = parseIsoDuration(details.contentDetails?.duration || '');

  const cleanTitle = decodeHtmlEntities(snippet.title || '');
  const cleanDesc = decodeHtmlEntities(snippet.description || '');

  const score = calculateOutlierScore({
    viewCount,
    medianViews: channelInfo.medianViews,
    publishedAt: snippet.publishedAt,
    likeCount,
    commentCount,
    titleOrCaption: `${cleanTitle} ${cleanDesc}`
  });

  return {
    id: `yt_${videoId}`,
    platform: 'youtube',
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: cleanTitle,
    caption: cleanDesc,
    thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
    publishedAt: snippet.publishedAt,
    viewCount,
    likeCount,
    commentCount,
    durationSeconds,
    isShortOrReel: durationSeconds <= 65,
    tags: snippet.tags || [],
    creator: {
      id: channelId,
      username: channelInfo.title,
      displayName: channelInfo.title,
      avatarUrl: channelInfo.avatarUrl,
      medianViews: channelInfo.medianViews,
      subscriberOrFollowerCount: channelInfo.subCount,
      profileUrl: `https://www.youtube.com/channel/${channelId}`,
      recentUploads: channelInfo.recentUploads
    },
    outlierMultiplier: Math.round((viewCount / Math.max(channelInfo.medianViews, 50)) * 10) / 10,
    outlierScore: score.totalScore,
    matchedKeyword: 'direct-url',
    whyOutlier: score.whyOutlier,
    formatType: detectFormatType(cleanTitle, cleanDesc)
  };
}

/**
 * Fetch real comments from a YouTube video
 */
export async function getYouTubeVideoComments(videoId: string, maxResults: number = 8): Promise<RealComment[]> {
  const apiKey = getApiKey();
  const url = new URL(`${YOUTUBE_API_BASE}/commentThreads`);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('videoId', videoId);
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('order', 'relevance');
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    const items = data.items || [];

    return items.map((item: any) => {
      const top = item.snippet?.topLevelComment?.snippet || {};
      return {
        id: item.id,
        author: top.authorDisplayName || 'Viewer',
        authorProfileImageUrl: top.authorProfileImageUrl,
        text: decodeHtmlEntities(top.textDisplay || ''),
        likeCount: top.likeCount || 0,
        publishedAt: top.publishedAt || new Date().toISOString()
      };
    });
  } catch (err) {
    console.warn(`Could not fetch comments for video ${videoId}:`, err);
    return [];
  }
}

async function getVideoDetailsBatch(videoIds: string[], apiKey: string): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  if (videoIds.length === 0) return map;

  const url = new URL(`${YOUTUBE_API_BASE}/videos`);
  url.searchParams.set('part', 'snippet,statistics,contentDetails');
  url.searchParams.set('id', videoIds.join(','));
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) return map;

  const data = await res.json();
  for (const item of data.items || []) {
    map.set(item.id, item);
  }
  return map;
}

/**
 * Retrieves creator baseline statistics and recent uploads
 */
async function getChannelBaselines(
  channelIds: string[],
  apiKey: string
): Promise<Map<string, ChannelCacheEntry>> {
  const result = new Map<string, ChannelCacheEntry>();
  const toFetch: string[] = [];

  for (const cid of channelIds) {
    const cached = channelMedianCache.get(cid);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      result.set(cid, cached);
    } else {
      toFetch.push(cid);
    }
  }

  if (toFetch.length === 0) return result;

  const url = new URL(`${YOUTUBE_API_BASE}/channels`);
  url.searchParams.set('part', 'snippet,statistics,contentDetails');
  url.searchParams.set('id', toFetch.slice(0, 50).join(','));
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      for (const item of data.items || []) {
        const subCount = parseInt(item.statistics?.subscriberCount || '0', 10);
        const totalViews = parseInt(item.statistics?.viewCount || '0', 10);
        const videoCount = parseInt(item.statistics?.videoCount || '1', 10);
        const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;

        let recentUploads: { title: string; views: number; publishedAt?: string }[] = [];
        let calculatedMedian = 0;

        // Fetch recent uploads if playlist exists to calculate REAL recent median
        if (uploadsPlaylistId) {
          recentUploads = await fetchRecentUploads(uploadsPlaylistId, apiKey);
          if (recentUploads.length > 0) {
            const sortedViews = recentUploads.map((v) => v.views).sort((a, b) => a - b);
            const mid = Math.floor(sortedViews.length / 2);
            calculatedMedian = sortedViews.length % 2 !== 0 ? sortedViews[mid] : Math.round((sortedViews[mid - 1] + sortedViews[mid]) / 2);
          }
        }

        if (!calculatedMedian || calculatedMedian === 0) {
          const avgViews = totalViews / Math.max(videoCount, 1);
          calculatedMedian = Math.max(50, Math.round(avgViews * 0.35));
        }

        const entry: ChannelCacheEntry = {
          medianViews: Math.max(calculatedMedian, 50),
          subCount,
          title: item.snippet?.title || 'Creator',
          avatarUrl: item.snippet?.thumbnails?.default?.url || '',
          recentUploads,
          timestamp: Date.now()
        };

        channelMedianCache.set(item.id, entry);
        result.set(item.id, entry);
      }
    }
  } catch (err) {
    console.error('Error fetching channel baselines:', err);
  }

  return result;
}

async function fetchRecentUploads(playlistId: string, apiKey: string): Promise<{ title: string; views: number; publishedAt?: string }[]> {
  try {
    const pUrl = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
    pUrl.searchParams.set('part', 'snippet');
    pUrl.searchParams.set('playlistId', playlistId);
    pUrl.searchParams.set('maxResults', '8');
    pUrl.searchParams.set('key', apiKey);

    const res = await fetch(pUrl.toString());
    if (!res.ok) return [];

    const pData = await res.json();
    const items = pData.items || [];
    const vIds = items.map((it: any) => it.snippet?.resourceId?.videoId).filter(Boolean);
    if (vIds.length === 0) return [];

    const vUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
    vUrl.searchParams.set('part', 'statistics,snippet');
    vUrl.searchParams.set('id', vIds.join(','));
    vUrl.searchParams.set('key', apiKey);

    const vRes = await fetch(vUrl.toString());
    if (!vRes.ok) return [];

    const vData = await vRes.json();
    return (vData.items || []).map((v: any) => ({
      title: decodeHtmlEntities(v.snippet?.title || ''),
      views: parseInt(v.statistics?.viewCount || '0', 10),
      publishedAt: v.snippet?.publishedAt
    }));
  } catch (err) {
    return [];
  }
}

export function extractYouTubeVideoId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/,
    /^https?:\/\/.*?youtube\.com\/.*[?&]v=([^#&?]+)/
  ];

  for (const p of patterns) {
    const match = trimmed.match(p);
    if (match && match[1]) return match[1];
  }
  return null;
}

function parseIsoDuration(iso: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function detectFormatType(title: string, desc: string): OutlierCandidate['formatType'] {
  const text = `${title} ${desc}`.toLowerCase();
  if (text.includes('before and after') || text.includes('before/after') || text.includes('b&a') || text.includes('transformation')) {
    return 'before-after';
  }
  if (text.includes('step by step') || text.includes('fitting') || text.includes('process') || text.includes('kaise lagaye')) {
    return 'transformation';
  }
  if (text.includes('pov') || text.includes('when you')) {
    return 'pov';
  }
  if (text.includes('cost') || text.includes('price') || text.includes('truth') || text.includes('my experience')) {
    return 'face-cam';
  }
  return 'text-overlay';
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '—');
}
