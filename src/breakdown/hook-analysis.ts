import { OutlierCandidate, ExtractedVideoFrame, SixReasonsAnalysis, AnalysisDiagnostic } from '../types';
import { downloadVideoForGemini, prepareOpenRouterVideo } from './ffmpeg';
import { actualVideoFrames, FINDING_WORD_LIMIT, hasConciseFindings } from './evidence';
import { prepareGeminiVideo, type PreparedVideo, type VideoMedia } from './gemini-video';
import { taxonomyPromptBlock, normalizeFormatKey, normalizeEditingStyleKey } from '../scoring/format-taxonomy';

/**
 * System prompt condensed from the "Outlier Reel Analysis" spec: analyze the actual reel
 * (not generic claims), give exactly 6 reasons it worked with what/why/adapt for each, and a
 * separate first-6-seconds text/visual/audio hook breakdown. No hashtags or trend commentary
 * as standalone reasons, no invented dialogue, no forcing every reel into the same template.
 */
export const SIX_REASONS_SYSTEM_PROMPT = `You are an experienced Social Media Manager and Content Strategist analyzing a reference reel to understand what makes it effective.

Do not simply describe the video or list generic factors such as "good hook" or "engaging content." Analyze the actual creative execution, storytelling, communication style, audience psychology, and content structure.

Write exactly six distinct findings for an executive reader. Each finding is one sentence of at most ${FINDING_WORD_LIMIT} words, with a short label in the heading field. Tie a specific detail in this clip to a practical decision we can use: what to film, show, say, or edit and why that choice helps the viewer. Lead with the strongest finding.

Choose the six angles from the evidence in this clip and vary the angles, labels and sentence openings across videos. If a finding could be pasted into another video's report without changing the details, rewrite it using an observable detail such as the object shown, the exact action, or the order of shots. Avoid repeating the opening hook in multiple findings. Do not invent evidence to fill a category.

No retention, watch-time, completion-rate or algorithm analytics have been provided; never invent those metrics. A possible creative explanation is not a proven cause of virality. For still-frame inputs, timestamps identify only sampled instants; unobserved speech, text or transitions must be described as unknown.

Base the analysis only on what is actually observable in the provided video/frames and caption. Do not invent dialogue, visuals, or audience reactions that are not actually present. Clearly distinguish between what is observed and what is a possible explanation for performance.

Different reels succeed for different reasons - a testimonial depends on speaker credibility and emotional storytelling; a transformation reel relies on visual contrast and reveal timing; an educational reel on challenging a misconception; a comparison reel on presenting two distinct outcomes. Identify the actual format and analyze what makes THAT format work here. Do not apply the same six explanations to every reel.

Do not include hashtags or music-trend commentary as standalone reasons unless directly relevant to the creative concept. Do not force a strong CTA, fast speaking, trending audio, or frequent cuts into the analysis if they aren't actually present or relevant.

Respond in strict JSON with this exact shape:
{
  "reelCategory": "short label, e.g. 'Topper transformation' or 'Testimonial'",
  "firstSixSeconds": {
    "textHook": "the exact on-screen text/caption shown in the first 6 seconds, or 'None' if there isn't any",
    "visualHook": "what is visually shown in the first 6 seconds",
    "audioHook": "what is said or heard in the first 6 seconds - if you cannot determine this from what was provided, say so plainly rather than inventing it"
  },
  "sixReasons": [
    { "heading": "short descriptive label tied to the clip", "paragraph": "one sentence connecting an observed choice to a concrete strategy for our next video" }
    // exactly 6 of these
  ],
  "creativeAdaptation": "concise, practical creative direction for how we could adapt the strongest learning into an original reel for this category - the principle, not a copy of the script",
  "closingLesson": "one short paragraph: the single most valuable creative lesson and how it could inspire a new original idea",
  "format": "exactly one FORMAT key from the list below",
  "editingStyle": "exactly one EDITING STYLE key from the list below"
}

${taxonomyPromptBlock()}`;

