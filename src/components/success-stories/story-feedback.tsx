"use client";

import { useEffect, useState } from "react";

export function StoryFeedback({
  slug,
  initialLikes,
  initialViews,
}: {
  slug: string;
  initialLikes: number;
  initialViews: number;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [views, setViews] = useState(initialViews);
  const [liked, setLiked] = useState(false);
  const [notice, setNotice] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/success-stories/${slug}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "view" }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.views === "number") setViews(data.views);
      })
      .catch(() => undefined);
  }, [slug]);

  async function like() {
    if (loading || liked) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/success-stories/${slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "like" }),
      });
      const data = await response.json();
      if (typeof data.likes === "number") setLikes(data.likes);
      if (data.liked) setLiked(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-7 space-y-3">
      {notice && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/45 bg-amber-50 px-4 py-3 text-right dark:bg-amber-950/20">
          <span className="mt-0.5 text-base">💛</span>
          <p className="flex-1 text-xs leading-6 text-amber-950 dark:text-amber-100">
            ضع إعجابًا لصاحب هذه التجربة الملهمة؛ لعلّ السنة القادمة يكون دورك
            لتروي نجاحك في موقعنا.
          </p>
          <button
            onClick={() => setNotice(false)}
            aria-label="إخفاء التنبيه"
            className="text-lg leading-none text-amber-800/70 transition hover:text-amber-900 dark:text-amber-100"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-4 dark:border-border">
        <button
          onClick={like}
          disabled={loading || liked}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition ${liked ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:-translate-y-0.5 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200"}`}
        >
          <span className="text-base">{liked ? "♥" : "♡"}</span>
          {liked ? "شكرًا لإعجابك" : "أعجبتني التجربة"}
          <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px]">
            {likes}
          </span>
        </button>
        <span className="text-xs text-muted-foreground">
          👁️ {views} قارئًا لهذه التجربة
        </span>
      </div>
    </div>
  );
}
