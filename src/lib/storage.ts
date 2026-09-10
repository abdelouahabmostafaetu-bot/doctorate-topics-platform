import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { attachmentDisposition } from "@/lib/content-disposition";
import { deleteExamFile, isExamAzureUrl } from "@/lib/exam-storage";

function getClient() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.STORAGE_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "",
      secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "",
    },
  });
}
function assertConfigured() {
  if (!process.env.STORAGE_ENDPOINT || !process.env.STORAGE_ACCESS_KEY || !process.env.STORAGE_SECRET_KEY || !process.env.STORAGE_BUCKET) {
    throw new Error("إعدادات التخزين (STORAGE_*) ناقصة في .env — راجع قسم الأسبوع 6 في README");
  }
}
export async function uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
  assertConfigured();
  const bucket = process.env.STORAGE_BUCKET as string;
  await getClient().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
  const base = process.env.STORAGE_PUBLIC_URL_BASE?.replace(/\/$/, "");
  return base ? `${base}/${key}` : `${process.env.STORAGE_ENDPOINT}/${bucket}/${key}`;
}
export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  assertConfigured();
  return getSignedUrl(getClient(), new PutObjectCommand({ Bucket: process.env.STORAGE_BUCKET as string, Key: key, ContentType: contentType }), { expiresIn: 600 });
}
export function keyFromPublicUrl(url: string): string | null {
  const bucket = process.env.STORAGE_BUCKET;
  const base = process.env.STORAGE_PUBLIC_URL_BASE?.replace(/\/$/, "");
  let raw: string | null = null;
  if (base && url.startsWith(base + "/")) raw = url.slice(base.length + 1);
  else if (bucket && process.env.STORAGE_ENDPOINT) {
    const prefix = process.env.STORAGE_ENDPOINT + "/" + bucket + "/";
    if (url.startsWith(prefix)) raw = url.slice(prefix.length);
  }
  if (!raw) return null;
  try { return decodeURIComponent(raw.split("?")[0]); } catch { return raw.split("?")[0]; }
}
export async function getPresignedDownloadUrl(url: string, fileName: string): Promise<string> {
  try {
    assertConfigured();
    const key = keyFromPublicUrl(url);
    if (!key) return url;
    return await getSignedUrl(getClient(), new GetObjectCommand({ Bucket: process.env.STORAGE_BUCKET as string, Key: key, ResponseContentDisposition: attachmentDisposition(fileName) }), { expiresIn: 3600 });
  } catch { return url; }
}
export function publicUrlForKey(key: string): string {
  const base = process.env.STORAGE_PUBLIC_URL_BASE?.replace(/\/$/, "");
  const bucket = process.env.STORAGE_BUCKET as string;
  return base ? base + "/" + key : process.env.STORAGE_ENDPOINT + "/" + bucket + "/" + key;
}
export async function deleteFile(url: string): Promise<void> {
  try {
    if (isExamAzureUrl(url)) { await deleteExamFile(url); return; }
    const bucket = process.env.STORAGE_BUCKET;
    const base = process.env.STORAGE_PUBLIC_URL_BASE?.replace(/\/$/, "");
    if (!bucket || !base || !url.startsWith(`${base}/`)) return;
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: url.slice(base.length + 1) }));
  } catch (err) { console.error("تعذّر حذف الملف من التخزين:", err); }
}