/**
 * Generates the simple "6 reasons it worked" + first-6-seconds hook breakdown.
 * Prefers feeding Gemini the actual video (with audio) so the audio hook is genuinely observed,
 * not inferred. OpenRouter receives the actual video when Gemini fails, with a separate
 * video-capable model. A final image-model fallback uses only genuine timestamped samples
 * and is flagged `analyzedWithAudio: false`.
 */
export async function generateSixReasonsAnalysis(
  candidate: OutlierCandidate,
  framesSource: ExtractedVideoFrame[] | Promise<ExtractedVideoFrame[]>,
  apiKey?: string,
  videoSource?: Promise<VideoMedia | null>,
  diagnostics: AnalysisDiagnostic[] = []
): Promise<SixReasonsAnalysis | null> {
  const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY;
  const hasGeminiKey = !!effectiveApiKey && effectiveApiKey.trim().length >= 10;

  // The caller shares a single download with the concurrent frame-extraction pipeline.
  const youtubeLink = candidate.platform === 'youtube' ? candidate.url : null;
  // Download once and share the same bytes with both providers. OpenRouter video input
  // works even on serverless hosts without FFmpeg/ffprobe.
  const video = !youtubeLink && (hasGeminiKey || process.env.OPENROUTER_API_KEY)
    ? await (videoSource || downloadVideoForGemini(candidate.url, candidate.videoUrl)).catch(() => null) : null;
  const hasVideo = !!(video || youtubeLink);

  const userContext = `Reel URL: ${candidate.url}
Platform: ${candidate.platform}
Caption: "${candidate.caption || ''}"
Views: ${candidate.viewCount.toLocaleString()} | Creator median: ${candidate.creator.medianViews.toLocaleString()} (${candidate.outlierMultiplier}x outlier)
Engagement: ${candidate.likeCount.toLocaleString()} likes, ${candidate.commentCount.toLocaleString()} comments
Audio/music metadata: "${candidate.musicOrAudio || 'Unknown'}"
Evidence instructions are supplied with the attached media. Music metadata alone does not verify audible sound.`;

  const fallback = () => callOpenRouterFallback(userContext, framesSource, video, youtubeLink, diagnostics);

  if (!hasGeminiKey) {
    recordDiagnostic(diagnostics, 'gemini', 'missing_key', 'Gemini API key is not configured.');
    return fallback();
  }

  const parts: any[] = [];
  let prepared: PreparedVideo | undefined;
  if (youtubeLink) {
    parts.push({ fileData: { fileUri: youtubeLink } });
  } else if (video) {
    try {
      prepared = await prepareGeminiVideo(video, effectiveApiKey!.trim());
      parts.push(prepared.part);
    } catch (error: any) {
      recordDiagnostic(diagnostics, 'gemini', 'upload_failed', 'Gemini video upload or processing failed; trying OpenRouter.');
      return fallback();
    }
  } else {
    const frames = actualVideoFrames(await framesSource);
    if (frames.length < 2) {
      recordDiagnostic(diagnostics, 'media', 'video_unavailable', 'The video could not be downloaded and fewer than two actual video samples are available.');
      return fallback();
    }
    for (const frame of frames) {
      const base64Data = frame.dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      if (base64Data && base64Data.length > 50) {
        parts.push({ text: `Video sample ${frame.index} at ${frame.timestamp}` });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
      }
    }
  }
  parts.push({ text: `${userContext}\n${hasVideo ? VIDEO_INSTRUCTIONS : FRAME_INSTRUCTIONS}` });

  // gemini-2.5-flash-lite tried first: confirmed fast and reliable for video+audio input in
  // testing. gemini-1.5-flash and gemini-2.0-flash are dropped - both confirmed 404
  // (deprecated/unavailable on this API version; Google's own error for 2.0-flash points to
  // gemini-3.8-flash as the replacement), and retrying a dead model on every call wastes budget.
  const modelsToTry = ['gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveApiKey.trim()}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SIX_REASONS_SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.6, responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(hasVideo ? 30000 : 12000)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({} as any));
        recordHttpFailure(diagnostics, 'gemini', res.status);
        // Switch providers promptly on quota/auth errors. A 429 can be a rate or quota limit.
        if ([429, 401, 403].includes(res.status)) break;
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          if (errData.error?.status === 'INVALID_ARGUMENT') break;
        }
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        recordDiagnostic(diagnostics, 'gemini', 'empty_response', 'Gemini returned no analysis text.');
        continue;
      }

      const parsed = JSON.parse(rawText);
      if (!isValidAnalysis(parsed)) {
        recordDiagnostic(diagnostics, 'gemini', 'invalid_response', 'Gemini returned an incomplete analysis.');
        continue;
      }

      await prepared?.cleanup();
      return parsedResponseToAnalysis(parsed, `Gemini (${model})${hasVideo ? ' + video' : ' + sampled frames only'}`, hasVideo);
    } catch (err: any) {
      recordDiagnostic(diagnostics, 'gemini', err?.name === 'TimeoutError' || err?.name === 'AbortError' ? 'timeout' : 'request_failed', 'Gemini request timed out, failed or returned invalid JSON.');
    }
  }
  console.warn('[SixReasons] All Gemini models failed or returned nothing usable - trying OpenRouter fallback.');
  await prepared?.cleanup();

  return fallback();
}

