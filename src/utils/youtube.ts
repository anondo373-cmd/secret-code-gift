/**
 * Extracts the 11-character YouTube Video ID from any YouTube or YouTube Music URL.
 * Supports:
 * - https://youtu.be/2Vv-BfVoq4g
 * - https://www.youtube.com/watch?v=2Vv-BfVoq4g
 * - https://music.youtube.com/watch?v=2Vv-BfVoq4g
 * - https://www.youtube.com/embed/2Vv-BfVoq4g
 * - https://www.youtube.com/shorts/2Vv-BfVoq4g
 */
export function extractYouTubeId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Direct 11-char ID if someone pasted just the ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (
        (pathParts[0] === 'embed' ||
          pathParts[0] === 'shorts' ||
          pathParts[0] === 'v' ||
          pathParts[0] === 'live') &&
        pathParts[1] &&
        /^[a-zA-Z0-9_-]{11}$/.test(pathParts[1])
      ) {
        return pathParts[1];
      }
    }
  } catch {
    // Fallback regex match if URL lacks protocol
    const match = trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/
    );
    if (match?.[1]) return match[1];
  }

  return null;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export interface YouTubeMetadata {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

export async function fetchYouTubeMetadata(
  videoId: string
): Promise<YouTubeMetadata | null> {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      watchUrl
    )}&format=json`;
    const resp = await fetch(oembedUrl);
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      title: data.title || '',
      author_name: data.author_name || '',
      thumbnail_url:
        data.thumbnail_url || getYouTubeThumbnailUrl(videoId),
    };
  } catch {
    return null;
  }
}
