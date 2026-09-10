import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { isIP } from "node:net";
import { attachmentDisposition } from "@/lib/content-disposition";

const HOST_SUFFIX = ".blob.core.windows.net";
const MAX_EXAM_BYTES = 500 * 1024 * 1024;
function account() { return process.env.AZURE_STORAGE_ACCOUNT ?? ""; }
function key() { return process.env.AZURE_STORAGE_KEY ?? ""; }
/** يعيد استعمال حاوية المحاضرات الحالية افتراضيًا؛ المتغير المنفصل اختياري فقط. */
export function examContainerName() {
  return process.env.AZURE_EXAMS_CONTAINER || process.env.AZURE_STORAGE_CONTAINER || "lectures";
}
function assertConfigured() {
  if (!account() || !key()) throw new Error("إعدادات Azure Storage غير مكتملة.");
}
function credential() { return new StorageSharedKeyCredential(account(), key()); }
function service() { return new BlobServiceClient("https" + "://" + account() + HOST_SUFFIX, credential()); }
async function container() {
  assertConfigured();
  const client = service().getContainerClient(examContainerName());
  await client.createIfNotExists();
  return client;
}
export function isExamAzureUrl(url: string) {
  return Boolean(account()) && url.startsWith("https" + "://" + account() + HOST_SUFFIX + "/" + examContainerName() + "/");
}
export function examKeyFromUrl(url: string): string | null {
  if (!isExamAzureUrl(url)) return null;
  const path = new URL(url).pathname;
  const prefix = "/" + examContainerName() + "/";
  return path.startsWith(prefix) ? decodeURIComponent(path.slice(prefix.length)) : null;
}
function assertPublicSource(raw: string, fileName?: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("invalid PDF URL"); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("PDF URL must use http or https");
  if (url.username || url.password) throw new Error("PDF URL must not contain credentials");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "169.254.169.254" || host === "metadata.azure.internal") throw new Error("private source hosts are not allowed");
  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    const parts = host.split(".").map(Number);
    const privateIp = parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
    if (privateIp) throw new Error("private source IPs are not allowed");
  }
  if (ipVersion === 6 && (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd"))) throw new Error("private source IPs are not allowed");
  const looksPdf = url.pathname.toLowerCase().endsWith(".pdf") || String(fileName || "").toLowerCase().endsWith(".pdf");
  if (!looksPdf) throw new Error("source URL or fileName must end with .pdf");
  return url.toString();
}
export async function copyExamPdfFromUrl(sourceUrl: string, blobName: string, fileName?: string) {
  const safeSource = assertPublicSource(sourceUrl, fileName);
  const client = await container();
  const blob = client.getBlockBlobClient(blobName);
  try {
    await blob.syncUploadFromURL(safeSource, { blobHTTPHeaders: { blobContentType: "application/pdf" } });
    const props = await blob.getProperties();
    const sizeBytes = Number(props.contentLength || 0);
    if (sizeBytes <= 0 || sizeBytes > MAX_EXAM_BYTES) throw new Error("copied PDF is empty or exceeds 500 MB");
    const magic = await blob.downloadToBuffer(0, 5);
    if (magic.toString("ascii") !== "%PDF-") throw new Error("source did not return a real PDF file");
    return { url: blob.url, sizeBytes };
  } catch (error) {
    await blob.deleteIfExists().catch(() => undefined);
    throw error;
  }
}
/** يعيد ملف المعاينة من Azure إن كان موجودًا، وإلا ينسخه مرة واحدة من الجامعة. */
export async function ensureExamPdfFromUrl(sourceUrl: string, blobName: string, fileName?: string) {
  const blob = (await container()).getBlockBlobClient(blobName);
  if (await blob.exists()) {
    const props = await blob.getProperties();
    const sizeBytes = Number(props.contentLength || 0);
    if (sizeBytes > 0 && sizeBytes <= MAX_EXAM_BYTES) return { url: blob.url, sizeBytes };
    await blob.deleteIfExists();
  }
  return copyExamPdfFromUrl(sourceUrl, blobName, fileName);
}
export async function getExamUploadTarget(blobName: string) {
  const client = await container();
  const blob = client.getBlockBlobClient(blobName);
  const sas = generateBlobSASQueryParameters({ containerName: examContainerName(), blobName, permissions: BlobSASPermissions.parse("cw"), startsOn: new Date(Date.now() - 300000), expiresOn: new Date(Date.now() + 3600000), protocol: SASProtocol.Https }, credential()).toString();
  return { uploadUrl: blob.url + "?" + sas, url: blob.url, provider: "azure" as const };
}
async function signedRead(url: string, fileName?: string) {
  const blobName = examKeyFromUrl(url);
  if (!blobName) return url;
  const sas = generateBlobSASQueryParameters({ containerName: examContainerName(), blobName, permissions: BlobSASPermissions.parse("r"), startsOn: new Date(Date.now() - 300000), expiresOn: new Date(Date.now() + 7200000), protocol: SASProtocol.Https, ...(fileName ? { contentDisposition: attachmentDisposition(fileName) } : {}) }, credential()).toString();
  return url.split("?")[0] + "?" + sas;
}
export function getExamReadUrl(url: string) { return signedRead(url); }
export function getExamDownloadUrl(url: string, fileName: string) { return signedRead(url, fileName); }
export async function deleteExamFile(url: string) {
  try {
    const blobName = examKeyFromUrl(url);
    if (!blobName) return;
    await (await container()).getBlockBlobClient(blobName).deleteIfExists();
  } catch (error) { console.error("تعذر حذف ملف الاختبار من Azure:", error); }
}