const VIDEO_INSTRUCTIONS = 'The actual video is attached. Watch it directly. Describe audio only if it is audible; otherwise say it could not be verified.';
const FRAME_INSTRUCTIONS = 'Only the timestamped video samples below are attached. No video/audio file is available on this path. Do not invent dialogue, sounds or actions between samples. Audio cannot be verified.';

function recordDiagnostic(diagnostics: AnalysisDiagnostic[], provider: AnalysisDiagnostic['provider'], code: string, message: string, httpStatus?: number) {
  diagnostics.push({ provider, code, message, ...(httpStatus ? { httpStatus } : {}) });
  // Never log provider bodies, API keys, signed media URLs or base64 content.
  console.warn(`[SixReasons] ${provider}: ${code}${httpStatus ? ` (${httpStatus})` : ''}`);
}

function recordHttpFailure(diagnostics: AnalysisDiagnostic[], provider: 'gemini' | 'openrouter', status: number) {
  const name = provider === 'gemini' ? 'Gemini' : 'OpenRouter';
  const [code, message] = status === 429 ? ['rate_limit', `${name} rate or quota limit reached.`]
    : status === 402 ? ['credits_exhausted', `${name} credits or spending allowance are insufficient.`]
    : status === 401 || status === 403 ? ['authentication', `${name} API key or permissions were rejected.`]
    : ['http_error', `${name} could not process the analysis request.`];
  recordDiagnostic(diagnostics, provider, code, message, status);
}

function isValidAnalysis(parsed: any): boolean {
  return typeof parsed?.reelCategory === 'string' &&
    typeof parsed.creativeAdaptation === 'string' && typeof parsed.closingLesson === 'string' &&
    ['textHook', 'visualHook', 'audioHook'].every(key => typeof parsed.firstSixSeconds?.[key] === 'string') &&
    hasConciseFindings(parsed.sixReasons);
}

function parsedResponseToAnalysis(parsed: any, modelUsed: string, analyzedWithAudio: boolean): SixReasonsAnalysis {
  return {
    reelCategory: parsed.reelCategory || 'Hair System Reel',
    firstSixSeconds: {
      textHook: parsed.firstSixSeconds?.textHook || 'Not determinable from available data',
      visualHook: parsed.firstSixSeconds?.visualHook || 'Not determinable from available data',
      audioHook: analyzedWithAudio ? parsed.firstSixSeconds.audioHook : 'Audio was not available; the audio hook could not be verified.'
    },
    sixReasons: parsed.sixReasons.slice(0, 6).map((r: any) => ({
      heading: r.heading.trim(),
      paragraph: r.paragraph.trim()
    })),
    creativeAdaptation: parsed.creativeAdaptation || '',
    closingLesson: parsed.closingLesson || '',
    format: normalizeFormatKey(parsed.format) ?? undefined,
    editingStyle: normalizeEditingStyleKey(parsed.editingStyle) ?? undefined,
    analyzedWithAudio,
    modelUsed
  };
}

