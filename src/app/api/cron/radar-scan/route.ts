import { NextRequest, NextResponse } from 'next/server';
import { searchYouTubeOutliers } from '@/providers/youtube';
import { searchInstagramOutliers } from '@/providers/instagram';
import { rankOutlierCandidates } from '@/scoring/outlier';
import { getActiveKeywords, upsertRadarCache, saveKeywordSearchCache, saveVideosToRegistry } from '@/storage';
import { OutlierCandidate } from '@/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Scheduled background scan (Vercel Cron). Runs exactly one keyword per invocation - a single
 * keyword's YouTube+Instagram scan already measured up to ~50s (Instagram's profile lookups are
 * the slow part), so two keywords in one run reliably exceeds the 60s serverless limit. Rotates
 * through the active brand's keyword list across runs (one per day, matching vercel.json - the
 * Hobby plan caps cron frequency at once/day) so the full list gets covered over time. Results
 * are upserted into radar_cache so the page's default view is backed by a recent background
 * scan instead of a live query on page load.
 *
 * Protected by Vercel's built-in CRON_SECRET check: when a CRON_SECRET env var is set, Vercel
 * Cron automatically sends it as `Authorization: Bearer <CRON_SECRET>`, and any other caller
 * without that header is rejected.
 */
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const keywords = await getActiveKeywords();
    if (keywords.length === 0) {
      return NextResponse.json({ success: true, scanned: [], found: 0 });
    }

    // Rotate through the keyword list: pick an index based on wall-clock time so consecutive
    // cron runs naturally advance instead of re-scanning the same keyword every time.
    const windowMs = 1000 * 60 * 60 * 24; // matches the once-daily cron cadence in vercel.json
    const startIdx = Math.floor(Date.now() / windowMs) % keywords.length;
    const batch = [keywords[startIdx]].filter(Boolean);

    const allCandidates: OutlierCandidate[] = [];
    const scanned: string[] = [];

    for (const kw of batch) {
      scanned.push(kw);
      const [ytResult, igResult] = await Promise.allSettled([
        searchYouTubeOutliers({ keyword: kw, maxResults: 15 }),
        searchInstagramOutliers({ keyword: kw, searchLimit: 20 })
      ]);

      const kwCandidates: OutlierCandidate[] = [];
      if (ytResult.status === 'fulfilled') kwCandidates.push(...ytResult.value);
      else console.error(`[Cron] YouTube error for "${kw}":`, ytResult.reason?.message);

      if (igResult.status === 'fulfilled') kwCandidates.push(...igResult.value);
      else console.error(`[Cron] Instagram error for "${kw}":`, igResult.reason?.message);

      if (kwCandidates.length > 0) {
        await Promise.all([
          saveKeywordSearchCache(kw, 'all', kwCandidates),
          saveVideosToRegistry(kwCandidates.map((c) => ({ candidate: c })))
        ]);
        allCandidates.push(...kwCandidates);
      }
    }

    const ranked = rankOutlierCandidates(allCandidates);
    await upsertRadarCache(ranked);

    return NextResponse.json({ success: true, scanned, found: ranked.length });
  } catch (error: any) {
    console.error('[Cron] radar-scan failed:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
