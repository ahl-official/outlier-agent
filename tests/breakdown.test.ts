import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { OutlierCandidate, ExtractedVideoFrame, DetailedOutlierBreakdown, AnalysisDiagnostic } from '../src/types';
import { ANALYSIS_VERSION, actualVideoFrames, uniqueFrames, canReuseAnalysis } from '../src/breakdown/evidence';
import { extractFramesWithFfmpeg, downloadVideoForGemini } from '../src/breakdown/ffmpeg';
import { runSocialMediaExpertAgent } from '../src/breakdown/social-agent';
import { generateSixReasonsAnalysis } from '../src/breakdown/hook-analysis';
import { analyzeOutlierVideo } from '../src/breakdown/analyze';
import AnalysisEvidence from '../src/app/components/AnalysisEvidence';
import { prepareGeminiVideo } from '../src/breakdown/gemini-video';
import { prepareOpenRouterVideo } from '../src/breakdown/ffmpeg';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

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
  delete process.env.OPENROUTER_VIDEO_MODEL;
  delete process.env.OPENROUTER_MODEL;
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

test('failed YouTube AI retries its actual video link through OpenRouter, never the cover', async () => {
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  let requests = 0;
  globalThis.fetch = async (url, init) => {
    requests++;
    if (String(url).includes('openrouter.ai')) {
      const content = JSON.parse(String(init?.body)).messages[1].content;
      assert.deepEqual(content.filter((part: any) => part.type !== 'text'), [{ type: 'video_url', video_url: { url: 'https://www.youtube.com/watch?v=abcdefghijk' } }]);
    }
    return Response.json({ error: { message: 'quota' } }, { status: 429 });
  };
  const youtube = { ...candidate, platform: 'youtube' as const, url: 'https://www.youtube.com/watch?v=abcdefghijk' };
  assert.equal(await generateSixReasonsAnalysis(youtube, [cover], 'test-key-at-least-ten-characters'), null);
  assert.equal(requests, 2);
});

test('Gemini quota failure sends downloaded video to OpenRouter without requiring FFmpeg frames', async () => {
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  process.env.OPENROUTER_MODEL = 'openai/gpt-4o-mini';
  const diagnostics: AnalysisDiagnostic[] = [];
  let requests = 0;
  globalThis.fetch = async (url, init) => {
    requests++;
    if (String(url).includes('googleapis.com')) return Response.json({ error: { status: 'RESOURCE_EXHAUSTED' } }, { status: 429 });
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.model, 'google/gemini-2.5-flash-lite');
    assert.equal(payload.messages[1].content[1].type, 'video_url');
    assert.equal(payload.messages[1].content[1].video_url.url, `data:video/mp4;base64,${Buffer.from('actual-video').toString('base64')}`);
    return Response.json({ choices: [{ message: { content: JSON.stringify(modelAnalysis) } }] });
  };
  const result = await generateSixReasonsAnalysis(candidate, [cover], 'test-gemini-key', Promise.resolve({ buffer: Buffer.from('actual-video'), mimeType: 'video/mp4' }), diagnostics);
  assert.equal(requests, 2);
  assert.equal(result?.analyzedWithAudio, true);
  assert.match(result!.modelUsed, /OpenRouter.*video/);
  assert.equal(diagnostics[0].httpStatus, 429);
  assert.equal(diagnostics[0].code, 'rate_limit');
});

test('OpenRouter-only configuration downloads once and produces an evidence-backed video report', async () => {
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  let downloads = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/video.mp4')) {
      downloads++;
      return new Response(Buffer.alloc(6000, 1), { headers: { 'content-type': 'video/mp4' } });
    }
    if (String(url).includes('openrouter.ai')) {
      const payload = JSON.parse(String(init?.body));
      assert.equal(payload.messages[1].content[1].type, 'video_url');
      return Response.json({ choices: [{ message: { content: JSON.stringify(modelAnalysis) } }] });
    }
    return new Response(Buffer.alloc(900, 1), { headers: { 'content-type': 'image/jpeg' } });
  };
  const result = await analyzeOutlierVideo({ ...candidate, videoUrl: 'https://example.test/video.mp4' });
  assert.equal(downloads, 1);
  assert.equal(result.aiAgentAudit?.status, 'ai_analyzed');
  assert.equal(result.aiAgentAudit?.evidenceSource, 'video');
  assert.equal(result.aiAgentAudit?.framesExtractedCount, 0);
  assert.equal(result.sixReasonsAnalysis?.sixReasons.length, 6);
});

test('Gemini upload failure and invalid video compression still allow the real-frame fallback', async () => {
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  const diagnostics: AnalysisDiagnostic[] = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('googleapis.com')) return new Response(null, { status: 429 });
    assert.ok(JSON.parse(String(init?.body)).messages[1].content.some((part: any) => part.type === 'image_url'));
    return Response.json({ choices: [{ message: { content: JSON.stringify(modelAnalysis) } }] });
  };
  const result = await generateSixReasonsAnalysis(candidate, samples, 'test-gemini-key', Promise.resolve({ buffer: Buffer.alloc(19 * 1024 * 1024), mimeType: 'video/mp4' }), diagnostics);
  assert.ok(result);
  assert.equal(result.analyzedWithAudio, false);
  assert.equal(diagnostics[0].code, 'upload_failed');
});

