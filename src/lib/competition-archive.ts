import { isIP } from "node:net"
import type {
  CompetitionAsset,
  CompetitionEdition,
  WorldCompetition,
} from "@/data/world-competitions"

const MAX_HTML_BYTES = 6 * 1024 * 1024
const MAX_DISCOVERED_ASSETS = 16
const MAX_PDF_PROBES = 8
const FETCH_TIMEOUT_MS = 10_000
const PDF_PROBE_TIMEOUT_MS = 5_000
const PDF_HINT = /\.pdf(?:$|[?#&])/i
const PDF_LINK_HINT = /(pdf|download|attachment|document|paper|exam|problem|solution|question|file)/i
const SOLUTION_HINT = /(solution|solutions|answer|answers|marking|scheme|corrig|corrigé|sol(?:ution)?\b|soluzioni?|soluciones?|soluções?|lösungen?|answers?|uitwerkingen?|antwoorden?|çözümler?|gabarito|respostas?|정답|해답|حل|الإجابة)/i
const PROBLEM_HINT = /(problem|problems|question|questions|paper|exam|test|task|tasks|day|round|individual|team|guts|level|geometry|algebra|combinatorics|olympiad|(?:bmo|cmo|inmo|rmo)\d|preuve|sujet|provas?|problemas?|opgaven|aufgaben|soruları|문제|مسائل|موضوع)/i
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
      const html = await readResponseText(response, MAX_HTML_BYTES)
      return { html, finalUrl: current }
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error("too many archive redirects")
}

async function readResponseText(response: Response, maxBytes: number) {
  if (!response.body) return (await response.text()).slice(0, maxBytes)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let bytesRead = 0
  let text = ""
  try {
    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read()
      if (done || !value) break
      const remaining = maxBytes - bytesRead
      const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value
      bytesRead += chunk.byteLength
      text += decoder.decode(chunk, { stream: bytesRead < maxBytes })
      if (chunk.byteLength < value.byteLength) break
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }
  return text + decoder.decode()
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
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
}

function cleanLabel(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
}

function fileLabel(url: URL) {
  const name = decodeURIComponent(url.pathname.split("/").pop() || "official-file.pdf")
  return name.replace(/[-_]+/g, " ").replace(/\.pdf$/i, "").trim()
}

function assetKind(value: string, context = ""): CompetitionAsset["kind"] {
  if (SOLUTION_HINT.test(value)) return "solutions"
  if (PROBLEM_HINT.test(value)) return "problems"
  if (SOLUTION_HINT.test(context)) return "solutions"
  if (PROBLEM_HINT.test(context)) return "problems"
  return "other"
}

function documentBaseUrl(html: string, fallback: URL) {
  const match = html.match(/<base\b[^>]*?href\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))/i)
  if (!match) return fallback
  try {
    return assertPublicArchiveUrl(new URL(decodeHtml((match[2] ?? match[3] ?? "").trim()), fallback).toString())
  } catch {
    return fallback
  }
}

function nearbyContext(html: string, index: number) {
  return cleanLabel(html.slice(Math.max(0, index - 1_600), index))
}

