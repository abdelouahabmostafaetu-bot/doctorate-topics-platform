"use client";

// يُثبَّت في صفحة /changelog لتسجيل وقت آخر زيارة، لإخفاء نقطة التنبيه بعد ذلك
import { useEffect } from "react";
import { CHANGELOG_SEEN_KEY } from "@/components/changelog-badge";

export function ChangelogVisitMarker() {
  useEffect(() => {
    window.localStorage.setItem(CHANGELOG_SEEN_KEY, new Date().toISOString());
  }, []);
  return null;
}
