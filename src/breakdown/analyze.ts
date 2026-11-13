import { OutlierCandidate, DetailedOutlierBreakdown, RealComment, AIAgentAudit, SixReasonsAnalysis, AnalysisDiagnostic } from '../types';
import { getYouTubeVideoComments, extractYouTubeVideoId, decodeHtmlEntities } from '../providers/youtube';
import { downloadVideoForGemini, extractFramesWithFfmpeg } from './ffmpeg';
import { unavailableAudit } from './social-agent';
import { generateSixReasonsAnalysis } from './hook-analysis';
import { ANALYSIS_VERSION, actualVideoFrames, uniqueFrames } from './evidence';

export interface BreakdownOptions { aiApiKey?: string; analysisTimeoutMs?: number; }

/** Metrics come from provider data. Creative observations require actual model/media evidence. */
export async function analyzeOutlierVideo(candidate: OutlierCandidate, options?: BreakdownOptions): Promise<DetailedOutlierBreakdown> {
  const title = decodeHtmlEntities(candidate.title || '');
  const caption = decodeHtmlEntities(candidate.caption || '');
  const daysActive = Math.max(1, Math.round((Date.now() - Date.parse(candidate.publishedAt)) / 8640000) / 10 || 1);
  const velocityViewsPerDay = Math.round(candidate.viewCount / daysActive);
  const engagementRate = candidate.viewCount > 0 ? Math.round((candidate.likeCount + candidate.commentCount) / candidate.viewCount * 1000) / 10 : 0;
  const commentRate = candidate.viewCount > 0 ? Math.round(candidate.commentCount / candidate.viewCount * 1000) / 10 : 0;
  const mult = candidate.outlierMultiplier;
  const viralityTier: DetailedOutlierBreakdown['metrics']['viralityTier'] = mult >= 10 ? 'Mega Outlier (>10x)' : mult >= 5 ? 'Breakout Outlier (5x-10x)' : mult >= 2 ? 'Strong Performer (2x-5x)' : 'Baseline Performer (<2x)';
  const videoId = candidate.platform === 'youtube' ? extractYouTubeVideoId(candidate.url) : null;
  const commentsPromise = videoId ? getYouTubeVideoComments(videoId, 10).catch(() => []) : Promise.resolve([] as RealComment[]);
  const key = options?.aiApiKey || process.env.GEMINI_API_KEY;
  const diagnostics: AnalysisDiagnostic[] = [];
  const videoPromise = candidate.platform === 'instagram' && (key || process.env.OPENROUTER_API_KEY)
    ? downloadVideoForGemini(candidate.url, candidate.videoUrl, undefined, undefined, diagnostics).catch(() => null) : undefined;
  const framesPromise = extractFramesWithFfmpeg(candidate.url, candidate.thumbnailUrl, candidate.id, { maxFrames: 6, timeoutMs: 75000 }, candidate.videoUrl, candidate.mediaUrls, videoPromise).catch(() => []);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sixReasons: SixReasonsAnalysis | null;
  try {
    sixReasons = await Promise.race([
      generateSixReasonsAnalysis(candidate, framesPromise, key, videoPromise, diagnostics).catch(() => {
        diagnostics.push({ provider: 'analysis', code: 'request_failed', message: 'Analysis stopped unexpectedly before producing a report.' });
        return null;
      }),
      new Promise<null>(resolve => { timer = setTimeout(() => {
        diagnostics.push({ provider: 'analysis', code: 'timeout', message: 'The analysis time limit was reached.' });
        resolve(null);
      }, options?.analysisTimeoutMs ?? 240000); })
    ]);
  } finally { if (timer) clearTimeout(timer); }
  const [frames, realComments] = await Promise.all([framesPromise, commentsPromise]);
  const samples = actualVideoFrames(frames);
  // Reuse the actual video analysis instead of paying for a second, conflicting frame verdict.
  // Missing model output records a limitation instead of a template verdict.
  const audit: AIAgentAudit = sixReasons ? {
    status: 'ai_analyzed',
    evidenceSource: sixReasons.analyzedWithAudio ? 'video' : 'frames',
    agentModel: sixReasons.modelUsed,
    limitation: sixReasons.analyzedWithAudio
      ? (samples.length ? 'AI received the video. Images below are distinct samples from the file; audience retention was not measured.' : 'AI received the video, but timeline images could not be extracted. The cover below is only a preview, not a sampled moment.')
      : 'AI received sampled video frames only. Audio and actions between samples could not be verified.',
    framesExtractedCount: samples.length,
    extractedFrames: uniqueFrames(frames),
    winningElement: sixReasons.sixReasons[0].heading,
    theOneOutlierThing: sixReasons.sixReasons[0].paragraph,
    rawInsights: sixReasons.closingLesson,
    timestamp: new Date().toISOString()
  } : unavailableAudit(frames, samples.length ? 'Video samples were extracted, but AI analysis did not complete. No creative verdict is available.' : 'The actual video could not be analyzed. A cover image cannot verify its scenes, timing or audio. Try again to request a new analysis.');
  audit.diagnostics = [...diagnostics];

  return {
    analysisVersion: ANALYSIS_VERSION,
    id: `breakdown_${candidate.id}_${Date.now()}`,
    candidateId: candidate.id,
    candidateUrl: candidate.url,
    platform: candidate.platform,
    title, caption, thumbnailUrl: candidate.thumbnailUrl,
    durationSeconds: candidate.durationSeconds,
    publishedAt: candidate.publishedAt,
    daysActive,
    creator: {
      id: candidate.creator.id, username: candidate.creator.username, displayName: candidate.creator.displayName,
      avatarUrl: candidate.creator.avatarUrl, profileUrl: candidate.creator.profileUrl,
      subscribersOrFollowers: candidate.creator.subscriberOrFollowerCount,
      medianViews: candidate.creator.medianViews, recentUploads: candidate.creator.recentUploads
    },
    metrics: { viewCount: candidate.viewCount, likeCount: candidate.likeCount, commentCount: candidate.commentCount, outlierMultiplier: mult, engagementRatePercent: engagementRate, commentRatePercent: commentRate, velocityViewsPerDay, viralityTier },
    contentAnalysis: {
      coreTopic: sixReasons?.reelCategory || 'Video content not verified',
      hookHeadline: sixReasons?.firstSixSeconds.textHook || 'Opening text not verified',
      hookMechanism: sixReasons?.firstSixSeconds.visualHook || 'Visual hook not verified',
      formatType: sixReasons?.reelCategory || 'Not verified',
      extractedHashtags: Array.from(new Set(caption.match(new RegExp('#[\\p{L}\\p{N}_]+', 'gu')) || [])),
      audioOrMusicTrack: candidate.musicOrAudio || 'Audio metadata unavailable',
      keyAnglesCovered: sixReasons?.sixReasons.map(reason => reason.heading) || []
    },
    audienceVoice: { realComments, inquiryThemes: commentThemes(realComments) },
    whyOutlierDiagnosis: {
      primaryDriver: `${candidate.viewCount.toLocaleString()} reported views compared with a creator baseline of ${candidate.creator.medianViews.toLocaleString()} (${mult}x). This ratio does not establish why viewers watched.`,
      retentionHookReason: 'Viewer retention and completion data were not supplied by the platform.',
      engagementTrigger: `${candidate.likeCount.toLocaleString()} reported likes and ${candidate.commentCount.toLocaleString()} comments (${engagementRate}% combined engagement).`,
      algorithmSignal: `Average ${velocityViewsPerDay.toLocaleString()} views per day since publication. Recommendation, replay and watch-time analytics are unavailable.`
    },
    // Legacy template camera/sound timelines and synthetic viral scores are deliberately absent.
    aiAgentAudit: audit,
    sixReasonsAnalysis: sixReasons || undefined,
    createdAt: new Date().toISOString()
  };
}

function commentThemes(comments: RealComment[]): DetailedOutlierBreakdown['audienceVoice']['inquiryThemes'] {
  return comments.flatMap(comment => {
    const text = comment.text.toLowerCase();
    const category = /price|cost|kitne/.test(text) ? 'Pricing question' : /natural|fake|hairline/.test(text) ? 'Appearance discussion' : null;
    return category ? [{ category, sampleText: `${comment.text} — ${comment.author}`, sentiment: 'question' as const }] : [];
  }).slice(0, 4);
}
