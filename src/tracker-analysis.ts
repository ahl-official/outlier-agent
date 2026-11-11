import { ANALYSIS_VERSION } from './breakdown/evidence';
import { normalizeVideoUrl } from './lib/video-url';
import type { DetailedOutlierBreakdown } from './types';

const sentenceSegmenter = new Intl.Segmenter('en', { granularity: 'sentence' });

export function trackerAnalysisPayload(report?: DetailedOutlierBreakdown | null) {
  if (!report) return undefined;
  return {
    candidateUrl: report.candidateUrl,
    analysisVersion: report.analysisVersion,
    status: report.aiAgentAudit?.status,
    evidenceSource: report.aiAgentAudit?.evidenceSource,
    findings: report.sixReasonsAnalysis
  };
}

export function trackerAnalysisColumns(videoUrl: string, input: unknown): [string, string, string, string] | null {
  const report = input as ReturnType<typeof trackerAnalysisPayload>;
  if (report?.analysisVersion !== ANALYSIS_VERSION || report.status !== 'ai_analyzed' ||
      (report.evidenceSource !== 'video' && report.evidenceSource !== 'frames') ||
      typeof report.candidateUrl !== 'string' || !report.candidateUrl.trim() ||
      normalizeVideoUrl(report.candidateUrl) !== normalizeVideoUrl(videoUrl)) return null;

  const findings = report.findings;
  const hook = findings?.firstSixSeconds?.visualHook;
  if (typeof hook !== 'string' || !hook.trim() || !Array.isArray(findings?.sixReasons) ||
      findings.sixReasons.length !== 6 || !findings.sixReasons.every(reason =>
        typeof reason?.heading === 'string' && reason.heading.trim() &&
        typeof reason.paragraph === 'string' && reason.paragraph.trim())) return null;

  const audio = findings.firstSixSeconds.audioHook;
  const verdict = typeof findings.outlierVerdict === 'string' ? findings.outlierVerdict.trim().replace(/\s+/g, ' ') : '';
  const sentenceCount = Array.from(sentenceSegmenter.segment(verdict)).length;
  const strongestFinding = Array.from(sentenceSegmenter.segment(findings.sixReasons[0].paragraph.trim()))
    .slice(0, 3).map(part => part.segment.trim()).join(' ');
  return [
    hook.trim().slice(0, 49000),
    (report.evidenceSource === 'video' && findings.analyzedWithAudio === true && typeof audio === 'string' && audio.trim()
      ? audio.trim() : 'Audio not verified').slice(0, 49000),
    (sentenceCount >= 2 && sentenceCount <= 3 && verdict.split(' ').length <= 65 ? verdict : strongestFinding).slice(0, 49000),
    findings.sixReasons.map((reason, index) => `${index + 1}. ${reason.paragraph.trim().replace(/\s+/g, ' ')}`).join('\n').slice(0, 49000)
  ];
}
