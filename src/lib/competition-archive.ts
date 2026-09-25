import { isIP } from "node:net"
import type {
  CompetitionAsset,
  CompetitionEdition,
  WorldCompetition,
} from "@/data/world-competitions"

const MAX_HTML_BYTES = 2 * 1024 * 1024
const MAX_DISCOVERED_ASSETS = 16
const FETCH_TIMEOUT_MS = 10_000
const PDF_HINT = /\.(pdf)(?:$|[?#])/i
const SOLUTION_HINT = /(solution|solutions|answer|answers|marking|scheme|corrig|corrigé|sol(?:ution)?\b|حل|الإجابة)/i
const PROBLEM_HINT = /(problem|problems|question|questions|paper|exam|test|task|tasks|day|round|individual|team|guts|geometry|algebra|combinatorics|olympiad|(?:bmo|cmo|inmo|rmo)\d|preuve|sujet|مسائل|موضوع)/i
const EXCLUDED_FILE_HINT = /(report|results?|winners?|statistics|certificate|announcement|brochure|schedule)/i

function assertPublicArchiveUrl(raw: string) {
  const url = new URL(raw)
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("unsupported archive protocol")
  if (url.username || url.password) throw new Error("archive URL must not contain credentials")
  const host = url.hostname.toLowerCase()
  if (host === "localhost" || host.endsWith(".localhost") || host === "169.254.169.254" || host === "metadata.azure.internal") throw new Error("private archive host")
  const ipVersion = isIP(host)
  if (ipVersion === 4) {
    const parts = host.split(".").map(Number)
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168)) throw new Error("private archive IP")
  }
  if (ipVersion === 6 && (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd"))) throw new Error("private archive IP")
  return url
}

async function fetchArchiveHtml(rawUrl: string) {
  let current = assertPublicArchiveUrl(rawUrl)
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        next: { revalidate: 86_400 },
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DocMathDZ/1.0; +https://www.docmathdz.dev)",
          Accept: "text/html,application/xhtml+xml",
        },
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location")
        if (!location) throw new Error("archive redirect has no location")
        current = assertPublicArchiveUrl(new URL(location, current).toString())
        continue
      }
      if (!response.ok) throw new Error(`archive returned HTTP ${response.status}`)
      const contentType = response.headers.get("content-type") ?? ""
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("archive did not return HTML")
      const length = Number(response.headers.get("content-length") || 0)
      if (length > MAX_HTML_BYTES) throw new Error("archive page is too large")
      const html = await response.text()
      if (Buffer.byteLength(html) > MAX_HTML_BYTES) throw new Error("archive page is too large")
      return { html, finalUrl: current }
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error("too many archive redirects")
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&rsquo;/gi, "’")
    .replace(/&ndash;/gi, "–")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
}

function cleanLabel(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
}

function fileLabel(url: URL) {
  const name = decodeURIComponent(url.pathname.split("/").pop() || "official-file.pdf")
  return name.replace(/[-_]+/g, " ").replace(/\.pdf$/i, "").trim()
}

function assetKind(value: string): CompetitionAsset["kind"] {
  if (SOLUTION_HINT.test(value)) return "solutions"
  if (PROBLEM_HINT.test(value)) return "problems"
  return "other"
}

function declaredAssets(edition: CompetitionEdition): CompetitionAsset[] {
  const assets: CompetitionAsset[] = []
  if (edition.officialPdfUrl) assets.push({ label: "المسائل الرسمية", url: edition.officialPdfUrl, kind: "problems", source: "declared" })
  if (edition.officialSolutionPdfUrl) assets.push({ label: "الحلول الرسمية", url: edition.officialSolutionPdfUrl, kind: "solutions", source: "declared" })
  return assets
}

function discoverPdfAssets(html: string, pageUrl: URL, edition: CompetitionEdition) {
  const assets: Array<CompetitionAsset & { score: number }> = []
  const year = String(edition.year)
  const pageIsYearSpecific = pageUrl.toString().includes(year)
  const anchorPattern = /<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = anchorPattern.exec(html)) && assets.length < 100) {
    const rawHref = decodeHtml(match[2].trim())
    let url: URL
    try {
      url = assertPublicArchiveUrl(new URL(rawHref, pageUrl).toString())
    } catch {
      continue
    }
    if (!PDF_HINT.test(url.toString())) continue

    const anchorLabel = cleanLabel(match[3])
    const basename = decodeURIComponent(url.pathname.split("/").pop() || "")
    const yearsInFilename: string[] = basename.match(/(?:19|20)\d{2}/g) ?? []
    if (yearsInFilename.length > 0 && !yearsInFilename.includes(year)) continue

    const searchable = `${anchorLabel} ${basename}`
    const hasYear = searchable.includes(year)
    if (!pageIsYearSpecific && !hasYear) continue
    if (EXCLUDED_FILE_HINT.test(searchable) && !SOLUTION_HINT.test(searchable)) continue

    const kind = assetKind(searchable)
    const genericLabel = /^(problems?|questions?|solutions?|answers?|download)$/i.test(anchorLabel)
    const label = !anchorLabel || genericLabel ? fileLabel(url) : anchorLabel
    let score = kind === "problems" ? 80 : kind === "solutions" ? 50 : 20
    if (url.pathname.includes(year)) score += 30
    if (anchorLabel.includes(year)) score += 20
    if (/english|eng\b/i.test(searchable)) score += 8
    assets.push({ label, url: url.toString(), kind, source: "discovered", score })
  }

  const deduplicated = new Map<string, CompetitionAsset & { score: number }>()
  for (const asset of assets) {
    const previous = deduplicated.get(asset.url)
    if (!previous || asset.score > previous.score) deduplicated.set(asset.url, asset)
  }
  return [...deduplicated.values()]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, MAX_DISCOVERED_ASSETS)
    .map(({ score: _score, ...asset }) => asset)
}

export async function resolveCompetitionAssets(competition: WorldCompetition, edition: CompetitionEdition) {
  const declared = declaredAssets(edition)
  if (!edition.officialProblemsUrl || edition.officialPdfUrl) return declared

  try {
    const { html, finalUrl } = await fetchArchiveHtml(edition.officialProblemsUrl)
    const discovered = discoverPdfAssets(html, finalUrl, edition)
    const seen = new Set(declared.map((asset) => asset.url))
    return [...declared, ...discovered.filter((asset) => !seen.has(asset.url))]
  } catch (error) {
    console.warn(`[competitions] Could not inspect official archive for ${competition.slug} ${edition.year}:`, error)
    return declared
  }
}
