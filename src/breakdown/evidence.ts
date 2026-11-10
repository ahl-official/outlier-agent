import type { DetailedOutlierBreakdown, ExtractedVideoFrame } from '../types';

export const ANALYSIS_VERSION = 2;

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
  return analysis?.analysisVersion === ANALYSIS_VERSION && !!analysis.sixReasonsAnalysis;
}
