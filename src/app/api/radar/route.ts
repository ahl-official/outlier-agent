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
  saveVideosToRegistry
} from '@/storage';
import { OutlierCandidate } from '@/types';

export const maxDuration = 60; // 60s timeout for radar multi-provider queries
export const dynamic = 'force-dynamic';

export async function GET() {
  const raw = await getSavedRadarCache();
  const cached = raw
    .map((c) => {
      if (typeof c.viewToFollowerRatio !== 'number') {
        const followers = c.creator.subscriberOrFollowerCount || 0;
        c.viewToFollowerRatio = followers > 0 ? Math.round((c.viewCount / followers) * 10) / 10 : 0;
      }
      return c;
    })
    .filter((c) => {
      // True Outlier Rule: Follower reach must be >= 3x (filters out big accounts with ordinary views)
      const followers = c.creator?.subscriberOrFollowerCount || 0;
      if (followers > 0) {
        return (c.viewToFollowerRatio ?? 0) >= 3;
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
    const minViews: number = typeof body.minViews === 'number' ? body.minViews : 20_000;
    const minFollowers: number = typeof body.minFollowers === 'number' ? body.minFollowers : 1_000;
    const minFollowerRatio: number = typeof body.minFollowerRatio === 'number' ? body.minFollowerRatio : 3;
    const forceRefresh: boolean = !!body.forceRefresh;

    const candidates: OutlierCandidate[] = [];
    let servedFromCacheCount = 0;

    for (const kw of keywords.slice(0, 4)) {
      // 1. Check keyword cache first if not forced refresh
      if (!forceRefresh) {
        const cachedResults = await getKeywordSearchCache(kw, platform, 24); // 24-hour cache
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

      // 2. Query YouTube & Instagram in parallel to prevent serverless function timeouts
      const kwCandidates: OutlierCandidate[] = [];
      const queries: Promise<OutlierCandidate[]>[] = [];

      if (platform === 'all' || platform === 'youtube') {
        queries.push(
          searchYouTubeOutliers({
            keyword: kw,
            maxResults: 15,
            minViews,
            minSubscribers: minFollowers,
            minFollowerRatio
          }).catch((err: any) => {
            console.error(`YouTube error for "${kw}":`, err.message);
            return [];
          })
        );
      }

      if (platform === 'all' || platform === 'instagram') {
        queries.push(
          searchInstagramOutliers({
            keyword: kw,
            searchLimit: 20,
            minViews,
            minFollowers,
            minFollowerRatio
          }).catch((err: any) => {
            console.error(`Instagram error for "${kw}":`, err.message);
            return [];
          })
        );
      }

      const results = await Promise.allSettled(queries);
      for (const res of results) {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          kwCandidates.push(...res.value);
        }
      }

      // Save to keyword cache and master registry (in parallel - neither blocks the other)
      if (kwCandidates.length > 0) {
        await Promise.all([
          saveKeywordSearchCache(kw, platform, kwCandidates),
          saveVideosToRegistry(kwCandidates.map((c) => ({ candidate: c })))
        ]);
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
    // Followers unresolved (e.g. a profile lookup that timed out) means "unknown", not "zero" —
    // the provider already deliberately skips its own follower/reach checks in that case, so the
    // route must not re-apply them here and strip out otherwise-valid candidates.
    if (minFollowers > 0) {
      ranked = ranked.filter((c) => {
        const followers = c.creator.subscriberOrFollowerCount;
        return followers === undefined || followers >= minFollowers;
      });
    }
    if (minFollowerRatio > 0) {
      ranked = ranked.filter((c) => {
        const followers = c.creator.subscriberOrFollowerCount;
        return followers === undefined || (c.viewToFollowerRatio || 0) >= minFollowerRatio;
      });
    }

    if (ranked.length > 0) {
      await saveRadarCache(ranked);
    }

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
