import { NextResponse, after } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLectureDownloadUrl } from "@/lib/lecture-storage";
import { attachmentDisposition } from "@/lib/content-disposition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// تحميل كل ملفات الموديل في أرشيف ZIP واحد، مع الحفاظ على شجرة المجلدات.
//
// الأرشيف يُبنى ويُبثّ تدريجياً (streaming) بطريقة store بدون إعادة ضغط،
// لأن ملفات PDF مضغوطة أصلاً — فلا يُحمّل الخادم ولا تُنتظر معالجة طويلة.

const MAX_TOTAL_BYTES = 500 * 1024 * 1024; // حد أمان لتجنّب انتهاء مهلة الخادم

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i += 1) {
		let c = i;
		for (let k = 0; k < 8; k += 1) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[i] = c >>> 0;
	}
	return table;
})();

function crc32(buf: Uint8Array): number {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i += 1) {
		c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; day: number } {
	const d = isNaN(date.getTime()) ? new Date() : date;
	const time =
		((d.getHours() << 11) |
			(d.getMinutes() << 5) |
			Math.floor(d.getSeconds() / 2)) &
		0xffff;
	const day =
		(((Math.max(d.getFullYear(), 1980) - 1980) << 9) |
			((d.getMonth() + 1) << 5) |
			d.getDate()) &
		0xffff;
	return { time, day };
}

