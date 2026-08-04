// ============================================================
//  رسالة الدعم في البوت — موجَز صفحة /coffee في خمسة أسطر
//  مستقلة عن bot.ts عمدًا: ردٌّ نصّيّ لا يحتاج قاعدة البيانات ولا مولّد PDF.
// ============================================================

const TELEGRAM_HOST = "https://api.telegram.org"

/** دون فراغات: لمسةٌ واحدة تنسخ ما يحتاجه التحويل البريدي تمامًا */
const CCP = "00799999002781033371"

const PAGE_URL = "https://www.docmathdz.dev/coffee"

const SUPPORT_COMMANDS = ["/coffee", "/support", "/\u062fعم"]

/** خمسة أسطر لا أكثر — من يقرأ في تيليجرام لا يقرأ مقالًا */
export const SUPPORT_TEXT = [
	"☕ <b>عن هذا العمل</b>",
	"",
	"أنا طالبُ ماستر، بنيتُ الموقعَ والبوتَ وحدي، وهما <b>مجّانان إلى الأبد</b> — لا إعلاناتٍ ولا مقابل.",
	"عمرُهما سبعةُ أشهرٍ، وقد أُغلقا مرّةً لأنّ الاستضافةَ والنطاقَ يكلّفان نحوَ مئةِ دولار.",
	"فإن أردتَ لهما البقاءَ فساهِم بما تيسّر — ولا يتغيرُ شيءٌ إن لم تفعل.",
	"حسابٌ بريديٌّ جارٍ · CCP — المسِ الرقمَ ليُنسخ:",
	"<code>" + CCP + "</code>",
	"",
	"شكرًا لكلِّ من يستعملُ هذا البوت — ولا تنسَ قهوتَك اليوم ☕",
].join("\n")

/**
 * هل النصّ أمرُ دعم؟ يتحمل لاحقة @BotName التي يزيدها تيليجرام في المجموعات.
 */
export function isSupportCommand(text: string | undefined): boolean {
	const first = (text ?? "").trim().split(/\s+/)[0].toLowerCase()
	const bare = first.split("@")[0]
	return SUPPORT_COMMANDS.indexOf(bare) !== -1
}

export async function sendSupport(chatId: number): Promise<void> {
	const token = process.env.TELEGRAM_BOT_TOKEN
	if (!token) throw new Error("TELEGRAM_BOT_TOKEN missing")

	await fetch(TELEGRAM_HOST + "/bot" + token + "/sendMessage", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			chat_id: chatId,
			text: SUPPORT_TEXT,
			parse_mode: "HTML",
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: [
					[{ text: "☕ الصفحة الكاملة", url: PAGE_URL }],
					[{ text: "Ст ابحث عن مواضيع", callback_data: "restart" }],
				],
			},
		}),
	})
}
