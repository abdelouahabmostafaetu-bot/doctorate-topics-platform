/**
 * probe-list.ts
 *
 * Probe an explicit list of Algerian thesis portals (hand-collected list:
 * alternate hostnames, :8080 ports and /jspui //xmlui context paths that the
 * automatic discover script never generates).
 *
 * Usage:
 *   npm run probe
 *   npm run probe -- --only=batna,usthb2
 *   npm run probe -- --timeout=25000
 *
 * Output: probe-list.txt (ready-to-paste repos.ts blocks when a maths set is found)
 */
import dns from "node:dns"
import fs from "node:fs"

const DNS_SERVERS = (process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8")
	.split(",")
	.map((s) => s.trim())
	.filter(Boolean)
try {
	dns.setServers(DNS_SERVERS)
	dns.promises.setServers(DNS_SERVERS)
} catch {}

const args = process.argv.slice(2)
const argVal = (name: string) => {
	const a = args.find((x) => x.startsWith(`--${name}=`))
	return a ? a.slice(name.length + 3) : ""
}
const TIMEOUT = Number(argVal("timeout") || 20000)
const ONLY = argVal("only")
	.split(",")
	.map((s) => s.trim())
	.filter(Boolean)

const UA = "docmathdz-harvester/1.0 (+https://www.docmathdz.dev)"

type Cand = {
	key: string
	nameFr: string
	nameAr: string
	wilaya: string
	/** base URLs to try, in order */
	bases: string[]
	note?: string
}

/** Hand-collected list. Every entry here comes from a public listing of
 *  Algerian university thesis portals, not from hostname guessing. */
const CANDIDATES: Cand[] = [
	{ key: "batna", nameFr: "Université de Batna 1", nameAr: "جامعة باتنة 1", wilaya: "Batna", bases: ["http://theses.univ-batna.dz", "https://dspace.univ-batna.dz", "http://bibliotheque.univ-batna.dz", "http://digitallibrary.univ-batna.dz"] },
	{ key: "usthb2", nameFr: "USTHB (repository)", nameAr: "جامعة هواري بومدين", wilaya: "Alger", bases: ["http://repository.usthb.dz", "https://repository.usthb.dz"] },
	{ key: "ummto2", nameFr: "Université Mouloud Mammeri (dl)", nameAr: "جامعة مولود معمري تيزي وزو", wilaya: "Tizi Ouzou", bases: ["https://dl.ummto.dz", "http://dl.ummto.dz"] },
	{ key: "tebessa", nameFr: "Université de Tébessa", nameAr: "جامعة تبسة", wilaya: "Tébessa", bases: ["http://dspace.univ-tebessa.dz", "https://dspace.univ-tebessa.dz", "http://dspace.univ-tebessa.dz:8080/jspui"] },
	{ key: "mascara", nameFr: "Université de Mascara", nameAr: "جامعة معسكر", wilaya: "Mascara", bases: ["http://dspace.univ-mascara.dz:8080/jspui", "http://dspace.univ-mascara.dz:8080", "https://dspace.univ-mascara.dz"] },
	{ key: "msila_xmlui", nameFr: "Université de M'Sila (XMLUI)", nameAr: "جامعة المسيلة", wilaya: "M'Sila", bases: ["http://dspace.univ-msila.dz:8080/xmlui", "http://dspace.univ-msila.dz:8080"] },
	{ key: "djelfa", nameFr: "Université de Djelfa", nameAr: "جامعة الجلفة", wilaya: "Djelfa", bases: ["http://dspace.univ-djelfa.dz:8080/xmlui", "http://dspace.univ-djelfa.dz:8080", "http://dspace.univ-djelfa.dz"] },
	{ key: "chlef_jspui", nameFr: "Université de Chlef (JSPUI)", nameAr: "جامعة الشلف", wilaya: "Chlef", bases: ["http://dspace.univ-chlef.dz:8080/jspui", "http://dspace.univchlef.dz:8080/jspui"] },
	{ key: "boumerdes_dl", nameFr: "Université de Boumerdès (dlibrary)", nameAr: "جامعة بومرداس", wilaya: "Boumerdès", bases: ["http://dlibrary.univ-boumerdes.dz:8080/jspui", "http://dlibrary.umbb.dz:8080/jspui", "http://dlibrary.umbb.dz:8080"] },
	{ key: "ouargla_jspui", nameFr: "Université de Ouargla (JSPUI)", nameAr: "جامعة ورقلة", wilaya: "Ouargla", bases: ["https://dspace.univ-ouargla.dz/jspui", "http://dspace.univ-ouargla.dz/jspui"] },
	{ key: "bouira", nameFr: "Université de Bouira", nameAr: "جامعة البويرة", wilaya: "Bouira", bases: ["http://dspace.univ-bouira.dz:8080/jspui", "http://dspace.univ-bouira.dz", "http://dspace.univbouira.dz:8080/jspui"] },
	{ key: "eloued", nameFr: "Université d'El Oued", nameAr: "جامعة الوادي", wilaya: "El Oued", bases: ["http://dspace.univ-eloued.dz", "https://dspace.univ-eloued.dz", "http://dspace.univ-eloued.dz:8080/jspui"] },
	{ key: "oran1", nameFr: "Université Oran 1 Ahmed Ben Bella", nameAr: "جامعة وهران 1", wilaya: "Oran", bases: ["http://theses.univ-oran1.dz", "http://dspace.univ-oran1.dz"], note: "portail PHP maison (rechepagear.php) - probablement pas OAI" },
	{ key: "oran2", nameFr: "Université Oran 2", nameAr: "جامعة وهران 2", wilaya: "Oran", bases: ["https://ds.univ-oran2.dz:8443", "http://dspace.univ-oran2.dz"] },
	{ key: "constantine2", nameFr: "Université Constantine 2", nameAr: "جامعة قسنطينة 2", wilaya: "Constantine", bases: ["http://www.univ-constantine2.dz/theses", "http://dspace.univ-constantine2.dz"] },
	{ key: "umc", nameFr: "Université Constantine 1 (BU)", nameAr: "جامعة قسنطينة 1", wilaya: "Constantine", bases: ["http://bu.umc.edu.dz/md", "http://bu.umc.edu.dz/theses"], note: "catalogue PMB, pas DSpace" },
	{ key: "annaba_biblio", nameFr: "Université d'Annaba (biblio)", nameAr: "جامعة عنابة", wilaya: "Annaba", bases: ["https://biblio.univ-annaba.dz", "http://biblio.univ-annaba.dz"] },
	{ key: "usto2", nameFr: "USTO (theses en ligne)", nameAr: "جامعة وهران للعلوم والتكنولوجيا", wilaya: "Oran", bases: ["http://www.univ-usto.dz/theses_en_ligne"] },
	{ key: "alger", nameFr: "Université d'Alger 1", nameAr: "جامعة الجزائر 1", wilaya: "Alger", bases: ["http://biblio.univ-alger.dz/jspui"], note: "verifie: aucune communaute de mathematiques" },
	{ key: "biskra_div", nameFr: "Université de Biskra (EPrints divisions)", nameAr: "جامعة بسكرة", wilaya: "Biskra", bases: ["http://thesis.univ-biskra.dz"], note: "deja dans repos.ts (biskra_eprints)" },
]

const OAI_PATHS = [
	"/server/oai/request",
	"/oai/request",
	"/oai",
	"/jspui/oai/request",
	"/xmlui/oai/request",
	"/dspace/oai/request",
	"/cgi/oai2",
]

const MATH =
	/(math[ée]mat|mathemat|\bmaths?\b|رياضيات|الرياضيات|رياضيّات)/i
const MIXED =
	/(informatique|computer|physique|chimie|biolog|technolog|ing[ée]nieur|sciences exactes|إعلام[\s\u0621-\u064A]*آلي|اعلام[\s\u0621-\u064A]*الي|علوم\s*دقيقة|العلوم\s*الدقيقة|المادة|فيزياء)/i

async function get(url: string, accept: string) {
	const ctl = new AbortController()
	const t = setTimeout(() => ctl.abort(), TIMEOUT)
	try {
		const r = await fetch(url, {
			headers: { "user-agent": UA, accept },
			signal: ctl.signal,
			redirect: "follow",
		})
		const body = await r.text()
		return { status: r.status, body, url: r.url }
	} finally {
		clearTimeout(t)
	}
}

function blocks(xml: string, tag: string) {
	const out: string[] = []
	const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g")
	let m: RegExpExecArray | null
	while ((m = re.exec(xml))) out.push(m[1])
	return out
}
function firstValue(xml: string, tag: string) {
	const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml)
	return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : ""
}
function decode(s: string) {
	return s
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
}