async function callOpenRouterFallback(
  userContext: string,
  framesSource: ExtractedVideoFrame[] | Promise<ExtractedVideoFrame[]>,
  video: VideoMedia | null,
  youtubeLink: string | null,
  diagnostics: AnalysisDiagnostic[]
): Promise<SixReasonsAnalysis | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim().length < 10) {
    recordDiagnostic(diagnostics, 'openrouter', 'missing_key', 'OpenRouter fallback API key is not configured.');
    return null;
  }

  // GPT-4o mini accepts images, not videos. Use a separate video-capable model;
  // its OpenRouter requests use OpenRouter credentials/billing, not the direct Gemini key.
  if (video || youtubeLink) {
    const model = process.env.OPENROUTER_VIDEO_MODEL || 'google/gemini-2.5-flash-lite';
    const prepared = video ? await prepareOpenRouterVideo(video, diagnostics) : null;
    const mediaUrl = prepared ? `data:${prepared.mimeType};base64,${prepared.buffer.toString('base64')}` : youtubeLink;
    const result = mediaUrl ? await requestOpenRouter([
      { type: 'text', text: `${userContext}\n${VIDEO_INSTRUCTIONS}` },
      { type: 'video_url', video_url: { url: mediaUrl } }
    ], model, apiKey, true, diagnostics) : { analysis: null };
    if (result.analysis) return result.analysis;
    // Repeating an auth/credit/quota failure with the same key cannot help.
    if (result.stop) return null;
  }

  const frames = actualVideoFrames(await framesSource);
  if (frames.length < 2) {
    recordDiagnostic(diagnostics, 'media', 'insufficient_samples', 'Frame fallback needs at least two distinct video samples. A cover image cannot substitute for video.');
    return null;
  }
  const content: any[] = [{ type: 'text', text: `${userContext}\n${FRAME_INSTRUCTIONS}` }];
  for (const frame of frames.slice(0, 6)) {
    content.push({ type: 'text', text: `Video sample ${frame.index} at ${frame.timestamp}` });
    content.push({ type: 'image_url', image_url: { url: frame.dataUrl } });
  }
  return (await requestOpenRouter(content, process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini', apiKey, false, diagnostics)).analysis;
}

async function requestOpenRouter(content: any[], model: string, apiKey: string, withVideo: boolean, diagnostics: AnalysisDiagnostic[]): Promise<{ analysis: SixReasonsAnalysis | null; stop?: boolean }> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': 'https://outlier-agent.local',
        'X-Title': 'Outlier Agent'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SIX_REASONS_SYSTEM_PROMPT },
          { role: 'user', content }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6
      }),
      signal: AbortSignal.timeout(withVideo ? 45000 : 25000)
    });

    if (!res.ok) {
      await res.body?.cancel();
      recordHttpFailure(diagnostics, 'openrouter', res.status);
      return { analysis: null, stop: [401, 402, 403, 429].includes(res.status) };
    }

    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) {
      recordDiagnostic(diagnostics, 'openrouter', 'empty_response', 'OpenRouter returned no analysis text.');
      return { analysis: null };
    }

    const parsed = JSON.parse(rawText);
    if (!isValidAnalysis(parsed)) {
      recordDiagnostic(diagnostics, 'openrouter', 'invalid_response', 'OpenRouter returned an incomplete analysis.');
      return { analysis: null };
    }

    return { analysis: parsedResponseToAnalysis(parsed, `OpenRouter (${model}) + ${withVideo ? 'video' : 'sampled frames only'}`, withVideo) };
  } catch (err: any) {
    recordDiagnostic(diagnostics, 'openrouter', err?.name === 'TimeoutError' || err?.name === 'AbortError' ? 'timeout' : 'request_failed', 'OpenRouter request timed out, failed or returned invalid JSON.');
    return { analysis: null };
  }
}
