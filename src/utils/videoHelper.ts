/**
 * Video Helper Utility:
 * Parses direct video URLs and social media links (YouTube Shorts/Videos,
 * Instagram Reels, Facebook Videos, Vimeo) to generate proper embed players and thumbnails.
 */

export interface ParsedVideo {
  type: 'youtube' | 'instagram' | 'facebook' | 'vimeo' | 'direct';
  videoId?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  originalUrl: string;
}

/**
 * Extracts YouTube Video or Shorts ID from multiple URL formats.
 */
export const getYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  return match ? match[1] : null;
};

/**
 * Extracts Instagram Reel or Post ID.
 */
export const getInstagramId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : null;
};

/**
 * Extracts Vimeo Video ID.
 */
export const getVimeoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match ? match[1] : null;
};

/**
 * Comprehensive parser for any video URL.
 */
export const parseVideoUrl = (
  rawUrl: string,
  options: { autoplay?: boolean; muted?: boolean; loop?: boolean } = {}
): ParsedVideo => {
  const url = (rawUrl || '').trim();
  const autoplay = options.autoplay ?? true;
  const muted = options.muted ?? true;
  const loop = options.loop ?? true;

  if (!url) {
    return { type: 'direct', originalUrl: '' };
  }

  // 1. YouTube Shorts or Videos
  const ytId = getYouTubeId(url);
  if (ytId) {
    const autoParam = autoplay ? '1' : '0';
    const muteParam = muted ? '1' : '0';
    const loopParam = loop ? `1&playlist=${ytId}` : '0';

    return {
      type: 'youtube',
      videoId: ytId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=${autoParam}&mute=${muteParam}&loop=${loopParam}&playsinline=1&controls=1&modestbranding=1&rel=0&enablejsapi=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      originalUrl: url
    };
  }

  // 2. Instagram Reels
  const igId = getInstagramId(url);
  if (igId) {
    return {
      type: 'instagram',
      videoId: igId,
      embedUrl: `https://www.instagram.com/reel/${igId}/embed/`,
      thumbnailUrl: '',
      originalUrl: url
    };
  }

  // 3. Vimeo Videos
  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    const autoParam = autoplay ? '1' : '0';
    const muteParam = muted ? '1' : '0';
    const loopParam = loop ? '1' : '0';

    return {
      type: 'vimeo',
      videoId: vimeoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=${autoParam}&muted=${muteParam}&loop=${loopParam}&playsinline=1`,
      thumbnailUrl: '',
      originalUrl: url
    };
  }

  // 4. Facebook Videos / Reels
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    return {
      type: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=${autoplay ? '1' : '0'}`,
      thumbnailUrl: '',
      originalUrl: url
    };
  }

  // 5. Direct MP4 / HLS / CDN URL
  return {
    type: 'direct',
    originalUrl: url
  };
};

/**
 * Returns a high quality thumbnail for any video URL if available.
 */
export const getAutoThumbnail = (videoUrl: string, fallbackThumb?: string): string => {
  const parsed = parseVideoUrl(videoUrl);
  if (parsed.thumbnailUrl) {
    return parsed.thumbnailUrl;
  }
  return fallbackThumb || '';
};