/** اسم أمن داخل الأرشيف (يحفظ المجلدات بـ /). */
function safeEntryName(folderPath: string, fileName: string): string {
	const clean = (value: string) =>
		value
			.replace(/\\/g, "/")
			.replace(/[:*?"<>|]/g, "-")
			.replace(/\.\.+/g, ".")
			.replace(/\/+/g, "/")
			.replace(/^\/+|\/+$/g, "")
			.trim();
	const dir = clean(folderPath || "");
	const name = clean(fileName || "file") || "file";
	return dir ? `${dir}/${name}` : name;
}

function localHeader(
	nameBytes: Buffer,
	crc: number,
	size: number,
	time: number,
	day: number,
): Buffer {
	const head = Buffer.alloc(30);
	head.writeUInt32LE(0x04034b50, 0);
	head.writeUInt16LE(20, 4); // version needed
	head.writeUInt16LE(0x0800, 6); // UTF-8 names
	head.writeUInt16LE(0, 8); // method: store
	head.writeUInt16LE(time, 10);
	head.writeUInt16LE(day, 12);
	head.writeUInt32LE(crc, 14);
	head.writeUInt32LE(size, 18);
	head.writeUInt32LE(size, 22);
	head.writeUInt16LE(nameBytes.length, 26);
	head.writeUInt16LE(0, 28);
	return Buffer.concat([head, nameBytes]);
}

function centralHeader(
	nameBytes: Buffer,
	crc: number,
	size: number,
	time: number,
	day: number,
	offset: number,
): Buffer {
	const head = Buffer.alloc(46);
	head.writeUInt32LE(0x02014b50, 0);
	head.writeUInt16LE(20, 4); // version made by
	head.writeUInt16LE(20, 6); // version needed
	head.writeUInt16LE(0x0800, 8); // UTF-8 names
	head.writeUInt16LE(0, 10); // method: store
	head.writeUInt16LE(time, 12);
	head.writeUInt16LE(day, 14);
	head.writeUInt32LE(crc, 16);
	head.writeUInt32LE(size, 20);
	head.writeUInt32LE(size, 24);
	head.writeUInt16LE(nameBytes.length, 28);
	head.writeUInt16LE(0, 30); // extra length
	head.writeUInt16LE(0, 32); // comment length
	head.writeUInt16LE(0, 34); // disk number
	head.writeUInt16LE(0, 36); // internal attrs
	head.writeUInt32LE(0, 38); // external attrs
	head.writeUInt32LE(offset, 42);
	return Buffer.concat([head, nameBytes]);
}

function endOfCentralDirectory(
	count: number,
	size: number,
	offset: number,
): Buffer {
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(0, 4);
	end.writeUInt16LE(0, 6);
	end.writeUInt16LE(count, 8);
	end.writeUInt16LE(count, 10);
	end.writeUInt32LE(size, 12);
	end.writeUInt32LE(offset, 16);
	end.writeUInt16LE(0, 20);
	return end;
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.redirect(new URL("/signin", request.url));
	}

	const moduleData = await prisma.module
		.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				resources: {
					select: {
						id: true,
						fileUrl: true,
						fileName: true,
						folderPath: true,
						fileSizeBytes: true,
						createdAt: true,
					},
					orderBy: [{ folderPath: "asc" }, { title: "asc" }],
				},
			},
		})
		.catch(() => null);

	if (!moduleData) {
		return NextResponse.json({ error: "الموديل غير موجود." }, { status: 404 });
	}
	if (moduleData.resources.length === 0) {
		return NextResponse.json(
			{ error: "لا توجد ملفات في هذا الموديل." },
			{ status: 404 },
		);
	}

	const total = moduleData.resources.reduce(
		(sum, item) => sum + (item.fileSizeBytes || 0),
		0,
	);
	if (total > MAX_TOTAL_BYTES) {
		return NextResponse.json(
			{
				error:
					"حجم ملفات الموديل أكبر من 500 م.ب — حمّل المجلدات أو الملفات واحداً واحداً.",
			},
			{ status: 413 },
		);
	}

	const files = moduleData.resources;
	const userId = session.user.id;
	const pathname = new URL(request.url).pathname;

	// عدّادات التحميل بعد إرسال الرد
	after(async () => {
		await Promise.allSettled([
			prisma.lectureResource.updateMany({
				where: { id: { in: files.map((f) => f.id) } },
				data: { downloadsCount: { increment: 1 } },
			}),
			prisma.userActivity.create({
				data: {
					userId,
					action: "download",
					path: pathname,
					label: `أرشيف ${moduleData.name} (${files.length} ملف)`,
				},
			}),
		]);
	});

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				const central: Buffer[] = [];
				const used = new Set<string>();
				let offset = 0;
				let count = 0;

				for (const file of files) {
					let entryName = safeEntryName(file.folderPath || "", file.fileName);
					if (used.has(entryName)) {
						const dot = entryName.lastIndexOf(".");
						const base = dot > 0 ? entryName.slice(0, dot) : entryName;
						const ext = dot > 0 ? entryName.slice(dot) : "";
						let n = 2;
						while (used.has(`${base} (${n})${ext}`)) n += 1;
						entryName = `${base} (${n})${ext}`;
					}
					used.add(entryName);

					const source = await getLectureDownloadUrl(
						file.fileUrl,
						file.fileName,
					);
					const response = await fetch(source, { cache: "no-store" });
					if (!response.ok) continue;

					const data = Buffer.from(await response.arrayBuffer());
					const crc = crc32(data);
					const { time, day } = dosDateTime(new Date(file.createdAt));
					const nameBytes = Buffer.from(entryName, "utf8");
					const head = localHeader(nameBytes, crc, data.length, time, day);

					controller.enqueue(head);
					controller.enqueue(data);
					central.push(
						centralHeader(nameBytes, crc, data.length, time, day, offset),
					);
					offset += head.length + data.length;
					count += 1;
				}

				const directory = Buffer.concat(central);
				controller.enqueue(directory);
				controller.enqueue(
					endOfCentralDirectory(count, directory.length, offset),
				);
				controller.close();
			} catch (error) {
				controller.error(error);
			}
		},
	});

	const zipName = `${moduleData.name.replace(/[\\/:*?"<>|]/g, "-").trim() || "lectures"}.zip`;

	return new Response(stream, {
		headers: {
			"Content-Type": "application/zip",
			"Content-Disposition": attachmentDisposition(zipName),
			"Cache-Control": "no-store",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
