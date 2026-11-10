import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { OutlierCandidate, ExtractedVideoFrame, DetailedOutlierBreakdown } from '../src/types';
import { ANALYSIS_VERSION, actualVideoFrames, uniqueFrames, canReuseAnalysis } from '../src/breakdown/evidence';
import { extractFramesWithFfmpeg, downloadVideoForGemini } from '../src/breakdown/ffmpeg';
import { runSocialMediaExpertAgent } from '../src/breakdown/social-agent';
import { generateSixReasonsAnalysis } from '../src/breakdown/hook-analysis';
import { analyzeOutlierVideo } from '../src/breakdown/analyze';
import AnalysisEvidence from '../src/app/components/AnalysisEvidence';
import { prepareGeminiVideo } from '../src/breakdown/gemini-video';

const candidate: OutlierCandidate = {
  id: 'ig_example', platform: 'instagram', url: 'https://example.test/video', title: 'Client story',
  caption: 'A client talks about their hair topper.', thumbnailUrl: 'https://example.test/cover.jpg',
  publishedAt: '2026-10-01T00:00:00Z', viewCount: 100000, likeCount: 1000, commentCount: 20,
  creator: { id: 'creator', username: 'creator', displayName: 'Creator', medianViews: 10000 },
  outlierMultiplier: 10, outlierScore: 75, matchedKeyword: 'hair topper', whyOutlier: '10x baseline', isShortOrReel: true
};
const cover: ExtractedVideoFrame = { index: 1, timestamp: '', source: 'thumbnail', dataUrl: `data:image/jpeg;base64,${'a'.repeat(800)}`, label: 'Cover image only' };
const samples: ExtractedVideoFrame[] = [
  { ...cover, source: 'video-frame', timestamp: '00:00.00', label: 'Sample at 00:00.00' },
  { ...cover, index: 2, source: 'video-frame', timestamp: '00:03.00', label: 'Sample at 00:03.00', dataUrl: `data:image/jpeg;base64,${'b'.repeat(800)}` }
];
const modelAnalysis = {
  reelCategory: 'Client testimonial', firstSixSeconds: { textHook: 'None', visualHook: 'Client seated in a salon', audioHook: 'Client speaks about wearing a topper' },
  sixReasons: Array.from({ length: 6 }, (_, i) => ({ heading: `Observation ${i + 1}`, paragraph: 'The client speaks directly to camera. This may help establish credibility.' })),
  creativeAdaptation: 'Ask an actual client about their experience.', closingLesson: 'Personal accounts may help explain the product.',
  format: 'client_testimonial', editingStyle: 'talking_head'
};
let previousEnv: NodeJS.ProcessEnv;
let previousFetch: typeof fetch;
beforeEach(() => {
  previousEnv = { ...process.env };
  previousFetch = globalThis.fetch;
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  // Force the serverless/no-binaries case without relying on the developer machine's tools.
  process.env.PATH = '';
  globalThis.fetch = async () => { throw new Error('Unexpected network request'); };
});
afterEach(() => { process.env = previousEnv; globalThis.fetch = previousFetch; });

test('identical images do not become separate timeline samples', () => {
  const repeated = [cover, { ...cover, index: 2, timestamp: '00:03' }, { ...cover, index: 3, timestamp: '00:12' }];
  assert.equal(uniqueFrames(repeated).length, 1);
  assert.equal(actualVideoFrames(repeated).length, 0);
  assert.equal(actualVideoFrames([...samples, { ...samples[0], index: 3 }]).length, 2);
});

test('serverless cover fallback returns one untimed image without scores', async () => {
  globalThis.fetch = async () => new Response(Buffer.alloc(900, 1), { headers: { 'content-type': 'image/jpeg' } });
  const frames = await extractFramesWithFfmpeg(candidate.url, candidate.thumbnailUrl);
  assert.equal(frames.length, 1);
  assert.equal(frames[0].source, 'thumbnail');
  assert.equal(frames[0].timestamp, '');
  assert.equal(frames[0].retentionScore, undefined);
  assert.equal(frames[0].visualTrigger, undefined);
});

