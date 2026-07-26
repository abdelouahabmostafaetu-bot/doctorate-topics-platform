"use client";

import { useRef, useState } from "react";
import {
	CheckCircle2,
	CloudUpload,
	Link2,
	LoaderCircle,
	TriangleAlert,
} from "lucide-react";
import { saveBook } from "@/app/admin/library/actions";

const field =
	"mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10";
const label = "block text-xs font-medium text-muted-foreground";

function ModeToggle({
	mode,
	onChange,
}: {
	mode: "upload" | "url";
	onChange: (m: "upload" | "url") => void;
}) {
	return (
		<span className="inline-flex overflow-hidden rounded-md border text-[10px] font-medium">
			<button
				type="button"
				onClick={() => onChange("upload")}
				className={`flex items-center gap-1 px-2 py-1 transition ${mode === "upload" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
			>
				<CloudUpload className="h-3 w-3" /> Upload
			</button>
			<button
				type="button"
				onClick={() => onChange("url")}
				className={`flex items-center gap-1 border-r px-2 py-1 transition ${mode === "url" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
			>
				<Link2 className="h-3 w-3" /> URL
			</button>
		</span>
	);
}

export function BookForm({
	specialties,
}: {
	specialties: { id: string; name: string }[];
}) {
	const formRef = useRef<HTMLFormElement>(null);
	const [specialtyId, setSpecialtyId] = useState("");
	const [coverMode, setCoverMode] = useState<"upload" | "url">("upload");
	const [fileMode, setFileMode] = useState<"upload" | "url">("url");
	const [status, setStatus] = useState("");
	const [kind, setKind] = useState<"idle" | "busy" | "success" | "error">(
		"idle",
	);
	const busy = kind === "busy";

	async function uploadToR2(file: File, k: "cover" | "book"): Promise<string> {
		const pres = await fetch("/api/library/presign", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				fileName: file.name,
				contentType: file.type || "application/octet-stream",
				sizeBytes: file.size,
				kind: k,
			}),
		});
		const data = (await pres.json()) as {
			uploadUrl?: string;
			url?: string;
			error?: string;
		};
		if (!pres.ok || !data.uploadUrl || !data.url)
			throw new Error(data.error || "Could not prepare the upload.");
		const put = await fetch(data.uploadUrl, {
			method: "PUT",
			headers: { "Content-Type": file.type || "application/octet-stream" },
			body: file,
		});
		if (!put.ok) throw new Error("Upload to storage failed.");
		return data.url;
	}

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const title = String(fd.get("title") || "").trim();
		const author = String(fd.get("author") || "").trim();
		const summary = String(fd.get("summary") || "").trim();
		const newSpecialtyName = String(fd.get("newSpecialtyName") || "").trim();
		const coverFile = fd.get("coverFile") as File | null;
		const coverUrlInput = String(fd.get("coverUrl") || "").trim();
		const bookFile = fd.get("bookFile") as File | null;
		const bookUrlInput = String(fd.get("downloadUrl") || "").trim();

		if (!title || !author) {
			setKind("error");
			setStatus("Book name and author are required.");
			return;
		}
		if (!specialtyId && !newSpecialtyName) {
			setKind("error");
			setStatus("Choose a specialty or type a new one.");
			return;
		}
		if (fileMode === "url" ? !bookUrlInput : !bookFile?.size) {
			setKind("error");
			setStatus("Add the book file: paste a link or upload it.");
			return;
		}

		setKind("busy");
		try {
			let coverUrl = coverMode === "url" ? coverUrlInput : "";
			if (coverMode === "upload" && coverFile?.size) {
				setStatus("Uploading cover image...");
				coverUrl = await uploadToR2(coverFile, "cover");
			}
			let downloadUrl = bookUrlInput;
			if (fileMode === "upload" && bookFile?.size) {
				setStatus("Uploading book file to storage...");
				downloadUrl = await uploadToR2(bookFile, "book");
			}
			setStatus("Saving book...");
			await saveBook({
				title,
				author,
				summary,
				coverUrl,
				downloadUrl,
				specialtyId: specialtyId || undefined,
				newSpecialtyName: specialtyId ? undefined : newSpecialtyName,
			});
			setKind("success");
			setStatus("Book published. It is now visible in the library.");
			formRef.current?.reset();
			setSpecialtyId("");
		} catch (error) {
			setKind("error");
			setStatus(
				error instanceof Error ? error.message : "Unexpected error occurred.",
			);
		}
	}

	return (
		<form ref={formRef} onSubmit={onSubmit} className="space-y-4" dir="ltr">
			<div className="grid gap-4 sm:grid-cols-2">
				<label className={label}>
					Book name *
					<input
						name="title"
						required
						maxLength={200}
						placeholder="e.g. Functional Analysis"
						className={field}
					/>
				</label>
				<label className={label}>
					Author *
					<input
						name="author"
						required
						maxLength={120}
						placeholder="e.g. Walter Rudin"
						className={field}
					/>
				</label>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<label className={label}>
					Specialty *
					<select
						value={specialtyId}
						onChange={(e) => setSpecialtyId(e.target.value)}
						className={field}
					>
						<option value="">+ New specialty (type below)</option>
						{specialties.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name}
							</option>
						))}
					</select>
				</label>
				{!specialtyId && (
					<label className={label}>
						New specialty name *
						<input
							name="newSpecialtyName"
							maxLength={80}
							placeholder="e.g. Algebra / تحليل دالي"
							className={field}
						/>
					</label>
				)}
			</div>

			<label className={label}>
				Short summary (optional)
				<textarea
					name="summary"
					maxLength={600}
					rows={2}
					placeholder="One or two sentences about the book..."
					className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
				/>
			</label>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<div className="flex items-center justify-between">
						<span className={label}>Cover image (optional)</span>
						<ModeToggle mode={coverMode} onChange={setCoverMode} />
					</div>
					{coverMode === "upload" ? (
						<input
							type="file"
							name="coverFile"
							accept="image/*"
							className="mt-1.5 w-full text-[11px] text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2.5 file:py-1.5 file:text-primary"
						/>
					) : (
						<input
							name="coverUrl"
							type="url"
							placeholder="https://... direct image link"
							className={field}
						/>
					)}
				</div>
				<div>
					<div className="flex items-center justify-between">
						<span className={label}>Book file / download *</span>
						<ModeToggle mode={fileMode} onChange={setFileMode} />
					</div>
					{fileMode === "upload" ? (
						<input
							type="file"
							name="bookFile"
							className="mt-1.5 w-full text-[11px] text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2.5 file:py-1.5 file:text-primary"
						/>
					) : (
						<input
							name="downloadUrl"
							type="url"
							placeholder="https://... direct link (Drive, R2, ...)"
							className={field}
						/>
					)}
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-3 pt-1">
				<button
					type="submit"
					disabled={busy}
					className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
				>
					{busy ? (
						<LoaderCircle className="h-4 w-4 animate-spin" />
					) : (
						<CloudUpload className="h-4 w-4" />
					)}
					{busy ? "Publishing..." : "Publish book"}
				</button>
				{status && (
					<p
						className={`flex items-center gap-1.5 text-[11px] ${kind === "error" ? "text-red-600" : kind === "success" ? "text-emerald-600" : "text-muted-foreground"}`}
					>
						{kind === "error" ? (
							<TriangleAlert className="h-3.5 w-3.5" />
						) : kind === "success" ? (
							<CheckCircle2 className="h-3.5 w-3.5" />
						) : (
							<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
						)}
						{status}
					</p>
				)}
			</div>
		</form>
	);
}
