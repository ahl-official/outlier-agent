/**
 * Normalizes a YouTube/Instagram URL down to a stable platform:id key, so the same video
 * posted with different query params/shorteners still matches the same tracker sheet row.
 */
export function normalizeVideoUrl(url: string): string {
  if (!url) return '';
  try {
    const raw = url.trim();
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);

    // YouTube variations: watch?v=, youtu.be/, /shorts/
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      if (parsed.hostname.includes('youtu.be')) {
        const videoId = parsed.pathname.replace(/^\//, '').split('/')[0]?.split('?')[0];
        if (videoId) return `yt:${videoId}`;
      }
      if (parsed.pathname.includes('/shorts/')) {
        const shortId = parsed.pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0];
        if (shortId) return `yt:${shortId}`;
      }
      const v = parsed.searchParams.get('v');
      if (v) return `yt:${v}`;
    }

    // Instagram variations: /reel/CODE/, /p/CODE/
    if (parsed.hostname.includes('instagram.com')) {
      const match = parsed.pathname.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      if (match && match[2]) {
        return `ig:${match[2]}`;
      }
    }

    return (parsed.origin + parsed.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}
