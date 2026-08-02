"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Markdown from "@/components/coffee/Markdown"

export type CurrentUser = {
	id: string
	name: string
	image?: string | null
	isAdmin?: boolean
} | null

type CommentDTO = {
	id: string
	parentId: string | null
	authorId: string
	authorName: string
	authorImage?: string | null
	body: string
	likes: number
	likedByMe: boolean
	mine: boolean
	createdAt: string
	editedAt?: string | null
}

/* ───── helpers ───── */

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).slice(0, 2)
	return parts.map((p) => p[0] ?? "").join("") || "؟"
}

function timeAgo(iso: string): string {
	const t = new Date(iso).getTime()
	if (Number.isNaN(t)) return ""
	const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
	if (s < 60) return "الآن"
	const m = Math.floor(s / 60)
	if (m < 60) return `${m} د`
	const h = Math.floor(m / 60)
	if (h < 24) return `${h} س`
	const d = Math.floor(h / 24)
	if (d < 30) return `${d} ي`
	return new Intl.DateTimeFormat("ar-DZ", {
		day: "numeric",
		month: "short",
	}).format(new Date(t))
}

function Avatar({
	name,
	image,
	small,
}: {
	name: string
	image?: string | null
	small?: boolean
}) {
	const cls = `ip-avatar${small ? " ip-avatar--sm" : ""}`
	if (image)
		// eslint-disable-next-line @next/next/no-img-element
		return <img className={cls} src={image} alt={name} />
	return (
		<div className={cls} aria-hidden="true">
			{initials(name)}
		</div>
	)
}

/* ───── composer (Markdown + LaTeX) ───── */

function Composer({
	user,
	placeholder,
	submitLabel,
	initialValue = "",
	autoFocus,
	small,
	onSubmit,
	onCancel,
}: {
	user: NonNullable<CurrentUser>
	placeholder: string
	submitLabel: string
	initialValue?: string
	autoFocus?: boolean
	small?: boolean
	onSubmit: (body: string) => Promise<boolean>
	onCancel?: () => void
}) {
	const [value, setValue] = useState(initialValue)
	const [preview, setPreview] = useState(false)
	const [busy, setBusy] = useState(false)
	const ref = useRef<HTMLTextAreaElement>(null)

	const wrap = useCallback(
		(before: string, after = before, sample = "") => {
			const el = ref.current
			if (!el) return
			const start = el.selectionStart ?? value.length
			const end = el.selectionEnd ?? value.length
			const selected = value.slice(start, end) || sample
			const next = value.slice(0, start) + before + selected + after + value.slice(end)
			setValue(next)
			setPreview(false)
			requestAnimationFrame(() => {
				el.focus()
				el.selectionStart = start + before.length
				el.selectionEnd = start + before.length + selected.length
			})
		},
		[value],
	)

	const send = async () => {
		const body = value.trim()
		if (!body || busy) return
		setBusy(true)
		const ok = await onSubmit(body)
		setBusy(false)
		if (ok) {
			setValue("")
			setPreview(false)
		}
	}

	return (
		<div className="ip-composer">
			<Avatar name={user.name} image={user.image} small={small} />
			<div className="ip-composer__main">
				<div className="ip-composer__bar">
					<button type="button" className="ip-tool" title="عريض" onClick={() => wrap("**", "**", "نص")}>
						<b>B</b>
					</button>
					<button type="button" className="ip-tool" title="مائل" onClick={() => wrap("*", "*", "نص")}>
						<i>I</i>
					</button>
					<button
						type="button"
						className="ip-tool ip-tool--tex"
						title="معادلة داخل السطر"
						onClick={() => wrap("$", "$", "x^2")}
					>
						$x$
					</button>
					<button
						type="button"
						className="ip-tool ip-tool--tex"
						title="معادلة معروضة"
						onClick={() => wrap("\n$$\n", "\n$$\n", "\\int_0^1 f(x)\\,dx")}
					>
						$$
					</button>
					<button type="button" className="ip-tool" title="كود" onClick={() => wrap("`", "`", "code")}>
						{"</>"}
					</button>
					<button
						type="button"
						className={`ip-tool ip-tool__spacer${preview ? " ip-tool--on" : ""}`}
						onClick={() => setPreview((p) => !p)}
					>
						{preview ? "تحرير" : "معاينة"}
					</button>
				</div>

				{preview ? (
					<div className="ip-preview">
						{value.trim() ? (
							<Markdown dir="auto">{value}</Markdown>
						) : (
							<span className="ip-hintline">لا شيء لعرضه بعد…</span>
						)}
					</div>
				) : (
					<textarea
						ref={ref}
						value={value}
						autoFocus={autoFocus}
						placeholder={placeholder}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={(e) => {
							if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
								e.preventDefault()
								void send()
							}
						}}
					/>
				)}

				<div className="ip-composer__foot">
					{onCancel && (
						<button type="button" className="ip-tool" onClick={onCancel}>
							إلغاء
						</button>
					)}
					<button type="button" className="ip-send" disabled={busy || !value.trim()} onClick={send}>
						{busy ? "…" : submitLabel}
					</button>
				</div>
			</div>
		</div>
	)
}