test('non-image cover and non-video downloads cannot masquerade as media', async () => {
  globalThis.fetch = async () => new Response('not media'.repeat(1000), { headers: { 'content-type': 'text/html' } });
  assert.deepEqual(await extractFramesWithFfmpeg(candidate.url, candidate.thumbnailUrl), []);
  assert.equal(await downloadVideoForGemini(candidate.url, 'https://example.test/video.mp4'), null);
});

test('videos larger than the old inline limit can still be downloaded', async () => {
  const buffer = Buffer.alloc(19 * 1024 * 1024, 1);
  globalThis.fetch = async () => new Response(buffer, { headers: { 'content-type': 'video/mp4', 'content-length': String(buffer.length) } });
  const result = await downloadVideoForGemini(candidate.url, 'https://example.test/video.mp4');
  assert.equal(result?.buffer.length, buffer.length);
});

test('large videos use a file upload and are deleted after successful AI analysis', async () => {
  const requests: string[] = [];
  const video = { buffer: Buffer.alloc(19 * 1024 * 1024, 1), mimeType: 'video/mp4' };
  const fileUri = 'https://generativelanguage.googleapis.com/v1beta/files/test-video';
  globalThis.fetch = async (url, init) => {
    const address = String(url);
    requests.push(`${init?.method || 'GET'} ${address}`);
    if (init?.method === 'DELETE') return new Response(null, { status: 200 });
    if (address.endsWith('/upload/v1beta/files')) return new Response(null, { headers: { 'x-goog-upload-url': 'https://generativelanguage.googleapis.com/upload/session' } });
    if (address.endsWith('/upload/session')) {
      assert.equal((init?.body as Uint8Array).byteLength, video.buffer.length);
      return Response.json({ file: { name: 'files/test-video', uri: fileUri, state: 'ACTIVE' } });
    }
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.contents[0].parts[0].fileData.fileUri, fileUri);
    assert.equal(payload.contents[0].parts[0].inlineData, undefined);
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(modelAnalysis) }] } }] });
  };
  const result = await generateSixReasonsAnalysis(candidate, [], 'test-key-at-least-ten-characters', Promise.resolve(video));
  assert.equal(result?.sixReasons.length, 6);
  assert.equal(result?.analyzedWithAudio, true);
  assert.equal(requests.length, 4);
  assert.ok(requests[3].startsWith('DELETE '));
});

test('failed video processing cleans up the upload and does not create a verdict', async () => {
  let deleted = false;
  globalThis.fetch = async (url, init) => {
    if (init?.method === 'DELETE') { deleted = true; return new Response(null); }
    if (String(url).endsWith('/upload/v1beta/files')) return new Response(null, { headers: { 'x-goog-upload-url': 'https://generativelanguage.googleapis.com/upload/session' } });
    return Response.json({ file: { name: 'files/test-video', uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-video', state: 'FAILED' } });
  };
  await assert.rejects(() => prepareGeminiVideo({ buffer: Buffer.alloc(19 * 1024 * 1024), mimeType: 'video/mp4' }, 'test-key'), /not ready/);
  assert.equal(deleted, true);
});

test('cover-only input never calls AI and never receives an expert verdict', async () => {
  const audit = await runSocialMediaExpertAgent(candidate, [cover, { ...cover, index: 2 }], 'test-key-at-least-ten-characters');
  assert.equal(audit.status, 'unavailable');
  assert.equal(audit.framesExtractedCount, 0);
  assert.equal(audit.extractedFrames?.length, 1);
  assert.equal(audit.winningElement, undefined);
  assert.equal(audit.frameHighlights, undefined);
  assert.equal(await generateSixReasonsAnalysis(candidate, [cover], 'test-key-at-least-ten-characters'), null);
});

test('actual samples without an AI key do not get fabricated annotations', async () => {
  const audit = await runSocialMediaExpertAgent(candidate, samples);
  assert.equal(audit.status, 'unavailable');
  assert.equal(audit.evidenceSource, 'frames');
  assert.equal(audit.winningElement, undefined);
  assert.ok(audit.extractedFrames?.every(frame => frame.retentionScore === undefined));
});

test('YouTube video goes to Gemini by link even when no frame extractor is installed', async () => {
  const youtube = { ...candidate, platform: 'youtube' as const, url: 'https://www.youtube.com/watch?v=abcdefghijk' };
  let payload: any;
  globalThis.fetch = async (_url, init) => {
    payload = JSON.parse(String(init?.body));
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(modelAnalysis) }] } }] });
  };
  const result = await generateSixReasonsAnalysis(youtube, [], 'test-key-at-least-ten-characters');
  assert.equal(payload.contents[0].parts[0].fileData.fileUri, youtube.url);
  assert.equal(result?.analyzedWithAudio, true);
  assert.equal(result?.sixReasons.length, 6);
});

