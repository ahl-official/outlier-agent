import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ExtractedVideoFrame } from '../types';
import { extractYouTubeVideoId } from '../providers/youtube';
import { uniqueFrames } from './evidence';
import type { VideoMedia } from './gemini-video';

const execFileAsync = promisify(execFile);
const VIDEO_MAX_BYTES = 64 * 1024 * 1024;

export interface FrameExtractionOptions {
  maxFrames?: number;
  sampleDurationSeconds?: number;
  timeoutMs?: number;
}

async function isToolAvailable(cmd: string): Promise<boolean> {
  try {
    await execFileAsync(process.platform === 'win32' ? 'where.exe' : 'which', [cmd], { timeout: 1500 });
    return true;
  } catch { return false; }
}

function isPlatformUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'instagram.com', 'www.instagram.com'].includes(url.hostname);
  } catch { return false; }
}

async function readBoundedResponse(res: Response, maxBytes: number): Promise<Buffer | null> {
  if (!res.ok || !res.body) return null;
  if (Number(res.headers.get('content-length')) > maxBytes) {
    await res.body.cancel();
    return null;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks);
      size += value.length;
      if (size > maxBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
}

/** Downloads actual media. A poster image or an HTML response is never a video. */
export async function downloadVideoForGemini(videoUrl: string, directVideoUrl?: string, maxBytes = VIDEO_MAX_BYTES, timeoutMs = 60000): Promise<VideoMedia | null> {
  const source = directVideoUrl || (videoUrl.endsWith('.mp4') ? videoUrl : undefined);
  if (source?.startsWith('https://')) {
    try {
      const res = await fetch(source, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(timeoutMs) });
      const mimeType = (res.headers.get('content-type') || '').split(';')[0];
      if (mimeType.startsWith('video/')) {
        const buffer = await readBoundedResponse(res, maxBytes);
        if (buffer && buffer.length > 5000) return { buffer, mimeType };
      } else { await res.body?.cancel(); }
    } catch (err: any) { console.warn(`[Media] Video download failed: ${err.message}`); }
  }
  if (!isPlatformUrl(videoUrl) || !(await isToolAvailable('yt-dlp'))) return null;
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'outlier-video-'));
  const file = path.join(dir, 'clip.mp4');
  try {
    await execFileAsync('yt-dlp', ['--no-warnings', '--socket-timeout', '10', '--max-filesize', `${Math.floor(maxBytes / 1024 / 1024)}M`, '-f', 'b[ext=mp4]', '-o', file, '--force-overwrites', '--', videoUrl], { timeout: 15000 });
    const stat = await fs.promises.stat(file);
    if (stat.size > 5000 && stat.size <= maxBytes) return { buffer: await fs.promises.readFile(file), mimeType: 'video/mp4' };
  } catch (err: any) { console.warn(`[Media] Downloader failed: ${err.message}`); }
  finally { await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {}); }
  return null;
}

/** Only FFmpeg output has timestamps. Cloud fallback is one clearly labeled cover image. */
export async function extractFramesWithFfmpeg(
  videoUrl: string,
  thumbnailUrl?: string,
  candidateId?: string,
  options?: FrameExtractionOptions,
  directVideoUrl?: string,
  _mediaUrls?: string[],
  videoSource?: Promise<VideoMedia | null>
): Promise<ExtractedVideoFrame[]> {
  const deadline = Date.now() + (options?.timeoutMs || 35000);
  const maxFrames = Math.min(6, Math.max(1, options?.maxFrames || 6));
  const [hasFfmpeg, hasProbe] = await Promise.all([isToolAvailable('ffmpeg'), isToolAvailable('ffprobe')]);
  if (hasFfmpeg && hasProbe) {
    const video = await (videoSource || downloadVideoForGemini(videoUrl, directVideoUrl));
    if (video && Date.now() < deadline) {
      const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'outlier-frames-'));
      const file = path.join(dir, 'clip.mp4');
      try {
        await fs.promises.writeFile(file, video.buffer);
        const probe = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], { timeout: Math.max(1, Math.min(4000, deadline - Date.now())) });
        const duration = Number(probe.stdout.trim());
        if (!Number.isFinite(duration) || duration <= 0) throw new Error('Could not measure video duration');
        const seconds = [0, Math.min(1.5, duration * .12), duration * .35, duration * .6, duration * .82, Math.max(0, duration - .4)].slice(0, maxFrames);
        const frames: ExtractedVideoFrame[] = [];
        for (const sec of seconds) {
          if (Date.now() >= deadline) break;
          const out = path.join(dir, `frame-${frames.length}.jpg`);
          try {
            await execFileAsync('ffmpeg', ['-nostdin', '-ss', sec.toFixed(2), '-i', file, '-frames:v', '1', '-vf', 'scale=480:-1', '-q:v', '3', '-y', out], { timeout: Math.max(1, Math.min(5000, deadline - Date.now())) });
            const buffer = await fs.promises.readFile(out);
            if (buffer.length < 500) continue;
            const timestamp = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${(sec % 60).toFixed(2).padStart(5, '0')}`;
            frames.push({ index: frames.length + 1, timestamp, source: 'video-frame', dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`, label: `Video sample at ${timestamp}` });
          } catch { /* Preserve other successfully sampled frames. */ }
        }
        if (frames.length) return uniqueFrames(frames);
      } catch (err: any) { console.warn(`[Media] Frame extraction unavailable: ${err.message}`); }
      finally { await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {}); }
    }
  }

  const youtubeId = extractYouTubeVideoId(videoUrl) || (candidateId?.startsWith('yt_') ? candidateId.slice(3) : null);
  const cover = thumbnailUrl || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : undefined);
  if (cover?.startsWith('https://')) {
    try {
      const res = await fetch(cover, { signal: AbortSignal.timeout(5000) });
      const mimeType = (res.headers.get('content-type') || '').split(';')[0];
      if (!mimeType.startsWith('image/')) { await res.body?.cancel(); return []; }
      const buffer = await readBoundedResponse(res, 3 * 1024 * 1024);
      if (buffer && buffer.length > 500) return [{ index: 1, timestamp: '', source: 'thumbnail', label: 'Cover image only - not a video frame', dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}` }];
    } catch { /* No visual evidence is better than fabricated frames. */ }
  }
  return [];
}
