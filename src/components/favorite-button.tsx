"use client";

// زر حفظ الموضوع في المفضلة — لوحة المستخدم الشخصية (v2)
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
        className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
      >
        ☆ سجّل الدخول لحفظ الموضوع
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleFavoriteAction(topicId, slug);
          setFavorited(result.favorited);
        })
      }
      className={`inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
        favorited
          ? "border-primary bg-primary/10 text-primary"
          : "text-muted-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {pending ? "⏳" : favorited ? "⭐ محفوظ في لوحتك" : "☆ حفظ الموضوع"}
    </button>
  );
}
