'use client';

import React from 'react';
import { Play, Volume2, Music, Video as VideoIcon } from 'lucide-react';

interface VideoProps {
  src: string;
  type?: 'youtube' | 'vimeo' | 'local';
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
}

export function Video({ src, type = 'local', poster, autoplay = false, loop = false }: VideoProps) {
  // Auto-detect type if not provided
  let videoType = type;
  if (src.includes('youtube.com') || src.includes('youtu.be')) videoType = 'youtube';
  else if (src.includes('vimeo.com')) videoType = 'vimeo';

  if (videoType === 'youtube') {
    const videoId = src.includes('v=') ? src.split('v=')[1]?.split('&')[0] : src.split('/').pop();
    return (
      <div className="my-8 aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  if (videoType === 'vimeo') {
    const videoId = src.split('/').pop();
    return (
      <div className="my-8 aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${videoId}`}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  return (
    <div className="my-8 group relative rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl">
      <video
        src={src}
        poster={poster}
        controls
        autoPlay={autoplay}
        loop={loop}
        className="w-full aspect-video object-contain"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

interface AudioProps {
  src: string;
  title?: string;
}

export function Audio({ src, title }: AudioProps) {
  return (
    <div className="my-6 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-center gap-4 group hover:bg-white/10 transition-colors">
      <div className="p-3 rounded-full bg-primary/20 text-primary border border-primary/20 group-hover:scale-110 transition-transform">
        <Music className="w-5 h-5 font-bold" />
      </div>
      <div className="flex-1 min-w-0">
        {title && <h5 className="text-sm font-medium text-foreground mb-2 truncate">{title}</h5>}
        <audio 
          controls 
          src={src} 
          className="w-full h-8 brightness-90 contrast-125 invert dark:invert-0"
        >
          Your browser does not support the audio tag.
        </audio>
      </div>
    </div>
  );
}
