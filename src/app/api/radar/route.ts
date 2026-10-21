import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_RADAR_KEYWORDS, NICHE_KEYWORD_GROUPS } from '@/keywords';
import { searchYouTubeOutliers } from '@/providers/youtube';
import { searchInstagramOutliers } from '@/providers/instagram';
import { rankOutlierCandidates } from '@/scoring/outlier';
import { 
  getSavedRadarCache, 
  saveRadarCache, 
  getKeywordSearchCache, 
  saveKeywordSearchCache, 
  saveVideoToRegistry 
} from '@/storage';
import { OutlierCandidate } from '@/types';

export const maxDuration = 60; // 60s timeout for radar multi-provider queries
export const dynamic = 'force-dynamic';

export async function GET() {
  const cached = getSavedRadarCache()
    .map((c) => {
      if (typeof c.viewToFollowerRatio !== 'number') {
        const followers = c.creator.subscriberOrFollowerCount || 0;
        c.viewToFollowerRatio = followers > 0 ? Math.round((c.viewCount / followers) * 10) / 10 : 0;
      }
      return c;
    })
    .filter((c) => {
      // True Outlier Rule: Follower reach must be >= 2.5x (filters out big accounts with ordinary views)
      const followers = c.creator?.subscriberOrFollowerCount || 0;
      if (followers > 0) {
        return (c.viewToFollowerRatio ?? 0) >= 2.5;
      }
      return true;
    });
  return NextResponse.json({
    cached,
    defaultKeywords: DEFAULT_RADAR_KEYWORDS,
    keywordGroups: NICHE_KEYWORD_GROUPS
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const keywords: string[] = body.keywords && body.keywords.length > 0 ? body.keywords : [DEFAULT_RADAR_KEYWORDS[0]];
    const platform: string = body.platform || 'all';
    const minMultiplier: number = body.minMultiplier || 0;
    const minViews: number = typeof body.minViews === 'number' ? body.minViews : 100_000;
    const minFollowers: number = typeof body.minFollowers === 'number' ? body.minFollowers : 14_000;
    const minFollowerRatio: number = typeof body.minFollowerRatio === 'number' ? body.minFollowerRatio : 2.5;
    const forceRefresh: boolean = !!body.forceRefresh;

    const candidates: OutlierCandidate[] = [];
    let servedFromCacheCount = 0;

    for (const kw of keywords.slice(0, 4)) {
      // 1. Check keyword cache first if not forced refresh
      if (!forceRefresh) {
        const cachedResults = getKeywordSearchCache(kw, platform, 24); // 24-hour cache
        if (cachedResults && cachedResults.length > 0) {
          const matchingCache = cachedResults.filter((c) => {
            const viewsOk = minViews <= 0 || c.viewCount >= minViews;
            const followersOk = minFollowers <= 0 || (c.creator.subscriberOrFollowerCount || 0) >= minFollowers;
            const ratioOk = minFollowerRatio <= 0 || (c.viewToFollowerRatio || 0) >= minFollowerRatio;
            return viewsOk && followersOk && ratioOk;
          });
          if (matchingCache.length > 0) {
            candidates.push(...matchingCache);
            servedFromCacheCount++;
            continue; // SKIP API CALLS! Saves Apify dollars & YouTube quotas
          }
        }
      }

      // 2. Query YouTube if needed (strictly last 48 hours & >= 2.5x reach)
      const kwCandidates: OutlierCandidate[] = [];
      if (platform === 'all' || platform === 'youtube') {
        try {
          const yt = await searchYouTubeOutliers({
            keyword: kw,
            maxResults: 15,
            publishedAfterDays: 2, // Strictly last 48 hours
            minViews,
            minSubscribers: minFollowers,
            minFollowerRatio
          });
          kwCandidates.push(...yt);
        } catch (err: any) {
          console.error(`YouTube error for "${kw}":`, err.message);
        }
      }

      // 3. Query Instagram (Apify) if needed (strictly last 48 hours & >= 2.5x reach)
      if (platform === 'all' || platform === 'instagram') {
        try {
          const ig = await searchInstagramOutliers({
            keyword: kw,
            searchLimit: 20,
            minViews,
            minFollowers,
            maxAgeHours: 48, // Strictly last 48 hours
            minFollowerRatio
          });
          kwCandidates.push(...ig);
        } catch (err: any) {
          console.error(`Instagram error for "${kw}":`, err.message);
        }
      }

      // Save to keyword cache and master registry
      if (kwCandidates.length > 0) {
        saveKeywordSearchCache(kw, platform, kwCandidates);
        kwCandidates.forEach((c) => saveVideoToRegistry(c));
        candidates.push(...kwCandidates);
      }
    }

    // Deduplicate across keywords
    const seen = new Set<string>();
    const unique = candidates.filter((c) => {
      const key = (c.url || c.id).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let ranked = rankOutlierCandidates(unique);
    if (minMultiplier > 0) {
      ranked = ranked.filter((c) => c.outlierMultiplier >= minMultiplier);
    }
    if (minViews > 0) {
      ranked = ranked.filter((c) => c.viewCount >= minViews);
    }
    if (minFollowers > 0) {
      ranked = ranked.filter((c) => (c.creator.subscriberOrFollowerCount || 0) >= minFollowers);
    }
    if (minFollowerRatio > 0) {
      ranked = ranked.filter((c) => (c.viewToFollowerRatio || 0) >= minFollowerRatio);
    }

    saveRadarCache(ranked);

    return NextResponse.json({
      success: true,
      count: ranked.length,
      candidates: ranked,
      cachedQueriesUsed: servedFromCacheCount
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
