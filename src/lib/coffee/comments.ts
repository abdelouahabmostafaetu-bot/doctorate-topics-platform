import { MongoClient, Collection, ObjectId } from "mongodb"

/**
 * 💬 Comments for «مسائل ممتعة».
 *
 * Stored in the same MongoDB used by /coffee (collection `problemcomments`).
 * Same defensive style as lib/coffee/db.ts: env read at call time, failed
 * connections are never cached, helpers never explode the page.
 */

export interface ProblemComment {
	_id?: ObjectId
	problemSlug: string
	/** null for a top-level comment, else the _id (string) of the parent */
	parentId: string | null
	authorId: string
	authorName: string
	authorImage?: string | null
	/** Markdown + LaTeX */
	body: string
	/** user ids that liked it */
	likes: string[]
	createdAt: Date
	editedAt?: Date | null
	deleted?: boolean
}

export const MAX_COMMENT_LENGTH = 5000

let clientPromise: Promise<MongoClient> | null =
	(global as any)._dmCommentsClientPromise ?? null
let indexEnsured = false

function connectionUri(): string {
	return process.env.MONGODB_URI || process.env.DATABASE_URL || ""
}

function dbName(): string {
	if (process.env.MONGODB_DB) return process.env.MONGODB_DB
	const m = connectionUri().match(/\/([A-Za-z0-9_-]+)(\?|$)/)
	if (m && m[1] && !m[1].includes(".")) return m[1]
	return "doctorate_platform"
}

async function getClient(): Promise<MongoClient> {
	const uri = connectionUri()
	if (!uri) throw new Error("missing_env: DATABASE_URL / MONGODB_URI is not set")

	if (!clientPromise) {
		clientPromise = new MongoClient(uri, {
			serverSelectionTimeoutMS: 8000,
			connectTimeoutMS: 8000,
		}).connect()
		;(global as any)._dmCommentsClientPromise = clientPromise
	}

	try {
		return await clientPromise
	} catch (err) {
		clientPromise = null
		;(global as any)._dmCommentsClientPromise = null
		throw err
	}
}

export async function commentsCol(): Promise<Collection<ProblemComment>> {
	const c = await getClient()
	const col = c.db(dbName()).collection<ProblemComment>("problemcomments")
	if (!indexEnsured) {
		indexEnsured = true
		col.createIndex({ problemSlug: 1, createdAt: 1 }).catch(() => {})
	}
	return col
}

/** Everything for one problem, oldest first. Never throws. */
export async function listComments(problemSlug: string): Promise<ProblemComment[]> {
	try {
		const col = await commentsCol()
		return await col
			.find({ problemSlug, deleted: { $ne: true } })
			.sort({ createdAt: 1 })
			.limit(500)
			.toArray()
	} catch (err) {
		console.error("[comments] listComments failed:", err)
		return []
	}
}

export async function addComment(input: {
	problemSlug: string
	parentId?: string | null
	authorId: string
	authorName: string
	authorImage?: string | null
	body: string
}): Promise<ProblemComment> {
	const col = await commentsCol()

	let parentId: string | null = null
	if (input.parentId && ObjectId.isValid(input.parentId)) {
		const parent = await col.findOne({ _id: new ObjectId(input.parentId) })
		// one level of nesting only (Facebook style)
		if (parent) parentId = parent.parentId ?? input.parentId
	}

	const doc: ProblemComment = {
		problemSlug: input.problemSlug,
		parentId,
		authorId: input.authorId,
		authorName: input.authorName,
		authorImage: input.authorImage ?? null,
		body: input.body.trim().slice(0, MAX_COMMENT_LENGTH),
		likes: [],
		createdAt: new Date(),
		editedAt: null,
		deleted: false,
	}

	const res = await col.insertOne(doc)
	return { ...doc, _id: res.insertedId }
}

export async function toggleLike(
	id: string,
	userId: string,
): Promise<{ likes: number; liked: boolean } | null> {
	if (!ObjectId.isValid(id)) return null
	const col = await commentsCol()
	const _id = new ObjectId(id)
	const current = await col.findOne({ _id })
	if (!current) return null

	const liked = (current.likes ?? []).includes(userId)
	await col.updateOne(
		{ _id },
		liked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
	)
	const n = (current.likes ?? []).length + (liked ? -1 : 1)
	return { likes: Math.max(0, n), liked: !liked }
}

export async function editComment(
	id: string,
	userId: string,
	isAdmin: boolean,
	body: string,
): Promise<boolean> {
	if (!ObjectId.isValid(id)) return false
	const col = await commentsCol()
	const _id = new ObjectId(id)
	const current = await col.findOne({ _id })
	if (!current) return false
	if (current.authorId !== userId && !isAdmin) return false

	await col.updateOne(
		{ _id },
		{ $set: { body: body.trim().slice(0, MAX_COMMENT_LENGTH), editedAt: new Date() } },
	)
	return true
}

/** Soft delete (also hides the replies of a deleted parent). */
export async function removeComment(
	id: string,
	userId: string,
	isAdmin: boolean,
): Promise<boolean> {
	if (!ObjectId.isValid(id)) return false
	const col = await commentsCol()
	const _id = new ObjectId(id)
	const current = await col.findOne({ _id })
	if (!current) return false
	if (current.authorId !== userId && !isAdmin) return false

	await col.updateOne({ _id }, { $set: { deleted: true } })
	await col.updateMany({ parentId: id }, { $set: { deleted: true } })
	return true
}