test('OpenRouter video failure can still use timestamped samples with the configured image model', async () => {
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  process.env.OPENROUTER_VIDEO_MODEL = 'test/video-model';
  process.env.OPENROUTER_MODEL = 'test/image-model';
  const models: string[] = [];
  globalThis.fetch = async (_url, init) => {
    const payload = JSON.parse(String(init?.body));
    models.push(payload.model);
    if (payload.model === 'test/video-model') return new Response(null, { status: 503 });
    const text = payload.messages[1].content.filter((part: any) => part.type === 'text').map((part: any) => part.text).join('\n');
    assert.match(text, /00:03.00/);
    assert.doesNotMatch(text, /actual video is attached/);
    return Response.json({ choices: [{ message: { content: JSON.stringify(modelAnalysis) } }] });
  };
  const result = await generateSixReasonsAnalysis(candidate, samples, undefined, Promise.resolve({ buffer: Buffer.alloc(6000), mimeType: 'video/mp4' }));
  assert.deepEqual(models, ['test/video-model', 'test/image-model']);
  assert.equal(result?.analyzedWithAudio, false);
  assert.match(result!.firstSixSeconds.audioHook, /not available/);
});

test('OpenRouter insufficient credits is recorded and does not repeat the same key on another model', async () => {
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  const diagnostics: AnalysisDiagnostic[] = [];
  let requests = 0;
  globalThis.fetch = async () => { requests++; return new Response('private error detail', { status: 402 }); };
  const result = await generateSixReasonsAnalysis(candidate, samples, undefined, Promise.resolve({ buffer: Buffer.alloc(6000), mimeType: 'video/mp4' }), diagnostics);
  assert.equal(result, null);
  assert.equal(requests, 1);
  assert.ok(diagnostics.some(d => d.code === 'credits_exhausted' && d.httpStatus === 402));
  assert.doesNotMatch(JSON.stringify(diagnostics), /private error detail/);
});

test('expired media and provider errors are saved and visible without secrets', async () => {
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  globalThis.fetch = async (url) => String(url).endsWith('video.mp4')
    ? new Response(null, { status: 403 })
    : new Response(Buffer.alloc(900, 1), { headers: { 'content-type': 'image/jpeg' } });
  const result = await analyzeOutlierVideo({ ...candidate, videoUrl: 'https://example.test/video.mp4' });
  assert.equal(result.aiAgentAudit?.status, 'unavailable');
  assert.ok(result.aiAgentAudit?.diagnostics?.some(d => d.code === 'download_http_error' && d.httpStatus === 403));
  const html = renderToStaticMarkup(React.createElement(AnalysisEvidence, { analysis: result, onPreview() {}, onRetry() {} }));
  assert.match(html, /Analysis attempts and errors/);
  assert.match(html, /HTTP 403/);
  assert.doesNotMatch(html, /test-openrouter-key|example.test\/video.mp4/);
});

test('packaged media tools preserve full duration/audio during compression and extract actual samples without PATH', async () => {
  const run = promisify(execFile);
  const ffmpeg = require('ffmpeg-static') as string;
  const ffprobe = require('ffprobe-static').path as string;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'outlier-media-test-'));
  try {
    const input = path.join(dir, 'fixture.mp4');
    await run(ffmpeg, ['-nostdin', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=12', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '4', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-movflags', '+faststart', '-y', input], { timeout: 10000 });
    // A valid MP4 free-space atom makes the input exceed the gateway budget without
    // a slow or nondeterministic large download in the regression suite.
    const free = Buffer.alloc(9 * 1024 * 1024);
    free.writeUInt32BE(free.length, 0);
    free.write('free', 4);
    const original = { buffer: Buffer.concat([await fs.readFile(input), free]), mimeType: 'video/mp4' };
    const compressed = await prepareOpenRouterVideo(original);
    assert.ok(compressed);
    assert.ok(compressed.buffer.length < 8 * 1024 * 1024);
    const output = path.join(dir, 'compressed.mp4');
    await fs.writeFile(output, compressed.buffer);
    const { stdout } = await run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', output]);
    const info = JSON.parse(stdout);
    assert.ok(Math.abs(Number(info.format.duration) - 4) < 0.15);
    assert.ok(info.streams.some((stream: any) => stream.codec_type === 'audio'));
    const frames = await extractFramesWithFfmpeg(candidate.url, undefined, undefined, { maxFrames: 3, timeoutMs: 10000 }, undefined, undefined, Promise.resolve(compressed));
    assert.equal(actualVideoFrames(frames).length, 3);
    assert.ok(frames.every(frame => frame.timestamp && frame.source === 'video-frame'));
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
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
