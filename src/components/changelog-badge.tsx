"use client";

// نقطة تنبيه صغيرة على رابط "جديدنا" عند وجود تحديثات لم يرها المستخدم (FR-803)
import { useEffect, useState } from "react";

export const CHANGELOG_SEEN_KEY = "changelog:lastSeenAt";

export function ChangelogBadge({
  latestPublishedAt,
}: {
  latestPublishedAt: string | null;
}) {
  const [showDot, setShowDot] = useState(false);

  useEffect(() => {
    if (!latestPublishedAt) return;
    const lastSeen = window.localStorage.getItem(CHANGELOG_SEEN_KEY);
    if (!lastSeen || new Date(latestPublishedAt) > new Date(lastSeen)) {
      setShowDot(true);
    }
  }, [latestPublishedAt]);

  if (!showDot) return null;
  return (
    <span className="ms-1 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" />
  );
}
