import React from 'react';
import { parseVideoUrl } from '../../utils/videoHelper';

interface UniversalVideoPlayerProps {
  url: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: () => void;
}

export const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  url,
  poster,
  autoPlay = true,
  muted = true,
  loop = true,
  className = 'w-full h-full object-cover',
  videoRef,
  onPlay,
  onPause,
  onError
}) => {
  const parsed = parseVideoUrl(url, { autoplay: autoPlay, muted, loop });

  // If social media or YouTube embed
  if (parsed.type !== 'direct' && parsed.embedUrl) {
    return (
      <iframe
        key={`${parsed.embedUrl}_${muted ? '1' : '0'}`}
        src={parsed.embedUrl}
        title="Video Player"
        className={`w-full h-full border-0 ${className}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  // Direct MP4 / Video stream
  return (
    <video
      ref={videoRef}
      key={url}
      src={url}
      poster={poster || parsed.thumbnailUrl}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline
      preload="auto"
      className={className}
      onPlay={onPlay}
      onPause={onPause}
      onError={onError}
    />
  );
};
