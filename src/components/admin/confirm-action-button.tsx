"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function ConfirmActionButton({
  action,
  confirmText,
  label,
  pendingLabel = "...",
  redirectTo,
  className,
}: {
  action: () => Promise<void>;
  confirmText: string;
  label: string;
  pendingLabel?: string;
  redirectTo?: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        startTransition(async () => {
          await action();
          if (redirectTo) router.push(redirectTo);
        });
      }}
      className={
        className ??
        "rounded-md border px-2 py-1 text-xs transition hover:border-destructive hover:text-destructive disabled:opacity-50"
      }
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