/* ───── one comment ───── */

function CommentItem({
	c,
	user,
	replies,
	onReply,
	onLike,
	onDelete,
	onEdit,
}: {
	c: CommentDTO
	user: CurrentUser
	replies: CommentDTO[]
	onReply: (parentId: string, body: string) => Promise<boolean>
	onLike: (id: string) => void
	onDelete: (id: string) => void
	onEdit: (id: string, body: string) => Promise<boolean>
}) {
	const [replying, setReplying] = useState(false)
	const [editing, setEditing] = useState(false)
	const isReply = Boolean(c.parentId)

	return (
		<div className="ip-c">
			{!(editing && user) && <Avatar name={c.authorName} image={c.authorImage} small={isReply} />}
			<div className="ip-c__col">
				{editing && user ? (
					<Composer
						user={user}
						placeholder="عدّل تعليقك…"
						submitLabel="حفظ"
						initialValue={c.body}
						autoFocus
						small={isReply}
						onCancel={() => setEditing(false)}
						onSubmit={async (body) => {
							const ok = await onEdit(c.id, body)
							if (ok) setEditing(false)
							return ok
						}}
					/>
				) : (
					<>
						<div className="ip-bubble">
							<div className="ip-c__name">
								{c.authorName}
								{c.editedAt && <span className="ip-c__badge">مُعدّل</span>}
							</div>
							<Markdown dir="auto">{c.body}</Markdown>
						</div>

						<div className="ip-c__tools">
							<button
								className={c.likedByMe ? "ip-liked" : undefined}
								onClick={() => onLike(c.id)}
							>
								إعجاب
							</button>
							{user && !isReply && <button onClick={() => setReplying((r) => !r)}>ردّ</button>}
							{c.mine && <button onClick={() => setEditing(true)}>تعديل</button>}
							{(c.mine || user?.isAdmin) && <button onClick={() => onDelete(c.id)}>حذف</button>}
							<span>{timeAgo(c.createdAt)}</span>
							{c.likes > 0 && <span className="ip-likepill">👍 {c.likes}</span>}
						</div>
					</>
				)}

				{(replies.length > 0 || replying) && (
					<div className="ip-replies">
						{replies.map((r) => (
							<CommentItem
								key={r.id}
								c={r}
								user={user}
								replies={[]}
								onReply={onReply}
								onLike={onLike}
								onDelete={onDelete}
								onEdit={onEdit}
							/>
						))}
						{replying && user && (
							<Composer
								user={user}
								autoFocus
								small
								placeholder={`ردّ على ${c.authorName}…`}
								submitLabel="ردّ"
								onCancel={() => setReplying(false)}
								onSubmit={async (body) => {
									const ok = await onReply(c.id, body)
									if (ok) setReplying(false)
									return ok
								}}
							/>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

/* ───── the discussion ───── */

export default function Comments({ slug, user }: { slug: string; user: CurrentUser }) {
	const [items, setItems] = useState<CommentDTO[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState("")

	const load = useCallback(async () => {
		try {
			const res = await fetch(`/api/coffee/comments?slug=${encodeURIComponent(slug)}`, {
				cache: "no-store",
			})
			const data = await res.json()
			setItems(Array.isArray(data.comments) ? data.comments : [])
		} catch {
			setError("تعذّر تحميل التعليقات")
		} finally {
			setLoading(false)
		}
	}, [slug])

	useEffect(() => {
		setLoading(true)
		void load()
	}, [load])

	const post = async (body: string, parentId: string | null): Promise<boolean> => {
		setError("")
		try {
			const res = await fetch("/api/coffee/comments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ slug, body, parentId }),
			})
			const data = await res.json()
			if (!res.ok) {
				setError(data?.error ?? "تعذّر النشر")
				return false
			}
			setItems((prev) => [...prev, data.comment])
			return true
		} catch {
			setError("تعذّر النشر — تحقّق من الاتصال")
			return false
		}
	}

	const like = async (id: string) => {
		if (!user) {
			setError("سجّل الدخول للإعجاب")
			return
		}
		setItems((prev) =>
			prev.map((c) =>
				c.id === id
					? { ...c, likedByMe: !c.likedByMe, likes: c.likes + (c.likedByMe ? -1 : 1) }
					: c,
			),
		)
		try {
			const res = await fetch(`/api/coffee/comments/${id}/like`, { method: "POST" })
			if (!res.ok) throw new Error()
			const data = await res.json()
			setItems((prev) =>
				prev.map((c) => (c.id === id ? { ...c, likes: data.likes, likedByMe: data.liked } : c)),
			)
		} catch {
			void load()
		}
	}

	const remove = async (id: string) => {
		if (!confirm("حذف هذا التعليق؟")) return
		setItems((prev) => prev.filter((c) => c.id !== id && c.parentId !== id))
		try {
			await fetch(`/api/coffee/comments/${id}`, { method: "DELETE" })
		} catch {
			void load()
		}
	}

	const edit = async (id: string, body: string): Promise<boolean> => {
		try {
			const res = await fetch(`/api/coffee/comments/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ body }),
			})
			if (!res.ok) return false
			setItems((prev) =>
				prev.map((c) => (c.id === id ? { ...c, body, editedAt: new Date().toISOString() } : c)),
			)
			return true
		} catch {
			return false
		}
	}

	const roots = items.filter((c) => !c.parentId)
	const repliesOf = (id: string) => items.filter((c) => c.parentId === id)

	return (
		<section className="ip-disc">
			<div className="ip-disc__head">{loading ? "…" : `${items.length} تعليق`}</div>

			{user ? (
				<Composer
					user={user}
					placeholder="اكتب تعليقًا…"
					submitLabel="نشر"
					onSubmit={(body) => post(body, null)}
				/>
			) : (
				<div className="ip-signin">
					<span>سجّل الدخول للمشاركة في النقاش.</span>
					<a href="/api/auth/signin">تسجيل الدخول</a>
				</div>
			)}

			{error && <p className="ip-error">{error}</p>}

			<div className="ip-list">
				{loading ? null : roots.length === 0 ? (
					<p className="ip-empty">لا تعليقات بعد.</p>
				) : (
					roots.map((c) => (
						<CommentItem
							key={c.id}
							c={c}
							user={user}
							replies={repliesOf(c.id)}
							onReply={(parentId, body) => post(body, parentId)}
							onLike={like}
							onDelete={remove}
							onEdit={edit}
						/>
					))
				)}
			</div>
		</section>
	)
}
