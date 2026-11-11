import type { DetailedOutlierBreakdown, ExtractedVideoFrame } from '../types';

export const ANALYSIS_VERSION = 2;
export const FINDING_WORD_LIMIT = 32;

const sentenceSegmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
const nonAlphanumeric = new RegExp('[^\\p{L}\\p{N}]+', 'gu');

export function hasConciseFindings(value: unknown): boolean {
  if (!Array.isArray(value) || value.length !== 6) return false;
  const seen = new Set<string>();
  for (const reason of value) {
    if (typeof reason?.heading !== 'string' || !reason.heading.trim() || typeof reason.paragraph !== 'string') return false;
    const sentence = reason.paragraph.trim();
    if (!sentence || /[\r\n]/.test(sentence) || sentence.split(/\s+/).length > FINDING_WORD_LIMIT ||
        Array.from(sentenceSegmenter.segment(sentence)).length !== 1) return false;
    const normalized = sentence.toLowerCase().replace(nonAlphanumeric, ' ').trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
  }
  return true;
}

/** Repeated images are never displayed as different video moments. */
export function uniqueFrames(frames: ExtractedVideoFrame[]): ExtractedVideoFrame[] {
  const seen = new Set<string>();
  return frames.filter((frame) => {
    if (!frame.dataUrl || seen.has(frame.dataUrl)) return false;
    seen.add(frame.dataUrl);
    return true;
  });
}

export function actualVideoFrames(frames: ExtractedVideoFrame[]): ExtractedVideoFrame[] {
  return uniqueFrames(frames.filter((frame) => frame.source === 'video-frame'));
}

export function canReuseAnalysis(analysis?: DetailedOutlierBreakdown): boolean {
  return analysis?.analysisVersion === ANALYSIS_VERSION && hasConciseFindings(analysis.sixReasonsAnalysis?.sixReasons);
}