type Hit = {
	cand: Cand
	base: string
	kind: "oai" | "rest" | "html" | "none"
	oai?: string
	version?: number
	repoName?: string
	sets: { spec: string; label: string; purity: "pure" | "mixed" }[]
	note?: string
}

async function tryOai(base: string) {
	for (const p of OAI_PATHS) {
		const url = base.replace(/\/$/, "") + p
		try {
			const r = await get(url + "?verb=Identify", "text/xml,application/xml")
			if (r.status !== 200 || !/<Identify>/.test(r.body)) continue
			const name = decode(firstValue(r.body, "repositoryName"))
			const v = /DSpace\s*7|\/server\/oai/.test(r.body + url)
				? 7
				: /eprints/i.test(r.body)
					? 0
					: 6
			return { oai: url, repoName: name, version: v }
		} catch {}
	}
	return null
}

async function listSets(oai: string) {
	const out: { spec: string; label: string; purity: "pure" | "mixed" }[] = []
	let token = ""
	for (let i = 0; i < 40; i++) {
		const url = token
			? `${oai}?verb=ListSets&resumptionToken=${encodeURIComponent(token)}`
			: `${oai}?verb=ListSets`
		let body = ""
		try {
			const r = await get(url, "text/xml,application/xml")
			if (r.status !== 200) break
			body = r.body
		} catch {
			break
		}
		for (const b of blocks(body, "set")) {
			const spec = decode(firstValue(b, "setSpec"))
			const label = decode(firstValue(b, "setName"))
			if (!spec) continue
			if (MATH.test(label)) out.push({ spec, label, purity: "pure" })
			else if (MIXED.test(label)) out.push({ spec, label, purity: "mixed" })
		}
		const m = /<resumptionToken[^>]*>([\s\S]*?)<\/resumptionToken>/.exec(body)
		token = m ? m[1].trim() : ""
		if (!token) break
	}
	return out
}