function markerYear(marker: string, referenceYear: number) {
  if (marker.length === 4) return Number(marker)
  const short = Number(marker.replace(/['’]/g, ""))
  return Math.floor(referenceYear / 100) * 100 + short
}

function nearestContextYear(value: string, referenceYear: number) {
  const markers = [...value.matchAll(/(?:19|20)\d{2}|['’]\d{2}/g)]
  const marker = markers.at(-1)?.[0]
  return marker ? markerYear(marker, referenceYear) : null
}

function basenameHasShortYear(basename: string, year: number) {
  const shortYear = String(year % 100).padStart(2, "0")
  return basenameShortYear(basename, year) === shortYear
}

function basenameShortYear(basename: string, referenceYear: number) {
  const match = basename.match(/(\d{2})(?=(?:eng|sol|problems?|solutions?)?\.pdf(?:$|[?#&]))/i)
  if (!match) return null
  const short = Number(match[1])
  const full = Math.floor(referenceYear / 100) * 100 + short
  return String(full % 100).padStart(2, "0")
}

function matchesEditionYear(
  searchable: string,
  basename: string,
  context: string,
  edition: CompetitionEdition,
  pageIsYearSpecific: boolean,
  archiveMatches: boolean,
) {
  if (pageIsYearSpecific || archiveMatches) return true
  const year = String(edition.year)
  const yearsInFilename: string[] = basename.match(/(?:19|20)\d{2}/g) ?? []
  if (yearsInFilename.length > 0) return yearsInFilename.includes(year)
  const shortYear = basenameShortYear(basename, edition.year)
  if (shortYear !== null) return shortYear === String(edition.year % 100).padStart(2, "0")
  if (searchable.includes(year)) return true
  const contextualYear = nearestContextYear(context, edition.year)
  if (contextualYear !== null) return contextualYear === edition.year
  return basenameHasShortYear(basename, edition.year)
}

async function probePdfUrl(rawUrl: URL) {
  let current = assertPublicArchiveUrl(rawUrl.toString())
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PDF_PROBE_TIMEOUT_MS)
    try {
      const response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        next: { revalidate: 86_400 },
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DocMathDZ/1.0; +https://www.docmathdz.dev)",
          Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.1",
          Range: "bytes=0-7",
        },
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location")
        if (!location) return false
        current = assertPublicArchiveUrl(new URL(location, current).toString())
        continue
      }
      if (!response.ok && response.status !== 206) return false
      const contentType = (response.headers.get("content-type") ?? "").toLowerCase()
      if (contentType.includes("application/pdf")) {
        await response.body?.cancel().catch(() => undefined)
        return true
      }
      const reader = response.body?.getReader()
      if (!reader) return false
      const { value } = await reader.read()
      await reader.cancel().catch(() => undefined)
      return Boolean(value && new TextDecoder("latin1").decode(value.subarray(0, 5)) === "%PDF-")
    } catch {
      return false
    } finally {
      clearTimeout(timer)
    }
  }
  return false
}

function declaredAssets(edition: CompetitionEdition): CompetitionAsset[] {
  const assets: CompetitionAsset[] = [...(edition.assets ?? [])]
  if (edition.officialPdfUrl) assets.push({ label: "المسائل الرسمية", url: edition.officialPdfUrl, kind: "problems", format: "pdf", source: "declared" })
  if (edition.officialSolutionPdfUrl) assets.push({ label: "الحلول الرسمية", url: edition.officialSolutionPdfUrl, kind: "solutions", format: "pdf", source: "declared" })
  return assets
}

async function discoverPdfAssets(html: string, pageUrl: URL, edition: CompetitionEdition) {
  const assets: Array<CompetitionAsset & { score: number; needsProbe?: boolean }> = []
  const baseUrl = documentBaseUrl(html, pageUrl)
  const year = String(edition.year)
  const pageIsYearSpecific = Boolean(edition.archivePageSpecific || pageUrl.toString().includes(year))
  const anchorPattern = /<a\b[^>]*?href\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = anchorPattern.exec(html)) && assets.length < 100) {
    const rawHref = decodeHtml((match[2] ?? match[3] ?? "").trim())
    let url: URL
    try {
      url = assertPublicArchiveUrl(new URL(rawHref, baseUrl).toString())
      url.hash = ""
    } catch {
      continue
    }
    const isPdf = PDF_HINT.test(url.toString())
    const isGoogleDriveFile = url.hostname === "drive.google.com" && url.pathname.includes("/file/d/")

    const anchorLabel = cleanLabel(match[4])
    const basename = decodeURIComponent(url.pathname.split("/").pop() || "")
    const archiveMatches = Boolean(edition.archiveMatch && url.pathname.includes(edition.archiveMatch))
    const searchable = `${anchorLabel} ${basename}`
    const context = nearbyContext(html, match.index)
    const immediateContext = cleanLabel(html.slice(Math.max(0, match.index - 260), match.index))
    const normalizedSearchable = searchable.toLowerCase()
    if (edition.assetMatch && !normalizedSearchable.includes(edition.assetMatch.toLowerCase())) continue
    if (edition.assetExclude?.some((term) => normalizedSearchable.includes(term.toLowerCase()))) continue
    if (!matchesEditionYear(searchable, basename, context, edition, pageIsYearSpecific, archiveMatches)) continue
    if (EXCLUDED_FILE_HINT.test(searchable) && !SOLUTION_HINT.test(searchable)) continue
    const needsProbe = !isPdf && !isGoogleDriveFile
    if (needsProbe && (!PDF_LINK_HINT.test(`${searchable} ${url.search}`) || assets.filter((asset) => asset.needsProbe).length >= MAX_PDF_PROBES)) continue

    const kind = assetKind(searchable, immediateContext)
    const genericLabel = /^(pdf|problems?|questions?|solutions?|answers?|download)$/i.test(anchorLabel)
    const label = !anchorLabel || genericLabel ? fileLabel(url) : anchorLabel
    let score = kind === "problems" ? 80 : kind === "solutions" ? 50 : 20
    if (url.pathname.includes(year)) score += 30
    if (anchorLabel.includes(year)) score += 20
    if (nearestContextYear(context, edition.year) === edition.year) score += 18
    if (basenameHasShortYear(basename, edition.year)) score += 12
    if (/english|eng\b/i.test(`${searchable} ${immediateContext}`)) score += 8
    assets.push({ label, url: url.toString(), kind, format: isPdf ? "pdf" : "external", source: "discovered", score, needsProbe })
  }

  const embeddedPattern = /<(?:embed|iframe|object)\b[^>]*?(?:src|data)\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))[^>]*>/gi
  while ((match = embeddedPattern.exec(html)) && assets.length < 120) {
    const rawUrl = decodeHtml((match[2] ?? match[3] ?? "").trim())
    let url: URL
    try {
      url = assertPublicArchiveUrl(new URL(rawUrl, baseUrl).toString())
      url.hash = ""
    } catch {
      continue
    }
    if (!PDF_HINT.test(url.toString())) continue
    const basename = decodeURIComponent(url.pathname.split("/").pop() || "")
    const context = nearbyContext(html, match.index)
    if (!matchesEditionYear(basename, basename, context, edition, pageIsYearSpecific, false)) continue
    const immediateContext = cleanLabel(html.slice(Math.max(0, match.index - 260), match.index))
    const kind = assetKind(basename, immediateContext)
    assets.push({ label: fileLabel(url), url: url.toString(), kind, format: "pdf", source: "discovered", score: kind === "problems" ? 72 : 45 })
  }

  const verifiedAssets = await Promise.all(assets.map(async (asset) => (
    asset.needsProbe && !(await probePdfUrl(new URL(asset.url))) ? null : asset
  )))
  const deduplicated = new Map<string, CompetitionAsset & { score: number; needsProbe?: boolean }>()
  for (const asset of verifiedAssets) {
    if (!asset) continue
    const previous = deduplicated.get(asset.url)
    if (!previous || asset.score > previous.score) deduplicated.set(asset.url, asset)
  }
  return [...deduplicated.values()]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, MAX_DISCOVERED_ASSETS)
    .map(({ score: _score, needsProbe: _needsProbe, ...asset }) => asset)
}

function discoverEditionPages(html: string, pageUrl: URL, edition: CompetitionEdition) {
  const year = String(edition.year)
  const urls: URL[] = []
  const baseUrl = documentBaseUrl(html, pageUrl)
  const anchorPattern = /<a\b[^>]*?href\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = anchorPattern.exec(html)) && urls.length < 3) {
    const label = cleanLabel(match[4])
    let url: URL
    try { url = assertPublicArchiveUrl(new URL(decodeHtml((match[2] ?? match[3] ?? "").trim()), baseUrl).toString()) } catch { continue }
    if (PDF_HINT.test(url.toString()) || (url.hostname === "drive.google.com" && url.pathname.includes("/file/d/"))) continue
    if (/\.(?:xlsx?|docx?|zip|jpe?g|png|gif)$/i.test(url.pathname)) continue
    if (url.hostname !== pageUrl.hostname) continue
    const context = nearbyContext(html, match.index)
    if (!matchesEditionYear(`${label} ${url.pathname} ${url.search}`, url.pathname, context, edition, false, false)) continue
    if (!urls.some((item) => item.toString() === url.toString())) urls.push(url)
  }
  return urls
}

export async function resolveCompetitionAssets(competition: WorldCompetition, edition: CompetitionEdition) {
  const declared = declaredAssets(edition)
  if (!edition.officialProblemsUrl || edition.officialPdfUrl) return declared

  try {
    const { html, finalUrl } = await fetchArchiveHtml(edition.officialProblemsUrl)
    const discovered = await discoverPdfAssets(html, finalUrl, edition)
    if (discovered.length === 0) {
      for (const editionPage of discoverEditionPages(html, finalUrl, edition)) {
        try {
          const nested = await fetchArchiveHtml(editionPage.toString())
          discovered.push(...await discoverPdfAssets(nested.html, nested.finalUrl, edition))
        } catch (error) {
          console.warn(`[competitions] Could not inspect nested archive page ${editionPage}:`, error)
        }
      }
    }
    const seen = new Set(declared.map((asset) => asset.url))
    return [...declared, ...discovered.filter((asset) => !seen.has(asset.url))].slice(0, MAX_DISCOVERED_ASSETS)
  } catch (error) {
    console.warn(`[competitions] Could not inspect official archive for ${competition.slug} ${edition.year}:`, error)
    return declared
  }
}
