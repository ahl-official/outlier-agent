/** Gemini Files API for videos that cannot fit in an inline JSON request. */
export interface VideoMedia { buffer: Buffer; mimeType: string; }
export interface PreparedVideo {
  part: { inlineData: { mimeType: string; data: string } } | { fileData: { mimeType: string; fileUri: string } };
  cleanup: () => Promise<void>;
}

const API = 'https://generativelanguage.googleapis.com';
const INLINE_MAX_BYTES = 18 * 1024 * 1024;

export async function prepareGeminiVideo(video: VideoMedia, apiKey: string): Promise<PreparedVideo> {
  if (video.buffer.length <= INLINE_MAX_BYTES) {
    return { part: { inlineData: { mimeType: video.mimeType, data: video.buffer.toString('base64') } }, cleanup: async () => {} };
  }
  const headers = { 'x-goog-api-key': apiKey };
  let name: string | undefined;
  const cleanup = async () => {
    if (name) await fetch(`${API}/v1beta/${name}`, { method: 'DELETE', headers, signal: AbortSignal.timeout(4000) }).catch(() => {});
  };
  try {
    const start = await fetch(`${API}/upload/v1beta/files`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(video.buffer.length), 'X-Goog-Upload-Header-Content-Type': video.mimeType },
      body: JSON.stringify({ file: { display_name: 'Outlier video analysis' } }),
      signal: AbortSignal.timeout(5000)
    });
    if (!start.ok) throw new Error(`Video upload initialization failed (${start.status})`);
    const uploadUrl = start.headers.get('x-goog-upload-url');
    if (!uploadUrl || new URL(uploadUrl).origin !== API) throw new Error('Video service returned an invalid upload destination');
    const uploaded = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': video.mimeType, 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
      body: new Uint8Array(video.buffer),
      signal: AbortSignal.timeout(40000)
    });
    if (!uploaded.ok) throw new Error(`Video upload failed (${uploaded.status})`);
    let file = (await uploaded.json()).file;
    if (!/^files\/[a-zA-Z0-9_-]+$/.test(file?.name || '')) throw new Error('Video upload returned no valid file');
    name = file.name;
    const deadline = Date.now() + 30000;
    while (file.state === 'PROCESSING' && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await fetch(`${API}/v1beta/${name}`, { headers, signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw new Error(`Video processing check failed (${response.status})`);
      file = await response.json();
    }
    if (file.state !== 'ACTIVE' || typeof file.uri !== 'string') throw new Error('Video is not ready for analysis yet');
    return { part: { fileData: { mimeType: video.mimeType, fileUri: file.uri } }, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
