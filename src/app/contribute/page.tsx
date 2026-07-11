import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContributionForm } from "@/components/contribute/contribution-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ø³Ø§Ù‡Ù… Ù…Ø¹Ù†Ø§ â€” Ù…Ù†ØµØ© Ù…ÙˆØ§Ø¶ÙŠØ¹ Ø¯ÙƒØªÙˆØ±Ø§Ù‡ Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ§Øª",
};

const statusLabel: Record<string, string> = {
  pending: "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
  accepted: "Ù…Ù‚Ø¨ÙˆÙ„Ø©",
  duplicate: "Ù…ÙƒØ±Ø±Ø©",
  rejected: "Ù…Ø±ÙÙˆØ¶Ø©",
};

const statusClass: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  accepted:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  duplicate: "bg-secondary text-secondary-foreground",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export default async function ContributePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">ðŸŒ± Ø³Ø§Ù‡Ù… Ù…Ø¹Ù†Ø§</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Ù‡Ø°Ø§ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø«Ù…Ø±Ø© Ø³Ù†ÙˆØ§Øª Ù…Ù† Ø§Ù„Ø¹Ù…Ù„ØŒ ÙˆÙƒÙ„ Ù…Ø³Ø§Ù‡Ù…Ø© Ù…Ù†Ùƒ ØªØ¬Ø¹Ù„Ù‡ Ø£ÙØ¶Ù„. Ù„Ù„Ù…Ø³Ø§Ù‡Ù…Ø©
          Ø¨Ù…ÙˆØ¶ÙˆØ¹ Ø£Ùˆ Ø­Ù„ØŒ ÙŠØ¬Ø¨ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø£ÙˆÙ„Ù‹Ø§ Ø­ØªÙ‰ Ù†ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ø­ØªØ³Ø§Ø¨ Ù†Ù‚Ø§Ø·Ùƒ ÙˆØ´ÙƒØ±Ùƒ
          Ø¨Ø§Ø³Ù…Ùƒ.
        </p>
        <Link
          href="/signin"
          className="mt-6 inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„
        </Link>
      </main>
    );
  }

  const sp = await searchParams;
  const userId = session.user.id ?? "";
  const [me, mine, universities, specialties] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.contribution.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.specialty.findMany({ orderBy: { nameAr: "asc" } }),
  ]);
  const points = me?.points ?? 0;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold">ðŸŒ± Ø³Ø§Ù‡Ù… Ù…Ø¹Ù†Ø§</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Ø´Ø§Ø±Ùƒ Ù…ÙˆØ¶ÙˆØ¹Ù‹Ø§ Ø¬Ø¯ÙŠØ¯Ù‹Ø§ Ø£Ùˆ Ø­Ù„Ù‹Ø§ Ù„Ù…ÙˆØ¶ÙˆØ¹ Ù…ÙˆØ¬ÙˆØ¯. Ø§Ø®ØªØ± Ø§Ù„Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø© Ù„Ùƒ:
          ÙƒØªØ§Ø¨Ø© Ù…Ø¨Ø§Ø´Ø±Ø© Ø¨ØµÙŠØºØ© LaTeXØŒ Ø£Ùˆ Ø±ÙØ¹ Ù…Ù„Ù.
        </p>
      </header>

      {sp.submitted === "1" && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-center text-sm">
          âœ… ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ù…Ø³Ø§Ù‡Ù…ØªÙƒ Ø¨Ù†Ø¬Ø§Ø­. Ø³ØªØ¸Ù‡Ø± Ø¨Ø¹Ø¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-primary">â­ {points}</p>
          <p className="mt-1 text-sm text-muted-foreground">Ø±ØµÙŠØ¯Ùƒ Ù…Ù† Ø§Ù„Ù†Ù‚Ø§Ø·</p>
          <Link
            href="/contributors"
            className="mt-2 inline-block text-sm text-primary underline-offset-2 hover:underline"
          >
            Ù„ÙˆØ­Ø© Ø£ÙØ¶Ù„ Ø§Ù„Ù…Ø³Ø§Ù‡Ù…ÙŠÙ† â†
          </Link>
        </div>
        <div className="rounded-lg border bg-card p-4 text-sm leading-7 text-muted-foreground shadow-sm">
          â­ Ù†Ø¸Ø§Ù… Ø§Ù„Ù†Ù‚Ø§Ø·: Ù…ÙˆØ¶ÙˆØ¹ Ø¬Ø¯ÙŠØ¯ Ù…Ø¹ Ø§Ù„Ø­Ù„ <strong>+10</strong> â€” Ù…ÙˆØ¶ÙˆØ¹ Ø¨Ø¯ÙˆÙ†
          Ø­Ù„ Ø£Ùˆ Ø­Ù„ Ù„Ù…ÙˆØ¶ÙˆØ¹ Ù…ÙˆØ¬ÙˆØ¯ <strong>+5</strong> â€” Ù…ÙˆØ¶ÙˆØ¹ Ù…ÙƒØ±Ø±{" "}
          <strong>0</strong> (Ù…Ø¹ Ø§Ù„Ø´ÙƒØ±!). ØªÙØ­ØªØ³Ø¨ Ø§Ù„Ù†Ù‚Ø§Ø· Ø¨Ø¹Ø¯ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©.
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
        <ContributionForm
          universities={universities.map((u) => ({
            id: u.id,
            name: u.name,
            nameAr: u.nameAr,
          }))}
          specialties={specialties.map((s) => ({
            id: s.id,
            name: s.name,
            nameAr: s.nameAr,
          }))}
        />
      </div>

      {mine.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">ðŸ“‹ Ù…Ø³Ø§Ù‡Ù…Ø§ØªÙŠ</h2>
          <div className="space-y-2">
            {mine.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-4 py-2 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.createdAt.toLocaleDateString("ar-DZ")}
                    {(c.pointsAwarded ?? 0) > 0
                      ? " â€” +" + c.pointsAwarded + " Ù†Ù‚Ø§Ø·"
                      : ""}
                  </span>
                </span>
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs " +
                    (statusClass[c.status] ?? "")
                  }
                >
                  {statusLabel[c.status] ?? c.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/latex-guide" className="text-primary hover:underline">
          ðŸ“– Ø¯Ù„ÙŠÙ„ ÙƒØªØ§Ø¨Ø© LaTeX
        </Link>
      </p>
    </main>
  );
}

