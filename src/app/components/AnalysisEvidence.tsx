'use client';

import React from 'react';
import type { DetailedOutlierBreakdown, ExtractedVideoFrame } from '@/types';
import { ANALYSIS_VERSION, actualVideoFrames, uniqueFrames } from '@/breakdown/evidence';

interface Props {
  analysis: DetailedOutlierBreakdown;
  onPreview: (frame: ExtractedVideoFrame) => void;
  onRetry: () => void;
}

export default function AnalysisEvidence({ analysis, onPreview, onRetry }: Props) {
  const audit = analysis.aiAgentAudit;
  const current = analysis.analysisVersion === ANALYSIS_VERSION;
  const images = current ? uniqueFrames(audit?.extractedFrames || []).filter(frame => frame.source) : [];
  const samples = actualVideoFrames(images);
  const analyzed = current && audit?.status === 'ai_analyzed';
  const watchedVideo = analyzed && audit?.evidenceSource === 'video';
  const title = !current ? 'This report needs a fresh analysis' : watchedVideo ? 'AI analyzed the video' : analyzed ? 'AI analyzed sampled video frames' : 'Video analysis unavailable';

  return (
    <section className={`glass-panel analysis-evidence ${analyzed ? '' : 'analysis-evidence-limited'}`} aria-label="Analysis evidence">
      <h3>{title}</h3>
      <p role="status">{!current
        ? 'This older report does not identify its image sources. Run analysis again to get a verified evidence status.'
        : audit?.limitation || 'The video could not be inspected. No visual or audio findings are available.'}</p>
      {analyzed && audit?.agentModel && <p className="analysis-evidence-model">{audit.agentModel}</p>}
      {!!audit?.diagnostics?.length && (
        <details>
          <summary>Analysis attempts and errors</summary>
          <ul>{audit.diagnostics.map((attempt, index) => (
            <li key={index}>{attempt.message}{attempt.httpStatus ? ` (HTTP ${attempt.httpStatus})` : ''}</li>
          ))}</ul>
        </details>
      )}
      {!analyzed && <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>Retry video analysis</button>}
      {images.length > 0 && (
        <>
          <h4>{samples.length ? `${samples.length} distinct video samples` : 'Cover preview only'}</h4>
          {!samples.length && <p>This image is the video cover. It has no verified timestamp and is not a frame-by-frame analysis.</p>}
          <div className="analysis-evidence-images">
            {images.map(frame => (
              <button type="button" className="analysis-evidence-image" key={frame.index} onClick={() => onPreview(frame)}>
                <img src={frame.dataUrl} alt={frame.label || 'Video image'} />
                <span>{frame.source === 'video-frame' ? `Sample at ${frame.timestamp}` : 'Cover image — not a video sample'}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {watchedVideo && samples.length === 0 && images.length === 0 && <p>The model received the video directly. Frame previews are unavailable.</p>}
    </section>
  );
}
