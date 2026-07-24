// "My Notes" page — SUPER_ADMIN only
// Reads all notebooks and notes from the legacy mylibrary database
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadMyNotesData } from "@/lib/mylibrary";
import { NotesClient } from "./notes-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "📝 My Notes — Admin",
};

export default async function AdminNotesPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin");

  try {
    const data = await loadMyNotesData();
    return <NotesClient initialData={data} />;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <div className="text-3xl">🔌</div>
        <h2 className="mt-2 text-base font-bold">Could not connect to the mylibrary database</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Make sure <code className="rounded bg-muted px-1">DATABASE_URL_MYLIBRARY</code> exists
          in your local <code className="rounded bg-muted px-1">.env</code> file and in the
          Environment Variables on Vercel, and that the server IP is allowed in Network Access
          on MongoDB Atlas.
        </p>
      </div>
    );
  }
}
