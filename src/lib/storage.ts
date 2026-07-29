import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { attachmentDisposition } from "@/lib/content-disposition";

// واجهة تخزين ملفات S3-compatible (يعمل مع Cloudflare R2 أو أي مزوّد متوافق مع S3)
// راجع قسم "الأسبوع 6" في README لخطوات الإعداد.

function getClient() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.STORAGE_ENDPOINT,
    // مهم جدًا مع Cloudflare R2: بدونه يحاول SDK بناء رابط بنموذج المطلوب الفرعي
    // (bucket.endpoint) وهو نموزج لا تدعمه R2، فيفشل بخطأ DNS (ENOTFOUND).
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "",
      secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "",
    },
  });
}

function assertConfigured() {
  if (
    !process.env.STORAGE_ENDPOINT ||
    !process.env.STORAGE_ACCESS_KEY ||
    !process.env.STORAGE_SECRET_KEY ||
    !process.env.STORAGE_BUCKET
  ) {
    throw new Error(
      "إعدادات التخزين (STORAGE_*) ناقصة في .env — راجع قسم الأسبوع 6 في README",
    );
  }
}

/** يرفع ملفًا ويعيد رابطه العام. */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  assertConfigured();
  const bucket = process.env.STORAGE_BUCKET as string;
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  const base = process.env.STORAGE_PUBLIC_URL_BASE?.replace(/\/$/, "");
  return base
    ? `${base}/${key}`
    : `${process.env.STORAGE_ENDPOINT}/${bucket}/${key}`;
}

/** ينشئ رابط رفع مباشر (presigned PUT) صالحًا لمدة 10 دقائق — يسمح للمتصفح برفع ملفات كبيرة مباشرة إلى التخزين دون المرور بحد حجم الطلب في Vercel. */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<string> {
  assertConfigured();
  const client = getClient();
  const cmd = new PutObjectCommand({
    Bucket: process.env.STORAGE_BUCKET as string,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, cmd, { expiresIn: 600 });
}

/** مفتاح التخزين من رابط عام (أو null إن لم يكن من تخزيننا). */
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
  const clean = raw.split("?")[0];
  try {
    return decodeURIComponent(clean);
  } catch {
    return clean;
  }
}

/**
 * رابط تحميل موقّع (presigned GET) يفرض التنزيل بدل العرض داخل المتصفح.
 * إن تعذر التوقيع يعود للرابط العام كما هو.
 */
export async function getPresignedDownloadUrl(
  url: string,
  fileName: string,
): Promise<string> {
  try {
    assertConfigured();
    const key = keyFromPublicUrl(url);
    if (!key) return url;
    const client = getClient();
    const cmd = new GetObjectCommand({
      Bucket: process.env.STORAGE_BUCKET as string,
      Key: key,
      ResponseContentDisposition: attachmentDisposition(fileName),
    });
    return await getSignedUrl(client, cmd, { expiresIn: 3600 });
  } catch {
    return url;
  }
}

/** الرابط العام لمفتاح تخزين معين. */
export function publicUrlForKey(key: string): string {
  const base = process.env.STORAGE_PUBLIC_URL_BASE?.replace(/\/$/, "");
  const bucket = process.env.STORAGE_BUCKET as string;
  return base
    ? base + "/" + key
    : process.env.STORAGE_ENDPOINT + "/" + bucket + "/" + key;
}

/** يحدف ملفًا موجودًا برابطه العام. يتجاهل الأخطاء بهدوء (لا يوقف حذف الموضوع). */
export async function deleteFile(url: string): Promise<void> {
  try {
    const bucket = process.env.STORAGE_BUCKET;
    const base = process.env.STORAGE_PUBLIC_URL_BASE?.replace(/\/$/, "");
    if (!bucket || !base || !url.startsWith(`${base}/`)) return;
    const key = url.slice(base.length + 1);
    const client = getClient();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    console.error("تعذّر حذف الملف من التخزين:", err);
  }
}
