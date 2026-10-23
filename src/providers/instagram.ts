import { OutlierCandidate } from '../types';
import { calculateOutlierScore, deriveSOPTaxonomy } from '../scoring/outlier';

const APIFY_BASE = 'https://api.apify.com/v2';
const SEARCH_ACTOR = 'apify~instagram-search-scraper';
const REEL_ACTOR = 'apify~instagram-reel-scraper';
const PROFILE_ACTOR = 'apify~instagram-profile-scraper';

interface InstagramProfileCacheEntry {
  followersCount: number;
  fullName?: string;
  avatarUrl?: string;
  timestamp: number;
}

const instagramProfileCache = new Map<string, InstagramProfileCacheEntry>();
const IG_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

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
  minViews?: number;
  minFollowers?: number;
  maxAgeHours?: number; // default 48 hours
  minFollowerRatio?: number; // default 3x reach
}

/**
 * Batch retrieves creator profile statistics (followers, display name)
 */
export async function getInstagramCreatorProfilesBatch(
  usernames: string[],
  token: string
): Promise<Map<string, InstagramProfileCacheEntry>> {
  const result = new Map<string, InstagramProfileCacheEntry>();
  const toFetch: string[] = [];

  for (const u of usernames) {
    const cleanUser = u.toLowerCase().trim();
    if (!cleanUser) continue;
    const cached = instagramProfileCache.get(cleanUser);
    if (cached && Date.now() - cached.timestamp < IG_CACHE_TTL_MS) {
      result.set(cleanUser, cached);
    } else {
      toFetch.push(cleanUser);
    }
  }

  if (toFetch.length === 0) return result;

  try {
    const runUrl = `${APIFY_BASE}/acts/${PROFILE_ACTOR}/run-sync-get-dataset-items?token=${token}&timeout=25`;
    const response = await fetch(runUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: toFetch.slice(0, 20) }),
      signal: AbortSignal.timeout(26000)
    });

    if (response.ok) {
      const items: any[] = await response.json();
      if (Array.isArray(items)) {
        for (const item of items) {
          const u = (item.username || '').toLowerCase();
          if (!u) continue;
          const entry: InstagramProfileCacheEntry = {
            followersCount: item.followersCount || 0,
            fullName: item.fullName,
            avatarUrl: item.profilePicUrlHD || item.profilePicUrl,
            timestamp: Date.now()
          };
          instagramProfileCache.set(u, entry);
          result.set(u, entry);
        }
      }
    }
  } catch (err) {
    console.warn('Instagram profile batch fetch warning:', err);
  }

  return result;
}

/**
 * Sanitizes keyword for Apify instagram-search-scraper.
 * Apify strictly disallows characters matching:
 *   [!?.,:;\-+=*&%$#@/~^|<>()\[\]{}"'`]
 * Also replaces apostrophes (e.g. "Men's" -> "Mens") and collapses extra spaces.
 */
