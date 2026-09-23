import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { listCoffeeMessages } from "@/lib/coffee/messages"
import { ConfirmActionButton } from "@/components/admin/confirm-action-button"
import {
  deleteCoffeeMessageAction,
  markCoffeeMessageReadAction,
} from "./actions"

export const dynamic = "force-dynamic"

export default async function AdminCoffeeMessagesPage() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/admin")

  const messages = await listCoffeeMessages()
  const unread = messages.filter((message) => !message.readAt).length

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">💬 رسائل قهوة الدكتوراه</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            رسائل خاصة يرسلها الزوار من صفحة القهوة. لا تظهر هذه الرسائل للعامة.
          </p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {unread} غير مقروءة · {messages.length} إجمالًا
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          لا توجد رسائل بعد. ستظهر هنا رسائل الزوار عندما يكتبون من صفحة قهوة الدكتوراه.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <article key={String(message._id)} className={`rounded-xl border bg-card p-4 ${message.readAt ? "" : "border-primary/50 shadow-sm"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <span>{message.name || message.userName || "زائر"}</span>
                    {!message.readAt && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">جديدة</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground" dir="ltr">
                    {message.email && <span>{message.email}</span>}
                    <span>{message.createdAt.toLocaleString("ar-DZ")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!message.readAt && (
                    <form action={markCoffeeMessageReadAction.bind(null, String(message._id))}>
                      <button type="submit" className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted">
                        تمّت القراءة
                      </button>
                    </form>
                  )}
                  <ConfirmActionButton
                    action={deleteCoffeeMessageAction.bind(null, String(message._id))}
                    confirmText="حذف هذه الرسالة نهائيًا؟"
                    label="حذف"
                  />
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/90">{message.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
