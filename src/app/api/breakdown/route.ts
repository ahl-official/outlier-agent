import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeVideoByUrl } from '@/providers/youtube';
import { getInstagramReelByUrl } from '@/providers/instagram';
import { analyzeOutlierVideo } from '@/breakdown/analyze';
import { getSavedRadarCache, getCachedVideo, saveVideoToRegistry } from '@/storage';
import { OutlierCandidate, DetailedOutlierBreakdown } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, candidateId, forceRefresh } = body;

    // 1. Check Master Video Registry for existing breakdown (0 tokens, 0 scraper calls!)
    const targetKey = url || candidateId;
    if (targetKey && !forceRefresh) {
      const cachedEntry = getCachedVideo(targetKey, 72); // 72-hour TTL
      if (cachedEntry && cachedEntry.breakdown) {
        return NextResponse.json({
          success: true,
          candidate: cachedEntry.candidate,
          analysis: cachedEntry.breakdown,
          fromCache: true
        });
      }
    }

    let candidate: OutlierCandidate | null = null;

    // 2. Check radar cache
    if (candidateId) {
      const cached = getSavedRadarCache();
      const found = cached.find((c) => c.id === candidateId || c.url === candidateId);
      if (found) {
        candidate = found;
      }
    }

    // 3. If direct URL
    if (!candidate && url) {
      const trimmedUrl = url.trim();
      if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
        candidate = await getYouTubeVideoByUrl(trimmedUrl);
      } else if (trimmedUrl.includes('instagram.com')) {
        candidate = await getInstagramReelByUrl(trimmedUrl);
      } else {
        return NextResponse.json(
          { success: false, error: 'Unsupported URL format. Please provide a YouTube or Instagram Reel URL.' },
          { status: 400 }
        );
      }
    }

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: 'Could not resolve video details for breakdown.' },
        { status: 404 }
      );
    }

    // 4. Generate dynamic breakdown
    const analysis: DetailedOutlierBreakdown = await analyzeOutlierVideo(candidate);

    // 5. Store in master registry so it never needs to be re-scraped
    saveVideoToRegistry(candidate, analysis);

    return NextResponse.json({
      success: true,
      candidate,
      analysis,
      fromCache: false
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
