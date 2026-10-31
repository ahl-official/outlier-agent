import { OutlierCandidate, FormatLabels } from '../types';
import { downloadVideoForGemini } from './ffmpeg';
import { taxonomyPromptBlock, normalizeFormatKey, normalizeEditingStyleKey } from '../scoring/format-taxonomy';

/**
 * Tag-only pass for the Format Map: one cheap Gemini call that returns just a Format and an
 * Editing Style for a candidate. Used to backfill outliers that never had a Deep Dive (the
 * Deep Dive's six-reasons call already returns the same two tags for free).
 *
 * Prefers the real video; falls back to thumbnail + caption, flagged `source: 'thumbnail'` so the
 * map can say how much of it was judged from a still.
 */
const TAGGER_SYSTEM_PROMPT = `You label short-form hair-system / hair-topper / wig videos for a content team.
Watch the video (or look at the thumbnail and caption if that is all you have) and pick the single best FORMAT and EDITING STYLE.
Label what is actually there, not what the caption promises. When a video mixes styles, label the dominant one (what is on screen most of the time).

${taxonomyPromptBlock()}

Respond in strict JSON: { "format": "<format key>", "editingStyle": "<editing style key>" }`;

const MODELS_TO_TRY = ['gemini-2.5-flash-lite', 'gemini-flash-latest'];

export class TaggerQuotaError extends Error {}

export async function tagCandidateFormat(candidate: OutlierCandidate, apiKey?: string): Promise<FormatLabels | null> {
  const key = (apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (key.length < 10) throw new Error('GEMINI_API_KEY is not set');

  const parts: any[] = [];
  let source: FormatLabels['source'] = 'video';

  const video = await downloadVideoForGemini(candidate.url, candidate.videoUrl).catch(() => null);
  if (video) {
    parts.push({ inlineData: { mimeType: video.mimeType, data: video.buffer.toString('base64') } });
  } else {
    const thumb = await fetchThumbnail(candidate.thumbnailUrl);
    if (!thumb) return null; // nothing to look at - don't guess from the caption alone
    parts.push({ inlineData: thumb });
    source = 'thumbnail';
  }
  parts.push({
    text: `Platform: ${candidate.platform}\nTitle: "${candidate.title || ''}"\nCaption: "${(candidate.caption || '').slice(0, 1200)}"\n${
      video ? 'The video file is attached.' : 'Only the thumbnail is attached - no video available.'
    }`
  });

  for (const model of MODELS_TO_TRY) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: TAGGER_SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(video ? 30000 : 15000)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({} as any));
        console.warn(`[FormatTagger] ${model} returned ${res.status}: ${errData.error?.message || 'unknown error'}`);
        // 429 = the key's quota is spent for now; every later call would fail too
        if (res.status === 429) throw new TaggerQuotaError('Gemini quota exhausted');
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText);
      const format = normalizeFormatKey(parsed.format);
      const editingStyle = normalizeEditingStyleKey(parsed.editingStyle);
      if (!format || !editingStyle) {
        console.warn(`[FormatTagger] ${model} gave keys outside the taxonomy: ${rawText.slice(0, 200)}`);
        continue;
      }
      return { format, editingStyle, source, taggedAt: new Date().toISOString() };
    } catch (err: any) {
      if (err instanceof TaggerQuotaError) throw err;
      console.warn(`[FormatTagger] ${model} threw: ${err.message}`);
    }
  }
  return null;
}

async function fetchThumbnail(url?: string): Promise<{ mimeType: string; data: string } | null> {
  if (!url || !url.startsWith('http')) return null;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null;
    const mimeType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
    return { mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg', data: buf.toString('base64') };
  } catch {
    return null;
  }
}