test('failed video AI does not fall back to analyzing a cover as six reasons', async () => {
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  let requests = 0;
  globalThis.fetch = async () => { requests++; return Response.json({ error: { message: 'quota' } }, { status: 429 }); };
  const youtube = { ...candidate, platform: 'youtube' as const, url: 'https://www.youtube.com/watch?v=abcdefghijk' };
  assert.equal(await generateSixReasonsAnalysis(youtube, [cover], 'test-key-at-least-ten-characters'), null);
  assert.equal(requests, 1);
});

test('sample-only analysis cannot claim verified audio even when the model invents it', async () => {
  globalThis.fetch = async () => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(modelAnalysis) }] } }] });
  const result = await generateSixReasonsAnalysis(candidate, samples, 'test-key-at-least-ten-characters');
  assert.equal(result?.analyzedWithAudio, false);
  assert.match(result!.firstSixSeconds.audioHook, /not available/);
});

test('reports from the synthetic-frame era are not reusable', () => {
  const legacy = { aiAgentAudit: { extractedFrames: [cover, cover, cover, cover] }, sixReasonsAnalysis: modelAnalysis } as unknown as DetailedOutlierBreakdown;
  assert.equal(canReuseAnalysis(legacy), false);
  assert.equal(canReuseAnalysis({ ...legacy, analysisVersion: ANALYSIS_VERSION }), true);
  assert.equal(canReuseAnalysis({ analysisVersion: ANALYSIS_VERSION } as DetailedOutlierBreakdown), false);
});

test('end-to-end unavailable report has metrics but no template scene/audio/verdict', async () => {
  globalThis.fetch = async () => new Response(Buffer.alloc(900, 1), { headers: { 'content-type': 'image/jpeg' } });
  const result = await analyzeOutlierVideo(candidate);
  assert.equal(result.analysisVersion, ANALYSIS_VERSION);
  assert.equal(result.metrics.viewCount, candidate.viewCount);
  assert.equal(result.aiAgentAudit?.status, 'unavailable');
  assert.equal(result.aiAgentAudit?.extractedFrames?.length, 1);
  assert.equal(result.strategistVerdict, undefined);
  assert.equal(result.deepVisualAnalysis, undefined);
  assert.equal(result.sixReasonsAnalysis, undefined);
  assert.deepEqual(result.audienceVoice.inquiryThemes, []);
  const html = renderToStaticMarkup(React.createElement(AnalysisEvidence, { analysis: result, onPreview() {}, onRetry() {} }));
  assert.match(html, /Video analysis unavailable/);
  assert.match(html, /Cover preview only/);
  assert.equal((html.match(/<img /g) || []).length, 1);
  assert.doesNotMatch(html, /98%|94%|FFmpeg|Viral Score/);
});
