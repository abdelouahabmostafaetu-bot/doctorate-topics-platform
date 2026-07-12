"use client";

// زر التبليغ عن خطأ — نافذة صغيرة لاختيار السبب + وصف، ويمنح +3 نقاط لأول بلاغ على الموضوع
import { useActionState, useState } from "react";
import {
	reportTopicAction,
	type ReportFormState,
} from "@/app/topics/actions";

const REASONS = [
	{ value: "wrong_content", label: "خطأ في نص الموضوع أو الحل" },
	{ value: "broken_file", label: "ملف معطوب أو معادلة لا تظهر" },
	{ value: "wrong_classification", label: "تصنيف خاطئ (جامعة/سنة/تخصص)" },
	{ value: "other", label: "سبب آخر" },
];

export function ReportButton({
	topicId,
	problemNumber,
	compact,
}: {
	topicId: string;
	problemNumber?: number;
	compact?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [state, formAction, pending] = useActionState<ReportFormState, FormData>(
		reportTopicAction,
		{},
	);

	const trigger = compact ? (
		<button
			type="button"
			onClick={() => setOpen((v) => !v)}
			className="rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
			title="التبليغ عن خطأ في هذا التمرين"
		>
			🚩 إبلاغ
		</button>
	) : (
		<button
			type="button"
			onClick={() => setOpen((v) => !v)}
			className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-red-400 hover:text-red-600"
		>
			🚩 إبلاغ
		</button>
	);

	return (
		<div className={compact ? "inline-block" : "inline-block align-middle"}>
			{trigger}
			{open && (
				<div className="relative z-30">
					<div className="absolute start-0 top-2 w-80 max-w-[90vw] rounded-xl border bg-card p-4 shadow-lg">
						{state.success ? (
							<div className="text-center">
								<p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
									{state.success}
								</p>
								<button
									type="button"
									onClick={() => setOpen(false)}
									className="mt-3 rounded-md border px-4 py-1.5 text-xs transition hover:border-primary hover:text-primary"
								>
									إغلاق
								</button>
							</div>
						) : (
							<form action={formAction} className="space-y-3">
								<p className="text-sm font-semibold">
									🚩 التبليغ عن خطأ
									{problemNumber != null && (
										<span className="text-muted-foreground">
											{" "}
											— التمرين {problemNumber}
										</span>
									)}
								</p>
								<input type="hidden" name="topicId" value={topicId} />
								{problemNumber != null && (
									<input
										type="hidden"
										name="problemNumber"
										value={problemNumber}
									/>
								)}
								<select
									name="type"
									required
									className="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								>
									{REASONS.map((r) => (
										<option key={r.value} value={r.value}>
											{r.label}
										</option>
									))}
								</select>
								<textarea
									name="message"
									required
									rows={3}
									placeholder="صِف الخطأ باختصار ليراجعه المشرف..."
									className="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								/>
								{state.error && (
									<p className="text-xs text-red-600">{state.error}</p>
								)}
								<div className="flex items-center justify-between">
									<span className="text-xs text-muted-foreground">
										أول بلاغ على الموضوع = +3 نقاط 🏆
									</span>
									<div className="flex gap-2">
										<button
											type="button"
											onClick={() => setOpen(false)}
											className="rounded-md border px-3 py-1.5 text-xs transition hover:bg-muted"
										>
											إلغاء
										</button>
										<button
											type="submit"
											disabled={pending}
											className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
										>
											{pending ? "جارِ الإرسال..." : "إرسال البلاغ"}
										</button>
									</div>
								</div>
							</form>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
