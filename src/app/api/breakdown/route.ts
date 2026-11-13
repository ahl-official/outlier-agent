import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeVideoByUrl } from '@/providers/youtube';
import { getInstagramReelByUrl, InstagramReelTimeoutError } from '@/providers/instagram';
import { analyzeOutlierVideo } from '@/breakdown/analyze';
import { canReuseAnalysis } from '@/breakdown/evidence';
import { getSavedRadarCache, getCachedVideo, saveVideoToRegistry, saveFormatLabels } from '@/storage';
import { OutlierCandidate, DetailedOutlierBreakdown } from '@/types';

export const maxDuration = 300; // Large videos need download, file processing and AI time (Vercel Fluid Compute).
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const analysisDeadline = Date.now() + 280000;
  try {
    const body = await req.json();
    const { url, candidateId, forceRefresh, aiApiKey } = body;

    // 1. Check Master Video Registry for existing breakdown (0 tokens, 0 scraper calls!)
    const targetKey = url || candidateId;
    if (targetKey && !forceRefresh) {
      const cachedEntry = await getCachedVideo(targetKey, 72); // 72-hour TTL
      if (
        cachedEntry &&
        canReuseAnalysis(cachedEntry.breakdown)
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
    if (candidateId && !(forceRefresh && url)) {
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
    const analysis: DetailedOutlierBreakdown = await analyzeOutlierVideo(candidate, {
      aiApiKey: effectiveApiKey,
      analysisTimeoutMs: Math.max(1, Math.min(240000, analysisDeadline - Date.now()))
    });

    // The six-reasons call also tagged Format x Editing Style - keep them for the Format Map
    const sixReasons = analysis.sixReasonsAnalysis;
    if (sixReasons?.format && sixReasons.editingStyle) {
      await saveFormatLabels(candidate, {
        format: sixReasons.format,
        editingStyle: sixReasons.editingStyle,
        source: sixReasons.analyzedWithAudio ? 'video' : 'frames',
        taggedAt: new Date().toISOString()
      });
    }

    // 5. Store in master registry so it never needs to be re-scraped
    await saveVideoToRegistry(candidate, analysis);

    return NextResponse.json({
      success: true,
      candidate,
      analysis,
      fromCache: false
    });
  } catch (error: any) {
    if (error instanceof InstagramReelTimeoutError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 504 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
