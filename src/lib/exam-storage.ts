import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { attachmentDisposition } from "@/lib/content-disposition";

const HOST_SUFFIX = ".blob.core.windows.net";

function account() { return process.env.AZURE_STORAGE_ACCOUNT ?? ""; }
function key() { return process.env.AZURE_STORAGE_KEY ?? ""; }
export function examContainerName() {
  return process.env.AZURE_EXAMS_CONTAINER || "exams";
}
function assertConfigured() {
  if (!account() || !key()) throw new Error("إعدادات Azure Storage غير مكتملة.");
}
function credential() { return new StorageSharedKeyCredential(account(), key()); }
function service() {
  return new BlobServiceClient("https" + "://" + account() + HOST_SUFFIX, credential());
}
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
export async function getExamUploadTarget(blobName: string) {
  const client = await container();
  const blob = client.getBlockBlobClient(blobName);
  const sas = generateBlobSASQueryParameters({
    containerName: examContainerName(), blobName,
    permissions: BlobSASPermissions.parse("cw"),
    startsOn: new Date(Date.now() - 300000),
    expiresOn: new Date(Date.now() + 3600000),
    protocol: SASProtocol.Https,
  }, credential()).toString();
  return { uploadUrl: blob.url + "?" + sas, url: blob.url, provider: "azure" as const };
}
async function signedRead(url: string, fileName?: string) {
  const blobName = examKeyFromUrl(url);
  if (!blobName) return url;
  const sas = generateBlobSASQueryParameters({
    containerName: examContainerName(), blobName,
    permissions: BlobSASPermissions.parse("r"),
    startsOn: new Date(Date.now() - 300000),
    expiresOn: new Date(Date.now() + 7200000),
    protocol: SASProtocol.Https,
    ...(fileName ? { contentDisposition: attachmentDisposition(fileName) } : {}),
  }, credential()).toString();
  return url.split("?")[0] + "?" + sas;
}
export function getExamReadUrl(url: string) { return signedRead(url); }
export function getExamDownloadUrl(url: string, fileName: string) { return signedRead(url, fileName); }
export async function deleteExamFile(url: string) {
  try {
    const blobName = examKeyFromUrl(url);
    if (!blobName) return;
    (await container()).getBlockBlobClient(blobName).deleteIfExists();
  } catch (error) { console.error("تعذر حذف ملف الاختبار من Azure:", error); }
}
