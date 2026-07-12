import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// واجهة تخزين ملفات S3-compatible (يعمل مع Cloudflare R2 أو أي مزوّد متوافق مع S3)
// راجع قسم "الأسبوع 6" في README لخطوات الإعداد.

function getClient() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.STORAGE_ENDPOINT,
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

/** الرابط العام لمفتاح تخزين معين. */
export function publicUrlForKey(key: string): string {
  const base = process.env.STORAGE_PUBLIC_URL_BASE?.replace(/\/$/, "");
  const bucket = process.env.STORAGE_BUCKET as string;
  return base
    ? base + "/" + key
    : process.env.STORAGE_ENDPOINT + "/" + bucket + "/" + key;
}

/** يحذف ملفًا موجودًا برابطه العام. يتجاهل الأخطاء بهدوء (لا يوقف حذف الموضوع). */
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
