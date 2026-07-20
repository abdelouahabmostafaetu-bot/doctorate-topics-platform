"use client";

import { useState } from "react";

function getVideoId(src: string) {
  const match = src.match(/\/embed\/([A-Za-z0-9_-]{6,})/);
  return match?.[1] ?? "";
}

export function EmbeddedYoutube({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  const videoId = getVideoId(src);
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

  return (
    <span
      dir="rtl"
      className="my-8 block overflow-hidden rounded-2xl border border-border/70 bg-black shadow-lg shadow-black/10"
    >
      <span className="relative block aspect-video w-full bg-zinc-950">
        {playing ? (
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 h-full w-full cursor-pointer overflow-hidden"
            aria-label={`تشغيل الفيديو: ${title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt={title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:opacity-80"
            />
            <span className="absolute inset-0 bg-black/20 transition group-hover:bg-black/35" />
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 text-2xl text-white shadow-xl transition group-hover:scale-110 sm:h-20 sm:w-20 sm:text-3xl">
              <span className="translate-x-0.5">▶</span>
            </span>
          </button>
        )}
      </span>
      <span className="block border-t border-white/10 bg-zinc-950 px-4 py-3 text-center text-xs font-medium text-zinc-200 sm:text-sm">
        ▶ {title}
      </span>
    </span>
  );
}
