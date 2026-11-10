import { OutlierCandidate, ExtractedVideoFrame, SixReasonsAnalysis } from '../types';
import { downloadVideoForGemini } from './ffmpeg';
import { actualVideoFrames } from './evidence';
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

For each of the 6 reasons, explain in one natural paragraph: what the creator did, why that creative decision may work for the audience, and what we can learn or adapt for our own content (American Hairline for men's hair systems, or Alchemane for women's hair toppers/extensions/wigs).

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
    { "heading": "short descriptive heading", "paragraph": "what/why/adapt paragraph" }
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
 * not inferred. Falls back to frames + caption only when no video file is available (e.g.
 * YouTube on a serverless deploy with no yt-dlp) - in that case the prompt itself instructs the
 * model not to invent dialogue, and the result is flagged `analyzedWithAudio: false`.
 */
export async function generateSixReasonsAnalysis(
  candidate: OutlierCandidate,
  framesSource: ExtractedVideoFrame[] | Promise<ExtractedVideoFrame[]>,
  apiKey?: string,
  videoSource?: Promise<VideoMedia | null>
): Promise<SixReasonsAnalysis | null> {
  const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY;
  const hasGeminiKey = !!effectiveApiKey && effectiveApiKey.trim().length >= 10;

  // Runs concurrently with frame extraction (not after it) - the video download here is
  // independent of FFmpeg's own frame-extraction pipeline, so when it succeeds (the common
  // Instagram case) this never needs to wait on frame extraction at all. `framesSource` is only
  // actually awaited below, in the no-video fallback branch.
  const youtubeLink = hasGeminiKey && candidate.platform === 'youtube' ? candidate.url : null;
  const video = hasGeminiKey && !youtubeLink ? await (videoSource || downloadVideoForGemini(candidate.url, candidate.videoUrl)).catch(() => null) : null;
  const hasVideo = !!(video || youtubeLink);

  const userContext = `Reel URL: ${candidate.url}
Platform: ${candidate.platform}
Caption: "${candidate.caption || ''}"
Views: ${candidate.viewCount.toLocaleString()} | Creator median: ${candidate.creator.medianViews.toLocaleString()} (${candidate.outlierMultiplier}x outlier)
Engagement: ${candidate.likeCount.toLocaleString()} likes, ${candidate.commentCount.toLocaleString()} comments
Audio/music metadata: "${candidate.musicOrAudio || 'Unknown'}"
${hasVideo ? 'The actual video is attached as a file or YouTube link - watch it directly. Describe audio only if it is audible.' : 'No video/audio file is available - only the static frames below and the caption text. Do not invent spoken dialogue; say the audio hook cannot be determined if you cannot verify it from what is provided.'}`;

  if (!hasGeminiKey) {
    return callOpenRouterFallback(userContext, framesSource);
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
      console.warn(`[SixReasons] ${error.message}`);
      return callOpenRouterFallback(userContext, framesSource);
    }
  } else {
    const frames = actualVideoFrames(await framesSource);
    if (frames.length < 2) return null;
    for (const frame of frames) {
      const base64Data = frame.dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      if (base64Data && base64Data.length > 50) {
        parts.push({ text: `Video sample ${frame.index} at ${frame.timestamp}` });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
      }
    }
  }
  parts.push({ text: userContext });

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
        console.warn(`[SixReasons] ${model} returned ${res.status}: ${errData.error?.message || errData.error?.status || 'unknown error'}`);
        // 429 on a free-tier key means the whole key is exhausted for the day, not just this
        // model - trying the other 2 models would just burn time on guaranteed failures.
        if (res.status === 429) break;
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          if (errData.error?.status === 'INVALID_ARGUMENT') break;
        }
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        console.warn(`[SixReasons] ${model} returned no text. finishReason: ${data.candidates?.[0]?.finishReason || 'unknown'}`);
        continue;
      }

      const parsed = JSON.parse(rawText);
      if (!isValidAnalysis(parsed)) {
        console.warn(`[SixReasons] ${model} returned invalid sixReasons shape`);
        continue;
      }

      await prepared?.cleanup();
      return parsedResponseToAnalysis(parsed, `Gemini (${model})${hasVideo ? ' + video' : ' + sampled frames only'}`, hasVideo);
    } catch (err: any) {
      console.warn(`[SixReasons] ${model} threw: ${err.message}`);
    }
  }
  console.warn('[SixReasons] All Gemini models failed or returned nothing usable - trying OpenRouter fallback.');
  await prepared?.cleanup();

  // Last resort: OpenRouter (e.g. GPT-4o mini) when Gemini is exhausted/down (most commonly the
  // free tier's 20 requests/day cap). OpenRouter's chat completions API doesn't accept raw
  // video+audio files like Gemini's native API does, so this is always frames+caption only -
  // the prompt already instructs the model not to invent dialogue it can't verify.
  return callOpenRouterFallback(userContext, framesSource);
}

function isValidAnalysis(parsed: any): boolean {
  return typeof parsed?.reelCategory === 'string' &&
    typeof parsed.creativeAdaptation === 'string' && typeof parsed.closingLesson === 'string' &&
    ['textHook', 'visualHook', 'audioHook'].every(key => typeof parsed.firstSixSeconds?.[key] === 'string') &&
    Array.isArray(parsed.sixReasons) && parsed.sixReasons.length === 6 &&
    parsed.sixReasons.every((reason: any) => typeof reason?.heading === 'string' && reason.heading.trim() && typeof reason?.paragraph === 'string' && reason.paragraph.trim());
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
      heading: r.heading || 'Reason',
      paragraph: r.paragraph || ''
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
  framesSource: ExtractedVideoFrame[] | Promise<ExtractedVideoFrame[]>
): Promise<SixReasonsAnalysis | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim().length < 10) return null;

  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  const frames = actualVideoFrames(await framesSource);
  if (frames.length < 2) return null;

  const content: any[] = [
    {
      type: 'text',
      text: `${userContext}\n\nNo video/audio file is available via this path - only the static frames below and the caption text. Do not invent spoken dialogue; say the audio hook cannot be determined if you cannot verify it.`
    }
  ];
  for (const frame of frames.slice(0, 6)) {
    if (frame.dataUrl) {
      content.push({ type: 'image_url', image_url: { url: frame.dataUrl } });
    }
  }
  if (content.length === 1) return null; // no frames and no video - nothing to analyze

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
      signal: AbortSignal.timeout(25000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[SixReasons] OpenRouter (${model}) returned ${res.status}: ${errText.slice(0, 300)}`);
      return null;
    }

    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) {
      console.warn('[SixReasons] OpenRouter returned no content.');
      return null;
    }

    const parsed = JSON.parse(rawText);
    if (!isValidAnalysis(parsed)) {
      console.warn('[SixReasons] OpenRouter returned invalid sixReasons shape');
      return null;
    }

    return parsedResponseToAnalysis(parsed, `OpenRouter (${model})`, false);
  } catch (err: any) {
    console.warn(`[SixReasons] OpenRouter fallback threw: ${err.message}`);
    return null;
  }
}
