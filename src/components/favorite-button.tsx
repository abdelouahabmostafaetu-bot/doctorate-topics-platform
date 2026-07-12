"use client";

// زر حفظ الموضوع في المفضلة — صغير: نجمة + كلمة حفظ فقط
import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleFavoriteAction } from "@/app/topics/actions";

export function FavoriteButton({
  topicId,
  slug,
  initialFavorited,
  isLoggedIn,
}: {
  topicId: string;
  slug: string;
  initialFavorited: boolean;
  isLoggedIn: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Link
        href="/signin"
        title="سجّل الدخول لحفظ الموضوع في لوحتك"
        className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
      >
        ☆ حفظ
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      title={favorited ? "محفوظ في لوحتك — اضغط للإزالة" : "حفظ الموضوع في لوحتك"}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleFavoriteAction(topicId, slug);
          setFavorited(result.favorited);
        })
      }
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
        favorited
          ? "border-primary bg-primary/10 text-primary"
          : "text-muted-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {pending ? "⏳" : favorited ? "⭐ محفوظ" : "☆ حفظ"}
    </button>
  );
}