export function sanitizeForInstagramSearch(keyword: string): string {
  if (!keyword) return '';
  return keyword
    .replace(/['’]/g, '')
    .replace(/[!?.,:;\\\-+=*&%$#@/~^|<>()\[\]{}"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts core 2-3 subject words if query has prepositions/stop words or is too long for Instagram topic index.
 * (e.g. "Mens hair patch without glue" -> "Mens hair patch")
 */
export function extractCoreSearchTerm(keyword: string): string {
  const stopWords = new Set(['without', 'with', 'in', 'for', 'and', 'or', 'the', 'a', 'an', 'to', 'of', 'at', 'by', 'from', 'on']);
  const words = keyword.split(' ').filter((w) => !stopWords.has(w.toLowerCase()));
  if (words.length >= 2) {
    return words.slice(0, 3).join(' ');
  }
  return keyword;
}

/**
 * Searches Instagram popular reels using Apify instagram-search-scraper
 * Filters strictly by minViews and minFollowers.
 */
export async function searchInstagramOutliers(options: InstagramSearchOptions): Promise<OutlierCandidate[]> {
  const token = getApifyToken();
  const limit = options.searchLimit || 20;
  const minViews = typeof options.minViews === 'number' ? options.minViews : 20_000;
  const minFollowers = typeof options.minFollowers === 'number' ? options.minFollowers : 1_000;

  const cleanKeyword = sanitizeForInstagramSearch(options.keyword);
  if (!cleanKeyword) {
    return [];
  }

  const runUrl = `${APIFY_BASE}/acts/${SEARCH_ACTOR}/run-sync-get-dataset-items?token=${token}&timeout=18`;

  const fetchReelsForSearch = async (searchTerm: string): Promise<any[]> => {
    const inputPayload = {
      search: searchTerm,
      searchType: 'popular',
      searchLimit: limit
    };

    try {
      const response = await fetch(runUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputPayload),
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Apify Instagram search warning for "${searchTerm}" (${response.status}): ${errText}`);
        return [];
      }

      const items: any[] = await response.json();
      if (!Array.isArray(items) || items.length === 0) {
        return [];
      }

      // Filter out placeholder error objects like { error: "no_items" }
      return items.filter((it) => !it.error && (it.shortCode || it.url || it.ownerUsername || it.code));
    } catch (err: any) {
      console.warn(`Apify Instagram query error for "${searchTerm}":`, err.message);
      return [];
    }
  };

  // 1. Try full sanitized keyword
  let validItems = await fetchReelsForSearch(cleanKeyword);

  // 2. If 0 items returned and query is multi-word/has filler words, fallback to core search term
  if (validItems.length === 0) {
    const coreTerm = extractCoreSearchTerm(cleanKeyword);
    if (coreTerm && coreTerm.toLowerCase() !== cleanKeyword.toLowerCase()) {
      validItems = await fetchReelsForSearch(coreTerm);
    }
  }

  if (validItems.length === 0) {
    return [];
  }

  // Filter for video clips / reels
  const reelItems = validItems.filter(
    (it) => it.productType === 'clips' || it.videoPlayCount > 0 || it.videoDuration > 0 || it.type === 'Video'
  );

  const rawReels = reelItems.length > 0 ? reelItems : validItems;

  // 1. First filter: only consider reels reaching the minimum views threshold (in Lakhs or Millions)
  const highViewItems = rawReels.filter((item) => {
    const playCount = item.videoPlayCount || item.videoViewCount || item.viewsCount || item.likesCount * 12 || 0;
    return minViews <= 0 || playCount >= minViews;
  });

  if (highViewItems.length === 0) {
    return [];
  }

  // 2. Collect unique creator usernames to fetch follower counts in one batch
  const usernamesToFetch = Array.from(
    new Set(highViewItems.map((it) => it.ownerUsername).filter(Boolean))
  ) as string[];

  const profilesMap = minFollowers > 0 && usernamesToFetch.length > 0
    ? await getInstagramCreatorProfilesBatch(usernamesToFetch, token)
    : new Map<string, InstagramProfileCacheEntry>();

  const buildCandidatesForWindow = (maxHours: number, windowTag: '48h' | '4d' | '6d'): OutlierCandidate[] => {
    const list: OutlierCandidate[] = [];
    for (const item of highViewItems) {
      const playCount = item.videoPlayCount || item.videoViewCount || item.viewsCount || item.likesCount * 12 || 0;
      const likesCount = item.likesCount || 0;
      const commentsCount = item.commentsCount || 0;
      const caption = item.caption || item.text || '';
      const code = item.shortCode || item.code || extractInstagramShortcode(item.url || '');
      const reelUrl = item.url || (code ? `https://www.instagram.com/reel/${code}/` : '');
      const username = (item.ownerUsername || '').toLowerCase();

      // 3. Creator audience filter: must have followers >= minFollowers
      const profile = profilesMap.get(username);
      const followerCount = profile?.followersCount ?? 0;

      if (minFollowers > 0 && profile && followerCount > 0 && followerCount < minFollowers) {
        continue; // Filter out creators with under 14k followers
      }

      // Time window filter: 48h -> 4d -> 6d cascade
      if (item.timestamp && maxHours > 0) {
        const pubMs = new Date(item.timestamp).getTime();
        if (!isNaN(pubMs)) {
          const ageHours = (Date.now() - pubMs) / (1000 * 60 * 60);
          if (ageHours > maxHours) {
            continue; // Filter out content older than window!
          }
        }
      }

      // In Instagram popular search, reels appear because they popped off.
      // Approximate creator median views: estimate from follower count or play count baseline
      const estimatedMedian = followerCount > 0
        ? Math.max(1000, Math.round(followerCount * 0.15))
        : Math.max(1000, Math.round(playCount * 0.18));

      const viewToFollowerRatio = followerCount > 0
        ? Math.round((playCount / followerCount) * 10) / 10
        : 0;

      // 5. Follower reach filter: default min 3x reach required
      const minFollowerRatio = typeof options.minFollowerRatio === 'number' ? options.minFollowerRatio : 3;
      if (minFollowerRatio > 0 && followerCount > 0 && viewToFollowerRatio < minFollowerRatio) {
        continue; // Skip! Views must be >= minFollowerRatio x follower count to be a true outlier
      }

      const score = calculateOutlierScore({
        viewCount: playCount,
        medianViews: estimatedMedian,
        publishedAt: item.timestamp || new Date().toISOString(),
        likeCount: likesCount,
        commentCount: commentsCount,
        titleOrCaption: caption,
        followerCount: followerCount > 0 ? followerCount : undefined
      });

      const music = item.musicInfo?.song_name
        ? `${item.musicInfo.song_name} - ${item.musicInfo.artist_name || ''}`
        : item.audioUrl
        ? 'Original Audio'
        : undefined;

      list.push({
        id: `ig_${code || Math.random().toString(36).substring(7)}`,
        platform: 'instagram',
        url: reelUrl,
        videoUrl: item.videoUrl || item.video_url || undefined,
        mediaUrls: Array.isArray(item.images) ? item.images : undefined,
        timeWindow: windowTag,
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
          displayName: profile?.fullName || item.ownerFullName || item.ownerUsername || 'Instagram Creator',
          avatarUrl: profile?.avatarUrl,
          medianViews: estimatedMedian,
          subscriberOrFollowerCount: followerCount > 0 ? followerCount : undefined,
          profileUrl: item.ownerUsername ? `https://www.instagram.com/${item.ownerUsername}/` : undefined
        },
        outlierMultiplier: Math.round((playCount / Math.max(estimatedMedian, 100)) * 10) / 10,
        viewToFollowerRatio,
        outlierScore: score.totalScore,
        matchedKeyword: options.keyword,
        whyOutlier: score.whyOutlier,
        musicOrAudio: music,
        formatType: detectReelFormat(caption),
        sopTaxonomy: deriveSOPTaxonomy({
          title: extractFirstLineHook(caption) || `Reel by @${item.ownerUsername || 'creator'}`,
          caption,
          multiplier: Math.round((playCount / Math.max(estimatedMedian, 100)) * 10) / 10,
          formatType: detectReelFormat(caption),
          likeCount: likesCount,
          commentCount: commentsCount,
          viewCount: playCount,
          followerCount,
          viewToFollowerRatio
        })
      });
    }
    return list;
  };

  // Cascading time window logic:
  // 1. Strictly try 48 hours first
  const candidates48h = buildCandidatesForWindow(48, '48h');
  if (candidates48h.length > 0) {
    return candidates48h;
  }

  // 2. If 48 hours window produces 0 matches, scrape 4 days back (96 hours)
  const candidates4d = buildCandidatesForWindow(96, '4d');
  if (candidates4d.length > 0) {
    return candidates4d;
  }

  // 3. If that produces 0 matches, fall back to 6 days back (144 hours)
  return buildCandidatesForWindow(144, '6d');
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
  const profilesMap = item.ownerUsername
    ? await getInstagramCreatorProfilesBatch([item.ownerUsername], token)
    : new Map<string, InstagramProfileCacheEntry>();
  const profile = item.ownerUsername ? profilesMap.get(item.ownerUsername.toLowerCase()) : undefined;
  const followerCount = profile?.followersCount ?? 0;

  const estimatedMedian = followerCount > 0
    ? Math.max(1000, Math.round(followerCount * 0.15))
    : Math.max(1000, Math.round(playCount * 0.2));

  const viewToFollowerRatio = followerCount > 0
    ? Math.round((playCount / followerCount) * 10) / 10
    : 0;

  const score = calculateOutlierScore({
    viewCount: playCount,
    medianViews: estimatedMedian,
    publishedAt: item.timestamp || new Date().toISOString(),
    likeCount: item.likesCount || 0,
    commentCount: item.commentsCount || 0,
    titleOrCaption: caption,
    followerCount: followerCount > 0 ? followerCount : undefined
  });

  return {
    id: `ig_${code}`,
    platform: 'instagram',
    url: cleanUrl,
    videoUrl: item.videoUrl || item.video_url || undefined,
    mediaUrls: Array.isArray(item.images) ? item.images : (item.childPosts ? item.childPosts.map((c: any) => c.displayUrl).filter(Boolean) : undefined),
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
      displayName: profile?.fullName || item.ownerFullName || item.ownerUsername || 'Creator',
      avatarUrl: profile?.avatarUrl,
      medianViews: estimatedMedian,
      subscriberOrFollowerCount: followerCount > 0 ? followerCount : undefined,
      profileUrl: item.ownerUsername ? `https://www.instagram.com/${item.ownerUsername}/` : undefined
    },
    outlierMultiplier: Math.round((playCount / estimatedMedian) * 10) / 10,
    viewToFollowerRatio,
    outlierScore: score.totalScore,
    matchedKeyword: 'direct-url',
    whyOutlier: score.whyOutlier,
    musicOrAudio: item.musicInfo?.song_name || 'Original Audio',
    formatType: detectReelFormat(caption),
    sopTaxonomy: deriveSOPTaxonomy({
      title: extractFirstLineHook(caption) || `Reel by @${item.ownerUsername || 'creator'}`,
      caption,
      multiplier: Math.round((playCount / estimatedMedian) * 10) / 10,
      formatType: detectReelFormat(caption),
      likeCount: item.likesCount || 0,
      commentCount: item.commentsCount || 0,
      viewCount: playCount,
      followerCount,
      viewToFollowerRatio
    })
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
