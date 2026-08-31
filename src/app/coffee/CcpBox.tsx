"use client"

import { useState } from "react"

/** الرقم كما يُنسخ: أرقام متصلة بلا فراغات */
const CCP_RAW = "00799999002781033371"

/** الرقم كما يُقرأ: مجموعات رباعية تمنع ضياع العين */
const CCP_PRETTY = "0079 9999 0027 8103 3371"

export function CcpBox() {
	const [copied, setCopied] = useState(false)

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(CCP_RAW)
		} catch {
			// clipboard غير متاح على اتصال غير مؤمّن وفي متصفحات الهاتف القديمة
			try {
				const field = document.createElement("textarea")
				field.value = CCP_RAW
				field.setAttribute("readonly", "")
				field.style.position = "fixed"
				field.style.opacity = "0"
				document.body.appendChild(field)
				field.select()
				document.execCommand("copy")
				field.remove()
			} catch {
				return // لا نزعم النسخ إن لم يحدث — الرقم مرئي للنقل يدويًا
			}
		}

		setCopied(true)
		window.setTimeout(() => setCopied(false), 2000)

		// +1 في عدّاد «نسخ حساب CCP» في لوحة الإدارة — بلا انتظار ولا حجب للواجهة
		fetch("/api/coffee-stat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ type: "copy" }),
		}).catch(() => {})
	}

	return (
		<div className="fw__ccp">
			<span className="fw__ccp-label">حساب بريدي جارٍ · CCP</span>

			<span className="fw__ccp-num" dir="ltr">
				{CCP_PRETTY}
			</span>

			<button type="button" className="fw__copy" onClick={handleCopy}>
				<span aria-hidden="true">{copied ? "✓" : "⧉"}</span>
				{copied ? "نُسخ الرقم" : "انسخ الرقم"}
			</button>

			<span className="fw__sr" role="status" aria-live="polite">
				{copied ? "نُسخ رقم الحساب إلى الحافزة" : ""}
			</span>
		</div>
	)
}