async function tryHtml(base: string) {
	for (const p of ["/community-list", "/jspui/community-list", "/xmlui/community-list", "/view/divisions/", "/"]) {
		const url = base.replace(/\/$/, "") + p
		try {
			const r = await get(url, "text/html")
			if (r.status !== 200 || r.body.length < 500) continue
			const sets: { spec: string; label: string; purity: "pure" | "mixed" }[] = []
			const re = /href="[^"]*\/handle\/(\d+\/\d+)"[^>]*>([\s\S]{0,200}?)<\/a>/g
			let m: RegExpExecArray | null
			while ((m = re.exec(r.body))) {
				const label = decode(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
				if (!label) continue
				const handle = m[1]
				const spec = "col_" + handle.replace("/", "_")
				if (MATH.test(label)) sets.push({ spec, label, purity: "pure" })
				else if (MIXED.test(label)) sets.push({ spec, label, purity: "mixed" })
			}
			const uniq = new Map(sets.map((s) => [s.spec, s]))
			return { url, sets: [...uniq.values()], size: r.body.length }
		} catch {}
	}
	return null
}

async function probe(cand: Cand): Promise<Hit> {
	for (const base of cand.bases) {
		const host = base.replace(/^https?:\/\//, "").split("/")[0].split(":")[0]
		try {
			await dns.promises.resolve4(host)
		} catch {
			continue
		}
		const oai = await tryOai(base)
		if (oai) {
			const sets = await listSets(oai.oai)
			return { cand, base, kind: "oai", ...oai, sets }
		}
		const html = await tryHtml(base)
		if (html) {
			return {
				cand,
				base,
				kind: "html",
				sets: html.sets,
				note: `HTML ok (${html.url}, ${html.size} o) - pas d'OAI`,
			}
		}
	}
	return { cand, base: cand.bases[0], kind: "none", sets: [] }
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>) {
	const out: R[] = []
	let i = 0
	const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
		while (i < items.length) {
			const k = i++
			out[k] = await fn(items[k])
		}
	})
	await Promise.all(workers)
	return out
}

