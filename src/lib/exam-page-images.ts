import "server-only";
import { BlobSASPermissions, BlobServiceClient, generateBlobSASQueryParameters, SASProtocol, StorageSharedKeyCredential } from "@azure/storage-blob";
import { examContainerName, examKeyFromUrl, isExamAzureUrl } from "@/lib/exam-storage";

const MAX_RASTER_PDF_BYTES = 80 * 1024 * 1024;
const MAX_PAGES = 100;
const SCALE = 2.4;
const QUALITY = 88;

export type ExamPageImage = { page: number; width: number; height: number; key: string; sizeBytes: number };
export type ExamPageManifest = { version: 1; generatedAt: string; pdfUrl: string; pageCount: number; pages: ExamPageImage[] };
type CanvasLike = { width: number; height: number; getContext: (type: "2d") => unknown };

function account() { return process.env.AZURE_STORAGE_ACCOUNT || ""; }
function storageKey() { return process.env.AZURE_STORAGE_KEY || ""; }
function credential() { return new StorageSharedKeyCredential(account(), storageKey()); }
function service() {
  if (!account() || !storageKey()) throw new Error("Azure Storage is not configured");
  return new BlobServiceClient("https" + "://" + account() + ".blob.core.windows.net", credential());
}
async function container() {
  const client = service().getContainerClient(examContainerName());
  await client.createIfNotExists();
  return client;
}
function manifestKeyForPdf(pdfUrl: string) {
  const key = examKeyFromUrl(pdfUrl);
  if (!key) throw new Error("PDF must be stored in the configured Azure container");
  return key.replace(/\.pdf$/i, "") + "/manifest.json";
}
function assetUrl(key: string) {
  return "https" + "://" + account() + ".blob.core.windows.net/" + examContainerName() + "/" + key;
}
function readSas(key: string) {
  return generateBlobSASQueryParameters({
    containerName: examContainerName(), blobName: key,
    permissions: BlobSASPermissions.parse("r"),
    startsOn: new Date(Date.now() - 5 * 60 * 1000),
    expiresOn: new Date(Date.now() + 12 * 60 * 60 * 1000),
    protocol: SASProtocol.Https,
  }, credential()).toString();
}
export async function loadExamPageManifest(pdfUrl: string): Promise<ExamPageManifest | null> {
  if (!isExamAzureUrl(pdfUrl)) return null;
  const blob = (await container()).getBlockBlobClient(manifestKeyForPdf(pdfUrl));
  if (!await blob.exists()) return null;
  try {
    const data = await blob.downloadToBuffer();
    const manifest = JSON.parse(data.toString("utf8")) as ExamPageManifest;
    return manifest.version === 1 && Array.isArray(manifest.pages) ? manifest : null;
  } catch { return null; }
}
export async function signedExamPageManifest(pdfUrl: string) {
  const manifest = await loadExamPageManifest(pdfUrl);
  if (!manifest) return null;
  return { ...manifest, pages: manifest.pages.map((page) => ({ ...page, url: assetUrl(page.key) + "?" + readSas(page.key) })) };
}

class NodeCanvasFactory {
  constructor(private readonly makeCanvas: (width: number, height: number) => CanvasLike) {}
  create(width: number, height: number) {
    const canvas = this.makeCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(item: ReturnType<NodeCanvasFactory["create"]>, width: number, height: number) { item.canvas.width = width; item.canvas.height = height; }
  destroy(item: ReturnType<NodeCanvasFactory["create"]>) { item.canvas.width = 0; item.canvas.height = 0; }
}

export async function rasterizeExamPdf(pdfUrl: string, force = false): Promise<ExamPageManifest> {
  if (!isExamAzureUrl(pdfUrl)) throw new Error("Only Azure exam PDFs can be rasterized");
  if (!force) {
    const existing = await loadExamPageManifest(pdfUrl);
    if (existing) return existing;
  }
  const pdfKey = examKeyFromUrl(pdfUrl);
  if (!pdfKey) throw new Error("Invalid Azure PDF URL");
  const client = await container();
  const pdfBlob = client.getBlockBlobClient(pdfKey);
  const props = await pdfBlob.getProperties();
  const pdfBytes = Number(props.contentLength || 0);
  if (!pdfBytes || pdfBytes > MAX_RASTER_PDF_BYTES) throw new Error("Image reader supports PDFs up to 80 MB; original PDF remains available");
  const source = await pdfBlob.downloadToBuffer();

  const canvasModule = await import("@napi-rs/canvas");
  const globalCanvas = globalThis as unknown as { DOMMatrix?: unknown; ImageData?: unknown; Path2D?: unknown };
  globalCanvas.DOMMatrix ??= canvasModule.DOMMatrix;
  globalCanvas.ImageData ??= canvasModule.ImageData;
  globalCanvas.Path2D ??= canvasModule.Path2D;
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(source), useSystemFonts: true });
  const document = await task.promise;
  if (document.numPages > MAX_PAGES) { await document.destroy(); throw new Error(`Image reader supports up to ${MAX_PAGES} pages`); }

  const baseKey = pdfKey.replace(/\.pdf$/i, "") + "/pages";
  const pages: ExamPageImage[] = [];
  const canvasFactory = new NodeCanvasFactory(canvasModule.createCanvas as unknown as (width: number, height: number) => CanvasLike);
  try {
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: SCALE });
      const canvas = canvasModule.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");
      await page.render({ canvasContext: context as unknown as CanvasRenderingContext2D, viewport, canvasFactory } as never).promise;
      const image = await canvas.encode("webp", QUALITY);
      const imageKey = `${baseKey}/page-${String(number).padStart(3, "0")}.webp`;
      await client.getBlockBlobClient(imageKey).uploadData(image, { blobHTTPHeaders: { blobContentType: "image/webp", blobCacheControl: "public, max-age=31536000, immutable" } });
      pages.push({ page: number, width: Math.round(viewport.width / SCALE), height: Math.round(viewport.height / SCALE), key: imageKey, sizeBytes: image.length });
      page.cleanup();
    }
  } finally { await document.destroy(); }

  const manifest: ExamPageManifest = { version: 1, generatedAt: new Date().toISOString(), pdfUrl, pageCount: pages.length, pages };
  await client.getBlockBlobClient(manifestKeyForPdf(pdfUrl)).uploadData(Buffer.from(JSON.stringify(manifest)), { blobHTTPHeaders: { blobContentType: "application/json", blobCacheControl: "no-cache" } });
  return manifest;
}
