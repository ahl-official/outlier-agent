import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ExtractedVideoFrame } from '../types';

const execAsync = promisify(exec);

export interface FrameExtractionOptions {
  maxFrames?: number;
  sampleDurationSeconds?: number;
  timeoutMs?: number;
}

/**
 * Extracts key frames from a video URL (YouTube, Instagram, or direct video) using FFmpeg and yt-dlp.
 * Returns base64 encoded data URLs for multimodal AI analysis and dashboard preview.
 */
export async function extractFramesWithFfmpeg(
  videoUrl: string,
  thumbnailUrl?: string,
  candidateId?: string,
  options?: FrameExtractionOptions
): Promise<ExtractedVideoFrame[]> {
  const maxFrames = options?.maxFrames || 6;
  const sampleDuration = options?.sampleDurationSeconds || 6;
  const timeoutMs = options?.timeoutMs || 35000;

  const tempDir = path.join(os.tmpdir(), `outlier_ffmpeg_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  await fs.promises.mkdir(tempDir, { recursive: true });

  const tempClipPath = path.join(tempDir, 'sample_clip.mp4');
  let clipDownloaded = false;

  // 1. Attempt rapid video clip download or direct stream URL via yt-dlp
  if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('instagram.com'))) {
    try {
      const isInstagram = videoUrl.includes('instagram.com');
      // For Instagram: Do NOT pass --download-sections because Instagram CDN blocks FFmpeg HTTP clients with Error -138.
      // yt-dlp downloads the whole 1-3MB reel in < 1 second directly, then local FFmpeg slices the frames.
      // For YouTube: --download-sections works smoothly because YouTube CDN supports FFmpeg byte ranges.
      const sectionArg = isInstagram ? '' : `--download-sections "*0-${sampleDuration}"`;
      const ytDlpCmd = `yt-dlp --no-warnings --no-check-certificates --socket-timeout 15 ${sectionArg} -f "b/worstvideo/worst/bestvideo" -o "${tempClipPath}" --force-overwrites "${videoUrl}"`;
      await execAsync(ytDlpCmd, { timeout: timeoutMs });
      if (fs.existsSync(tempClipPath) && fs.statSync(tempClipPath).size > 1024) {
        clipDownloaded = true;
      }
    } catch (err: any) {
      console.warn(`[FFmpeg] Fast section download failed, trying stream URL fallback: ${err.message}`);
      // Approach B: Resolve direct stream URL and pipe first seconds to ffmpeg
      try {
        const streamUrlRes = await execAsync(`yt-dlp --no-warnings --no-check-certificates --socket-timeout 10 -g -f "worstvideo/b/worst" "${videoUrl}"`, { timeout: 20000 });
        const streamUrl = (streamUrlRes.stdout || '').trim().split('\n')[0];
        if (streamUrl && streamUrl.startsWith('http')) {
          await execAsync(`ffmpeg -nostdin -ss 00:00:00 -i "${streamUrl}" -t ${sampleDuration} -c copy -y "${tempClipPath}"`, { timeout: 15000 });
          if (fs.existsSync(tempClipPath) && fs.statSync(tempClipPath).size > 1024) {
            clipDownloaded = true;
          }
        }
      } catch (streamErr: any) {
        console.warn(`[FFmpeg] yt-dlp video stream note: ${streamErr.message}`);
      }
    }
  }

  const frameFiles: string[] = [];

  // 2. Extract sequential genuine frames from the downloaded video clip
  if (clipDownloaded) {
    try {
      const framePattern = path.join(tempDir, 'frame_%02d.jpg');
      // Extract 1 frame per second across the sample duration (produces 5-6 real frames)
      const ffmpegCmd = `ffmpeg -nostdin -i "${tempClipPath}" -vf "fps=1,scale=480:-1" -frames:v ${maxFrames} -q:v 3 -y "${framePattern}"`;
      await execAsync(ffmpegCmd, { timeout: 15000 });

      const files = (await fs.promises.readdir(tempDir))
        .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
        .sort();

      for (const f of files.slice(0, maxFrames)) {
        frameFiles.push(path.join(tempDir, f));
      }
    } catch (err: any) {
      console.warn(`[FFmpeg] Video frame extraction failed: ${err.message}`);
    }
  }

  // 3. Direct FFmpeg stream extraction if videoUrl is a direct media file (.mp4, .m3u8)
  if (frameFiles.length === 0 && videoUrl && (videoUrl.endsWith('.mp4') || videoUrl.endsWith('.m3u8') || videoUrl.includes('blob:'))) {
    try {
      const framePattern = path.join(tempDir, 'direct_frame_%02d.jpg');
      await execAsync(
        `ffmpeg -nostdin -ss 00:00:00 -i "${videoUrl}" -t ${sampleDuration} -vf "fps=1,scale=480:-1" -frames:v ${maxFrames} -q:v 3 "${framePattern}"`,
        { timeout: 15000 }
      );
      const files = (await fs.promises.readdir(tempDir))
        .filter((f) => f.startsWith('direct_frame_') && f.endsWith('.jpg'))
        .sort();

      for (const f of files.slice(0, maxFrames)) {
        frameFiles.push(path.join(tempDir, f));
      }
    } catch (err: any) {
      console.warn(`[FFmpeg] Direct stream error: ${err.message}`);
    }
  }

  // 4. Honest Fallback: NO FAKE / CROPPED FRAMES.
  // If the video stream is blocked, private, or unreachable, return only 1 genuine cover thumbnail
  // clearly marked so the user and AI know it is a static thumbnail, not video frames.
  if (frameFiles.length === 0 && thumbnailUrl && thumbnailUrl.startsWith('http')) {
    try {
      const res = await fetch(thumbnailUrl);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
        return [{
          index: 1,
          timestamp: '00:00',
          dataUrl,
          label: '00:00 (Cover Thumbnail - Video Stream Unreachable)',
          visualTrigger: 'Platform cover image (stream blocked or private)',
          retentionScore: 90
        }];
      }
    } catch (e) {
      // Ignore
    }
  }

  // 5. Transform into ExtractedVideoFrame objects with base64 data URLs
  const resultFrames: ExtractedVideoFrame[] = [];
  const labels = [
    '00:00 (Visual Hook Frame)',
    '00:01 (Thumb-Stop Transition)',
    '00:02 (Micro-Tension / Problem)',
    '00:03 (Craftsmanship / Process)',
    '00:04 (Transformation Climax)',
    '00:05 (Payoff & Replay Anchor)'
  ];

  for (let i = 0; i < frameFiles.length; i++) {
    try {
      const filePath = frameFiles[i];
      const buffer = await fs.promises.readFile(filePath);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      resultFrames.push({
        index: i + 1,
        timestamp: `00:0${i}`,
        dataUrl,
        label: labels[i] || `00:0${i} (Keyframe ${i + 1})`,
        visualTrigger: i === 0 ? 'First-frame curiosity gap' : i === 1 ? 'High-contrast texture switch' : 'Resolution and reveal'
      });
    } catch (err: any) {
      console.warn(`[FFmpeg] Error converting frame ${frameFiles[i]} to base64:`, err.message);
    }
  }

  // 5. Clean up temporary directory to avoid disk bloat
  try {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup error
  }

  return resultFrames;
}
