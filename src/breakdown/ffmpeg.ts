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
      // Download the full short-form video in low resolution (worstvideo/worst/bestvideo).
      // For YouTube shorts and Instagram reels (15-60s), this produces ~1-3MB and finishes in 1-2 seconds.
      // --max-filesize 30M ensures safety against accidental full movies/podcasts.
      const ytDlpCmd = `yt-dlp --no-warnings --no-check-certificates --socket-timeout 15 --max-filesize 35M -f "b/worstvideo/worst/bestvideo" -o "${tempClipPath}" --force-overwrites "${videoUrl}"`;
      await execAsync(ytDlpCmd, { timeout: timeoutMs });
      if (fs.existsSync(tempClipPath) && fs.statSync(tempClipPath).size > 1024) {
        clipDownloaded = true;
      }
    } catch (err: any) {
      console.warn(`[FFmpeg] Full short download failed, trying stream URL fallback: ${err.message}`);
      // Approach B: Resolve direct stream URL and pipe first 45 seconds to ffmpeg
      try {
        const streamUrlRes = await execAsync(`yt-dlp --no-warnings --no-check-certificates --socket-timeout 10 -g -f "worstvideo/b/worst" "${videoUrl}"`, { timeout: 20000 });
        const streamUrl = (streamUrlRes.stdout || '').trim().split('\n')[0];
        if (streamUrl && streamUrl.startsWith('http')) {
          await execAsync(`ffmpeg -nostdin -ss 00:00:00 -i "${streamUrl}" -t 60 -c copy -y "${tempClipPath}"`, { timeout: 20000 });
          if (fs.existsSync(tempClipPath) && fs.statSync(tempClipPath).size > 1024) {
            clipDownloaded = true;
          }
        }
      } catch (streamErr: any) {
        console.warn(`[FFmpeg] yt-dlp video stream note: ${streamErr.message}`);
      }
    }
  }

  // 2. Determine actual video duration using ffprobe
  let videoDuration = 10;
  if (clipDownloaded) {
    try {
      const probeRes = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempClipPath}"`,
        { timeout: 6000 }
      );
      const parsed = parseFloat((probeRes.stdout || '').trim());
      if (parsed && !isNaN(parsed) && parsed > 1) {
        videoDuration = parsed;
      }
    } catch {
      // Fallback duration
    }
  }

  // 3. Define 6 Strategic Timeline Anchor Points across the 0% to 100% video arc
  const samplePoints = [
    {
      sec: 0.0,
      labelSuffix: '(Visual Hook / Thumb-Stop)',
      trigger: 'Pattern interrupt, problem contrast, or provocative text hook',
      retentionScore: 98
    },
    {
      sec: Math.min(1.5, Math.max(0.5, videoDuration * 0.12)),
      labelSuffix: '(Micro-Tension / Curiosity Gap)',
      trigger: 'Pain point exposure & immediate curiosity headline',
      retentionScore: 94
    },
    {
      sec: Math.max(2, videoDuration * 0.35),
      labelSuffix: '(Retention Bridge / Context)',
      trigger: 'Tactile proof or context setup that prevents viewer drop-off',
      retentionScore: 88
    },
    {
      sec: Math.max(3, videoDuration * 0.60),
      labelSuffix: '(Turning Point / Action Escalation)',
      trigger: 'Core technique, active demonstration, or emotional escalation',
      retentionScore: 82
    },
    {
      sec: Math.max(4, videoDuration * 0.82),
      labelSuffix: '(Transformation Climax / Reveal)',
      trigger: 'Peak result, dramatic before/after reveal, or punchline',
      retentionScore: 91
    },
    {
      sec: Math.max(0, videoDuration - 0.4),
      labelSuffix: '(Payoff & Replay Loop Anchor)',
      trigger: 'Final reaction, call-to-action, or seamless loop restart frame',
      retentionScore: 96
    }
  ];

  interface ExtractedFrameFile {
    filePath: string;
    timestamp: string;
    label: string;
    visualTrigger: string;
    retentionScore: number;
  }
  const extractedFrameFiles: ExtractedFrameFile[] = [];

  // 4. Extract genuine high-quality sequential frames across the full timeline
  if (clipDownloaded) {
    for (let i = 0; i < samplePoints.length; i++) {
      const p = samplePoints[i];
      const tsSec = p.sec.toFixed(2);
      const outPath = path.join(tempDir, `timeline_${i}.jpg`);

      try {
        await execAsync(
          `ffmpeg -nostdin -ss ${tsSec} -i "${tempClipPath}" -frames:v 1 -vf "scale=480:-1" -q:v 3 -y "${outPath}"`,
          { timeout: 8000 }
        );

        if (fs.existsSync(outPath) && fs.statSync(outPath).size > 500) {
          const mins = Math.floor(p.sec / 60);
          const secs = Math.floor(p.sec % 60);
          const formattedTs = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

          extractedFrameFiles.push({
            filePath: outPath,
            timestamp: formattedTs,
            label: `${formattedTs} ${p.labelSuffix}`,
            visualTrigger: p.trigger,
            retentionScore: p.retentionScore
          });
        }
      } catch (err: any) {
        console.warn(`[FFmpeg] Error sampling at ${tsSec}s:`, err.message);
      }
    }
  }

  // 5. Direct FFmpeg stream extraction if videoUrl is a direct media file (.mp4, .m3u8)
  if (extractedFrameFiles.length === 0 && videoUrl && (videoUrl.endsWith('.mp4') || videoUrl.endsWith('.m3u8') || videoUrl.includes('blob:'))) {
    try {
      const framePattern = path.join(tempDir, 'direct_frame_%02d.jpg');
      await execAsync(
        `ffmpeg -nostdin -ss 00:00:00 -i "${videoUrl}" -t 15 -vf "fps=1,scale=480:-1" -frames:v ${maxFrames} -q:v 3 "${framePattern}"`,
        { timeout: 15000 }
      );
      const files = (await fs.promises.readdir(tempDir))
        .filter((f) => f.startsWith('direct_frame_') && f.endsWith('.jpg'))
        .sort();

      for (let i = 0; i < files.length; i++) {
        extractedFrameFiles.push({
          filePath: path.join(tempDir, files[i]),
          timestamp: `00:0${i}`,
          label: `00:0${i} (Stream Keyframe ${i + 1})`,
          visualTrigger: 'Direct stream keyframe',
          retentionScore: 90
        });
      }
    } catch (err: any) {
      console.warn(`[FFmpeg] Direct stream error: ${err.message}`);
    }
  }

  // 6. Honest Fallback: NO FAKE / CROPPED FRAMES.
  // If the video stream is blocked, private, or unreachable, return only 1 genuine cover thumbnail
  // clearly marked so the user and AI know it is a static thumbnail, not video frames.
  if (extractedFrameFiles.length === 0 && thumbnailUrl && thumbnailUrl.startsWith('http')) {
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

  // 7. Transform into ExtractedVideoFrame objects with base64 data URLs
  const resultFrames: ExtractedVideoFrame[] = [];

  for (let i = 0; i < extractedFrameFiles.length; i++) {
    try {
      const item = extractedFrameFiles[i];
      const buffer = await fs.promises.readFile(item.filePath);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      resultFrames.push({
        index: i + 1,
        timestamp: item.timestamp,
        dataUrl,
        label: item.label,
        visualTrigger: item.visualTrigger,
        retentionScore: item.retentionScore
      });
    } catch (err: any) {
      console.warn(`[FFmpeg] Error converting frame ${extractedFrameFiles[i].filePath} to base64:`, err.message);
    }
  }

  // 8. Clean up temporary directory to avoid disk bloat
  try {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup error
  }

  return resultFrames;
}