function render(hits: Hit[]) {
	const L: string[] = []
	L.push("# probe-list.txt - " + new Date().toISOString())
	L.push("# DNS: " + DNS_SERVERS.join(", "))
	L.push("")

	const withMath = hits.filter((h) => h.sets.length > 0)
	const alive = hits.filter((h) => h.kind !== "none" && h.sets.length === 0)
	const dead = hits.filter((h) => h.kind === "none")

	L.push("=".repeat(70))
	L.push(`A) AVEC SET MATHS - ${withMath.length}`)
	L.push("=".repeat(70))
	for (const h of withMath) {
		L.push("")
		L.push(`## ${h.cand.key}  [${h.kind}]  ${h.repoName || ""}`)
		L.push(`   base: ${h.base}`)
		if (h.oai) L.push(`   oai : ${h.oai}`)
		if (h.note) L.push(`   note: ${h.note}`)
		for (const s of h.sets) L.push(`   - ${s.spec}  (${s.purity})  ${s.label}`)
		L.push("")
		L.push("   // ---- coller dans src/lib/theses/repos.ts ----")
		L.push("   {")
		L.push(`     key: "${h.cand.key}",`)
		L.push(`     nameFr: "${h.cand.nameFr}",`)
		L.push(`     nameAr: "${h.cand.nameAr}",`)
		L.push(`     slug: "${h.cand.key.replace(/_/g, "-")}",`)
		L.push(`     wilaya: "${h.cand.wilaya}",`)
		L.push(`     oai: "${h.oai || ""}",`)
		L.push(`     version: ${h.version ?? 6},`)
		L.push(`     site: "${h.base}",`)
		L.push("     enabled: true,")
		if (h.cand.note) L.push(`     note: "${h.cand.note}",`)
		L.push("     sets: [")
		for (const s of h.sets)
			L.push(
				`       { spec: "${s.spec}", label: ${JSON.stringify(s.label)}, purity: "${s.purity}" },`,
			)
		L.push("     ],")
		L.push("   },")
	}

	L.push("")
	L.push("=".repeat(70))
	L.push(`B) JOIGNABLE MAIS AUCUN SET MATHS - ${alive.length}`)
	L.push("=".repeat(70))
	for (const h of alive)
		L.push(`- ${h.cand.key.padEnd(16)} ${h.kind.padEnd(5)} ${h.oai || h.base}  ${h.note || ""}`)

	L.push("")
	L.push("=".repeat(70))
	L.push(`C) INJOIGNABLE - ${dead.length}`)
	L.push("=".repeat(70))
	for (const h of dead) L.push(`- ${h.cand.key.padEnd(16)} ${h.cand.bases.join(" | ")}`)

	return L.join("\n")
}

async function main() {
	const list = ONLY.length
		? CANDIDATES.filter((c) => ONLY.includes(c.key))
		: CANDIDATES
	console.log(`dns servers -> ${DNS_SERVERS.join(", ")}`)
	console.log(`probing ${list.length} candidates (timeout ${TIMEOUT}ms)\n`)

	const hits = await pool(list, 5, async (c) => {
		const h = await probe(c)
		const tag =
			h.kind === "none"
				? "DEAD"
				: h.sets.length
					? `OK ${h.kind} maths=${h.sets.length}`
					: `alive ${h.kind} maths=0`
		console.log(`${c.key.padEnd(16)} ${tag}`)
		return h
	})

	const txt = render(hits)
	fs.writeFileSync("probe-list.txt", txt, "utf8")
	console.log("\n---\nwrote probe-list.txt")
	console.log(`maths: ${hits.filter((h) => h.sets.length).length} / ${hits.length}`)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
