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

export async function GET() {
  const cached = getSavedRadarCache();
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
    const forceRefresh: boolean = !!body.forceRefresh;

    const candidates: OutlierCandidate[] = [];
    let servedFromCacheCount = 0;

    for (const kw of keywords.slice(0, 4)) {
      // 1. Check keyword cache first if not forced refresh
      if (!forceRefresh) {
        const cachedResults = getKeywordSearchCache(kw, platform, 24); // 24-hour cache
        if (cachedResults && cachedResults.length > 0) {
          candidates.push(...cachedResults);
          servedFromCacheCount++;
          continue; // SKIP API CALLS! Saves Apify dollars & YouTube quotas
        }
      }

      // 2. Query YouTube if needed
      const kwCandidates: OutlierCandidate[] = [];
      if (platform === 'all' || platform === 'youtube') {
        try {
          const yt = await searchYouTubeOutliers({
            keyword: kw,
            maxResults: 6,
            publishedAfterDays: 14
          });
          kwCandidates.push(...yt);
        } catch (err: any) {
          console.error(`YouTube error for "${kw}":`, err.message);
        }
      }

      // 3. Query Instagram (Apify) if needed
      if (platform === 'all' || platform === 'instagram') {
        try {
          const ig = await searchInstagramOutliers({
            keyword: kw,
            searchLimit: 8
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
