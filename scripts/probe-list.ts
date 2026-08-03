/**
 * probe-list.ts
 *
 * Probe an explicit list of Algerian thesis portals (hand-collected lists:
 * alternate hostnames, non standard ports and /jspui //xmlui context paths
 * that the automatic discover script never generates).
 *
 * Sources: annuaire "etaleb.dz" des depots numeriques + liste Facebook des
 * portails de theses.
 *
 * Usage:
 *   npm run probe
 *   npm run probe -- --only=mila,umc,oeb
 *   npm run probe -- --timeout=40000
 *   npm run probe -- --schools        (inclut les ecoles: ESC, HEC, ENSM, ENSA...)
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
const SCHOOLS = args.includes("--schools")
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
	/** grande ecole / centre: hors perimetre maths par defaut */
	school?: boolean
	note?: string
}

/** Hand-collected list. Every entry comes from a published directory of
 *  Algerian institutional repositories, not from hostname guessing. */
const CANDIDATES: Cand[] = [
	// ---------- jamais sondees : nouveaux hotes / ports / contextes ----------
	{ key: "mila", nameFr: "Centre universitaire de Mila", nameAr: "المركز الجامعي ميلة", wilaya: "Mila", bases: ["http://dspace.centre-univ-mila.dz/jspui", "http://dspace.centre-univ-mila.dz", "https://dspace.centre-univ-mila.dz/jspui"] },
	{ key: "umc", nameFr: "Universite Constantine 1 (archives)", nameAr: "جامعة قسنطينة 1", wilaya: "Constantine", bases: ["http://archives.umc.edu.dz", "https://archives.umc.edu.dz", "http://bu.umc.edu.dz/md"] },
	{ key: "oeb", nameFr: "Universite Larbi Ben M'hidi Oum El Bouaghi", nameAr: "جامعة أم البواقي", wilaya: "Oum El Bouaghi", bases: ["http://dspace.univ-oeb.dz:4000", "http://dspace.univ-oeb.dz:4000/jspui", "http://dspace.univ-oeb.dz"] },
	{ key: "jijel", nameFr: "Universite de Jijel", nameAr: "جامعة جيجل", wilaya: "Jijel", bases: ["http://dspace.univ-jijel.dz:8080/xmlui", "http://dspace.univ-jijel.dz:8080", "http://dspace.univ-jijel.dz"] },
	{ key: "guelma", nameFr: "Universite 8 Mai 1945 Guelma", nameAr: "جامعة قالمة", wilaya: "Guelma", bases: ["https://dspace.univ-guelma.dz/jspui", "http://dspace.univ-guelma.dz/jspui", "https://dspace.univ-guelma.dz"] },
	{ key: "bejaia", nameFr: "Universite Abderrahmane Mira Bejaia", nameAr: "جامعة بجاية", wilaya: "Bejaia", bases: ["http://www.univ-bejaia.dz/dspace", "https://www.univ-bejaia.dz/dspace", "http://dspace.univ-bejaia.dz"] },
	{ key: "blida", nameFr: "Universite Saad Dahlab Blida 1", nameAr: "جامعة البليدة 1", wilaya: "Blida", bases: ["https://di.univ-blida.dz/jspui", "http://di.univ-blida.dz/jspui", "https://di.univ-blida.dz"] },
	{ key: "batna2", nameFr: "Universite Batna 2", nameAr: "جامعة باتنة 2", wilaya: "Batna", bases: ["https://dspace.univ-batna2.dz", "http://dspace.univ-batna2.dz"] },
	{ key: "setif2", nameFr: "Universite Mohamed Lamine Debaghine Setif 2", nameAr: "جامعة سطيف 2", wilaya: "Setif", bases: ["http://dspace.univ-setif2.dz/xmlui", "http://dspace.univ-setif2.dz"] },
	{ key: "saida", nameFr: "Universite Dr Moulay Tahar Saida", nameAr: "جامعة سعيدة", wilaya: "Saida", bases: ["http://pmb.univ-saida.dz:8080/jspui", "http://pmb.univ-saida.dz:8080", "http://dspace.univ-saida.dz"] },
	{ key: "sba_rdoc", nameFr: "Universite Djillali Liabes Sidi Bel Abbes (rdoc)", nameAr: "جامعة سيدي بلعباس", wilaya: "Sidi Bel Abbes", bases: ["http://rdoc.univ-sba.dz", "https://rdoc.univ-sba.dz"] },
	{ key: "constantine3", nameFr: "Universite Constantine 3", nameAr: "جامعة قسنطينة 3", wilaya: "Constantine", bases: ["https://dspace.univ-constantine3.dz/jspui", "http://dspace.univ-constantine3.dz/jspui", "https://dspace.univ-constantine3.dz"] },
	{ key: "alger2", nameFr: "Universite d'Alger 2", nameAr: "جامعة الجزائر 2", wilaya: "Alger", bases: ["http://ddeposit.univ-alger2.dz:8080/xmlui", "http://ddeposit.univ-alger2.dz:8080"] },
	{ key: "alger3", nameFr: "Universite d'Alger 3", nameAr: "جامعة الجزائر 3", wilaya: "Alger", bases: ["https://dspace.univ-alger3.dz/jspui", "http://dspace.univ-alger3.dz/jspui", "https://dspace.univ-alger3.dz"] },
	{ key: "khemis", nameFr: "Universite Djilali Bounaama Khemis Miliana", nameAr: "جامعة خميس مليانة", wilaya: "Ain Defla", bases: ["http://biblio.univ-km.dz", "https://biblio.univ-km.dz", "http://dspace.univ-dbkm.dz"] },
	{ key: "naama", nameFr: "Centre universitaire de Naama", nameAr: "جامعة النعامة", wilaya: "Naama", bases: ["http://193.194.87.218/xmlui", "http://193.194.87.218"], note: "adresse IP brute, pas de nom de domaine" },
	{ key: "tissemsilt", nameFr: "Universite de Tissemsilt", nameAr: "جامعة تيسمسيلت", wilaya: "Tissemsilt", bases: ["http://univ-tissemsilt.dz/dspace", "https://univ-tissemsilt.dz/dspace", "http://dspace.univ-tissemsilt.dz"] },
	{ key: "adrar", nameFr: "Universite Ahmed Draia Adrar", nameAr: "جامعة أدرار", wilaya: "Adrar", bases: ["https://dspace.univ-adrar.edu.dz/jspui", "https://dspace.univ-adrar.edu.dz", "http://dspace.univ-adrar.edu.dz/jspui"] },
	{ key: "bba", nameFr: "Universite Mohamed El Bachir El Ibrahimi BBA", nameAr: "جامعة برج بوعريريج", wilaya: "Bordj Bou Arreridj", bases: ["https://dspace.univ-bba.dz", "http://dspace.univ-bba.dz"], note: "ListSets renvoyait HTTP 500 - reessayer" },
	{ key: "enset_skikda", nameFr: "ENSET / Universite de Skikda", nameAr: "جامعة سكيكدة", wilaya: "Skikda", bases: ["https://dspace.enset-skikda.dz", "http://dspace.enset-skikda.dz"] },
	{ key: "ufc", nameFr: "Universite de la Formation Continue", nameAr: "جامعة التكوين المتواصل", wilaya: "Alger", bases: ["https://ufc.dz/en/index.php/dspace", "https://dspace.ufc.dz", "https://ufc.dz/dspace"] },

	// ---------- variantes de portails deja connus ----------
	{ key: "batna", nameFr: "Universite Batna 1 Hadj Lakhdar", nameAr: "جامعة باتنة 1", wilaya: "Batna", bases: ["http://theses.univ-batna.dz", "https://dspace.univ-batna.dz", "http://dspace.univ-batna.dz", "http://bibliotheque.univ-batna.dz", "http://digitallibrary.univ-batna.dz"] },
	{ key: "usthb2", nameFr: "USTHB (repository)", nameAr: "جامعة هواري بومدين", wilaya: "Alger", bases: ["https://repository.usthb.dz", "http://repository.usthb.dz"] },
	{ key: "ummto2", nameFr: "Universite Mouloud Mammeri (dl / www)", nameAr: "جامعة تيزي وزو", wilaya: "Tizi Ouzou", bases: ["https://dl.ummto.dz", "https://www.ummto.dz/dspace", "http://dl.ummto.dz"] },
	{ key: "tebessa", nameFr: "Universite Larbi Tebessi Tebessa", nameAr: "جامعة تبسة", wilaya: "Tebessa", bases: ["http://dspace.univ-tebessa.dz:8080/xmlui", "http://dspace.univ-tebessa.dz:8080", "http://dspace.univ-tebessa.dz", "https://dspace.univ-tebessa.dz"] },
	{ key: "mascara", nameFr: "Universite Mustapha Stambouli Mascara", nameAr: "جامعة معسكر", wilaya: "Mascara", bases: ["http://dspace.univ-mascara.dz", "https://dspace.univ-mascara.dz", "http://dspace.univ-mascara.dz:8080/jspui", "http://dspace.univ-mascara.dz:8080"] },
	{ key: "msila_xmlui", nameFr: "Universite de M'Sila (XMLUI)", nameAr: "جامعة المسيلة", wilaya: "M'Sila", bases: ["http://dspace.univ-msila.dz:8080/xmlui", "http://dspace.univ-msila.dz:8080"] },
	{ key: "djelfa", nameFr: "Universite Ziane Achour Djelfa", nameAr: "جامعة الجلفة", wilaya: "Djelfa", bases: ["http://dspace.univ-djelfa.dz:8080/xmlui", "http://dspace.univ-djelfa.dz:8080", "http://dspace.univ-djelfa.dz"] },
	{ key: "chlef_jspui", nameFr: "Universite Hassiba Benbouali Chlef (JSPUI)", nameAr: "جامعة الشلف", wilaya: "Chlef", bases: ["http://dspace.univ-chlef.dz:8080/jspui", "http://dspace.univchlef.dz:8080/jspui"] },
	{ key: "boumerdes_dl", nameFr: "Universite M'Hamed Bougara Boumerdes (dlibrary)", nameAr: "جامعة بومرداس", wilaya: "Boumerdes", bases: ["http://dlibrary.univ-boumerdes.dz:8080/jspui", "http://dlibrary.univ-boumerdes.dz:8080", "http://dlibrary.umbb.dz:8080/jspui"] },
	{ key: "ouargla_jspui", nameFr: "Universite Kasdi Merbah Ouargla (JSPUI)", nameAr: "جامعة ورقلة", wilaya: "Ouargla", bases: ["https://dspace.univ-ouargla.dz/jspui", "http://dspace.univ-ouargla.dz/jspui"] },
	{ key: "bouira", nameFr: "Universite Akli Mohand Oulhadj Bouira", nameAr: "جامعة البويرة", wilaya: "Bouira", bases: ["http://dspace.univ-bouira.dz:8080/jspui", "http://dspace.univ-bouira.dz", "http://dspace.univbouira.dz:8080/jspui"] },
	{ key: "eloued", nameFr: "Universite Hamma Lakhdar El Oued", nameAr: "جامعة الوادي", wilaya: "El Oued", bases: ["http://dspace.univ-eloued.dz", "https://dspace.univ-eloued.dz", "http://dspace.univ-eloued.dz:8080/jspui"] },
	{ key: "oran1", nameFr: "Universite Oran 1 Ahmed Ben Bella", nameAr: "جامعة وهران 1", wilaya: "Oran", bases: ["http://theses.univ-oran1.dz", "https://www.univ-oran1.dz", "http://dspace.univ-oran1.dz"], note: "portail PHP maison (rechepagear.php) - probablement pas OAI" },
	{ key: "oran2", nameFr: "Universite Oran 2 Mohamed Ben Ahmed", nameAr: "جامعة وهران 2", wilaya: "Oran", bases: ["https://ds.univ-oran2.dz:8443", "http://dspace.univ-oran2.dz"] },
	{ key: "constantine2", nameFr: "Universite Constantine 2 Abdelhamid Mehri", nameAr: "جامعة قسنطينة 2", wilaya: "Constantine", bases: ["https://www.univ-constantine2.dz/theses", "http://www.univ-constantine2.dz/theses", "http://dspace.univ-constantine2.dz"] },
	{ key: "annaba_biblio", nameFr: "Universite Badji Mokhtar Annaba (biblio)", nameAr: "جامعة عنابة", wilaya: "Annaba", bases: ["https://biblio.univ-annaba.dz", "http://biblio.univ-annaba.dz"] },
	{ key: "usto2", nameFr: "USTO (theses en ligne)", nameAr: "جامعة وهران للعلوم والتكنولوجيا", wilaya: "Oran", bases: ["http://www.univ-usto.dz/theses_en_ligne", "http://dspace.univ-usto.dz"] },
	{ key: "ghardaia_jspui", nameFr: "Universite de Ghardaia (JSPUI)", nameAr: "جامعة غرداية", wilaya: "Ghardaia", bases: ["http://dspace.univ-ghardaia.dz:8080/jspui", "http://dspace.univ-ghardaia.dz:8080"] },
	{ key: "medea_8080", nameFr: "Universite Yahia Fares Medea (:8080)", nameAr: "جامعة المدية", wilaya: "Medea", bases: ["http://dspace.univ-medea.dz:8080", "http://dspace.univ-medea.dz:8080/jspui"] },
	{ key: "temouchent_8080", nameFr: "Centre universitaire Ain Temouchent (:8080)", nameAr: "المركز الجامعي عين تيموشنت", wilaya: "Ain Temouchent", bases: ["http://dspace.univ-temouchent.edu.dz:8080"] },
	{ key: "relizane_home", nameFr: "Universite Ahmed Zabana Relizane", nameAr: "جامعة غليزان", wilaya: "Relizane", bases: ["http://dspace.univ-relizane.dz/home", "http://dspace.univ-relizane.dz"] },
	{ key: "tiaret_slash", nameFr: "Universite Ibn Khaldoun Tiaret", nameAr: "جامعة تيارت", wilaya: "Tiaret", bases: ["http://dspace.univ-tiaret.dz"] },
	{ key: "alger", nameFr: "Universite d'Alger 1", nameAr: "جامعة الجزائر 1", wilaya: "Alger", bases: ["http://biblio.univ-alger.dz/jspui"], note: "verifie: aucune communaute de mathematiques" },
	{ key: "biskra_div", nameFr: "Universite Mohamed Khider Biskra (EPrints)", nameAr: "جامعة بسكرة", wilaya: "Biskra", bases: ["http://thesis.univ-biskra.dz"], note: "deja dans repos.ts (biskra_eprints)" },

	// ---------- grandes ecoles: uniquement avec --schools ----------
	{ key: "esc_alger", nameFr: "Ecole superieure de commerce", nameAr: "المدرسة العليا للتجارة", wilaya: "Alger", school: true, bases: ["http://dspace.esc-alger.dz:8080"] },
	{ key: "hec", nameFr: "Ecole des hautes etudes commerciales", nameAr: "مدرسة الدراسات العليا التجارية", wilaya: "Alger", school: true, bases: ["https://dspace.hec.dz"] },
	{ key: "esgen", nameFr: "Ecole superieure de gestion et economie numerique", nameAr: "المدرسة العليا للتسيير", wilaya: "Alger", school: true, bases: ["http://dspace.esgen.edu.dz:8080/xmlui", "http://dspace.esgen.edu.dz:8080"] },
	{ key: "ensm", nameFr: "Ecole superieure de management", nameAr: "المدرسة العليا للمناجمنت", wilaya: "Alger", school: true, bases: ["https://ensm.dz/biblio"] },
	{ key: "ensa", nameFr: "Ecole nationale superieure agronomique", nameAr: "المدرسة الوطنية العليا للفلاحة", wilaya: "Alger", school: true, bases: ["http://dspace.ensa.dz:8080/jspui", "http://dspace.ensa.dz:8080"] },
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
	kind: "oai" | "html" | "none"
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
			const v = /\/server\/oai/.test(url)
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
	const paths = [
		"/community-list",
		"/jspui/community-list",
		"/xmlui/community-list",
		"/communities",
		"/view/divisions/",
		"/",
	]
	for (const p of paths) {
		const url = base.replace(/\/$/, "") + p
		try {
			const r = await get(url, "text/html")
			if (r.status !== 200 || r.body.length < 500) continue
			const sets: { spec: string; label: string; purity: "pure" | "mixed" }[] = []
			const re = /href="[^"]*\/handle\/(\d+\/\d+)"[^>]*>([\s\S]{0,200}?)<\/a>/g
			let m: RegExpExecArray | null
			while ((m = re.exec(r.body))) {
				const label = decode(m[2].replace(/<[^>]+>/g, " "))
					.replace(/\s+/g, " ")
					.trim()
				if (!label) continue
				const spec = "col_" + m[1].replace("/", "_")
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
		if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
			try {
				await dns.promises.resolve4(host)
			} catch {
				continue
			}
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
	L.push(`# candidats: ${hits.length}`)
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
		L.push(
			`- ${h.cand.key.padEnd(18)} ${h.kind.padEnd(5)} ${h.oai || h.base}  ${h.note || ""}`,
		)

	L.push("")
	L.push("=".repeat(70))
	L.push(`C) INJOIGNABLE - ${dead.length}`)
	L.push("=".repeat(70))
	for (const h of dead)
		L.push(`- ${h.cand.key.padEnd(18)} ${h.cand.bases.join(" | ")}`)

	return L.join("\n")
}

async function main() {
	let list = CANDIDATES.filter((c) => SCHOOLS || !c.school)
	if (ONLY.length) list = CANDIDATES.filter((c) => ONLY.includes(c.key))
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
		console.log(`${c.key.padEnd(18)} ${tag}`)
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
