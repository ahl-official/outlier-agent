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
  const timeoutMs = options?.timeoutMs || 15000;

  const tempDir = path.join(os.tmpdir(), `outlier_ffmpeg_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  await fs.promises.mkdir(tempDir, { recursive: true });

  const tempClipPath = path.join(tempDir, 'sample_clip.mp4');
  let clipDownloaded = false;

  // 1. Attempt rapid clip sampling via yt-dlp
  if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('instagram.com'))) {
    try {
      // Download lowest resolution first 6 seconds for maximum speed (typically ~100-300KB)
      const ytDlpCmd = `yt-dlp --no-warnings --no-check-certificates --download-sections "*0-${sampleDuration}" -f "worstvideo[ext=mp4]/worstvideo/worst" -o "${tempClipPath}" --force-overwrites "${videoUrl}"`;
      await execAsync(ytDlpCmd, { timeout: timeoutMs });
      if (fs.existsSync(tempClipPath) && fs.statSync(tempClipPath).size > 1024) {
        clipDownloaded = true;
      }
    } catch (err: any) {
      console.warn(`[FFmpeg] yt-dlp video snippet download note for ${videoUrl}: ${err.message}`);
    }
  }

  const frameFiles: string[] = [];

  // 2. Extract frames from clip if downloaded
  if (clipDownloaded) {
    try {
      const framePattern = path.join(tempDir, 'frame_%02d.jpg');
      // -nostdin prevents ffmpeg from hanging on Windows terminals; scale to 480w keeping aspect ratio
      const ffmpegCmd = `ffmpeg -nostdin -i "${tempClipPath}" -vf "fps=1,scale=480:-1" -q:v 3 -y "${framePattern}"`;
      await execAsync(ffmpegCmd, { timeout: 8000 });

      const files = (await fs.promises.readdir(tempDir))
        .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
        .sort();

      for (const f of files.slice(0, maxFrames)) {
        frameFiles.push(path.join(tempDir, f));
      }
    } catch (err: any) {
      console.warn(`[FFmpeg] Clip extraction failed, will attempt fallback: ${err.message}`);
    }
  }

  // 3. Fallback: If video download failed, extract / slice from high-res thumbnail
  if (frameFiles.length === 0 && thumbnailUrl && thumbnailUrl.startsWith('http')) {
    try {
      const tempThumbPath = path.join(tempDir, 'thumb.jpg');
      const thumbRes = await fetch(thumbnailUrl);
      if (thumbRes.ok) {
        const arrayBuf = await thumbRes.arrayBuffer();
        await fs.promises.writeFile(tempThumbPath, Buffer.from(arrayBuf));

        // Generate primary keyframe and zoomed/macro crops using ffmpeg filters
        const f1 = path.join(tempDir, 'frame_01.jpg');
        const f2 = path.join(tempDir, 'frame_02.jpg');
        const f3 = path.join(tempDir, 'frame_03.jpg');

        await execAsync(`ffmpeg -nostdin -i "${tempThumbPath}" -vf "scale=480:-1" -q:v 3 -y "${f1}"`);
        await execAsync(`ffmpeg -nostdin -i "${tempThumbPath}" -vf "crop=in_w*0.7:in_h*0.7:in_w*0.15:in_h*0.15,scale=480:-1" -q:v 3 -y "${f2}"`);
        await execAsync(`ffmpeg -nostdin -i "${tempThumbPath}" -vf "crop=in_w*0.5:in_h*0.5:in_w*0.25:in_h*0.1,scale=480:-1" -q:v 3 -y "${f3}"`);

        if (fs.existsSync(f1)) frameFiles.push(f1);
        if (fs.existsSync(f2)) frameFiles.push(f2);
        if (fs.existsSync(f3)) frameFiles.push(f3);

        // Serverless Vercel fallback: if ffmpeg binary wasn't found in PATH, use raw thumb
        if (frameFiles.length === 0 && fs.existsSync(tempThumbPath)) {
          frameFiles.push(tempThumbPath);
        }
      }
    } catch (err: any) {
      console.warn(`[FFmpeg] Thumbnail frame fallback error: ${err.message}`);
    }
  }

  // 4. Absolute fallback: if still no frames but thumbnailUrl exists, fetch buffer directly
  if (frameFiles.length === 0 && thumbnailUrl && thumbnailUrl.startsWith('http')) {
    try {
      const res = await fetch(thumbnailUrl);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
        return [
          {
            index: 1,
            timestamp: '00:00',
            dataUrl,
            label: '00:00 (Visual Hook Keyframe)',
            visualTrigger: 'Primary visual pattern interrupt and curiosity trigger'
          }
        ];
      }
    } catch (e) {
      // Ignore
    }
  }

  // 4. Transform into ExtractedVideoFrame objects with base64 data URLs
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
