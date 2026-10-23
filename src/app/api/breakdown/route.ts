import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeVideoByUrl } from '@/providers/youtube';
import { getInstagramReelByUrl } from '@/providers/instagram';
import { analyzeOutlierVideo } from '@/breakdown/analyze';
import { getSavedRadarCache, getCachedVideo, saveVideoToRegistry } from '@/storage';
import { OutlierCandidate, DetailedOutlierBreakdown } from '@/types';

export const maxDuration = 60; // 60s timeout for video frame extraction & AI analysis
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, candidateId, forceRefresh, aiApiKey } = body;

    // 1. Check Master Video Registry for existing breakdown (0 tokens, 0 scraper calls!)
    const targetKey = url || candidateId;
    if (targetKey && !forceRefresh && !aiApiKey) {
      const cachedEntry = await getCachedVideo(targetKey, 72); // 72-hour TTL
      if (
        cachedEntry &&
        cachedEntry.breakdown &&
        cachedEntry.breakdown.deepVisualAnalysis &&
        cachedEntry.breakdown.aiAgentAudit?.extractedFrames &&
        cachedEntry.breakdown.aiAgentAudit.extractedFrames.length >= 4
      ) {
        return NextResponse.json({
          success: true,
          candidate: cachedEntry.candidate,
          analysis: cachedEntry.breakdown,
          fromCache: true
        });
      }
    }

    let candidate: OutlierCandidate | null = null;

    // 2. Check radar cache or master registry
    if (candidateId) {
      const cached = await getSavedRadarCache();
      const found = cached.find((c) => c.id === candidateId || c.url === candidateId);
      if (found) {
        candidate = found;
      } else {
        const regEntry = await getCachedVideo(candidateId);
        if (regEntry) candidate = regEntry.candidate;
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

    // 4. Generate dynamic breakdown with frame-by-frame and strategist analysis
    const effectiveApiKey = (aiApiKey && String(aiApiKey).trim()) || process.env.GEMINI_API_KEY;
    const analysis: DetailedOutlierBreakdown = await analyzeOutlierVideo(candidate, { aiApiKey: effectiveApiKey });

    // 5. Store in master registry so it never needs to be re-scraped
    await saveVideoToRegistry(candidate, analysis);

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
