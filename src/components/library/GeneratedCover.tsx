// غلاف مولَّد — لا خانة فارغة في المكتبة أبدًا.
// SVG خالص: لا طلب شبكة، لا صورة، يعمل في مكوّن سيرفر، ولا يزيد وزن الصفحة.
// اللون مشتق من المفتاح: ثابت لكل كتاب، ومختلف بين الكتب -> شبكة متناغمة.

type Props = {
	title: string;
	author?: string;
	year?: number;
	/** canonicalKey أو slug — أي نص ثابت لهذا الكتاب */
	seed: string;
	className?: string;
};

/** لوحة هادئة تنسجم مع الوضع الليلي وذهب الموقع */
const PALETTE = [
	"#1f2a44",
	"#243b36",
	"#3a2a3f",
	"#2b3348",
	"#3d2f26",
	"#1e3a3a",
	"#33283c",
	"#2c3a2a",
	"#402c2c",
	"#26334a",
];

const GOLD = "#c9a227";

function hash(s: string): number {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
	return Math.abs(h);
}

/** تقسيم العنوان إلى أسطر دون قطع الكلمات */
function wrap(text: string, perLine: number, maxLines: number): string[] {
	const words = text.trim().split(/\s+/);
	const lines: string[] = [];
	let cur = "";

	for (const w of words) {
		const next = cur ? `${cur} ${w}` : w;
		if (next.length > perLine && cur) {
			lines.push(cur);
			cur = w;
			if (lines.length === maxLines) break;
		} else {
			cur = next;
		}
	}
	if (lines.length < maxLines && cur) lines.push(cur);

	if (lines.length === maxLines) {
		const last = lines[maxLines - 1];
		if (last.length > perLine - 1) lines[maxLines - 1] = `${last.slice(0, perLine - 1)}…`;
	}
	return lines;
}

export function GeneratedCover({ title, author, year, seed, className }: Props) {
	const h = hash(seed);
	const bg = PALETTE[h % PALETTE.length];
	const lines = wrap(title, 18, 5);

	// نسبة الكتاب المعتادة 2:3
	const W = 300;
	const H = 450;
	const startY = H / 2 - (lines.length - 1) * 15 - 10;

	return (
		<svg
			viewBox={`0 0 ${W} ${H}`}
			className={className}
			role="img"
			aria-label={title}
			preserveAspectRatio="xMidYMid slice"
		>
			<rect width={W} height={H} fill={bg} />

			{/* كعب الكتاب */}
			<rect x={0} y={0} width={10} height={H} fill="rgba(0,0,0,0.28)" />

			{/* إطار ذهبي — هوية الموقع */}
			<rect
				x={22}
				y={22}
				width={W - 44}
				height={H - 44}
				fill="none"
				stroke={GOLD}
				strokeOpacity={0.55}
				strokeWidth={1}
			/>

			{/* فاصل أعلى */}
			<line x1={W / 2 - 26} y1={startY - 34} x2={W / 2 + 26} y2={startY - 34} stroke={GOLD} strokeOpacity={0.7} strokeWidth={1} />

			{/* العنوان */}
			<text
				textAnchor="middle"
				fill="#f4f1ea"
				fontFamily="Amiri, 'STIX Two Text', Georgia, serif"
				fontSize={19}
			>
				{lines.map((l, i) => (
					<tspan key={i} x={W / 2} y={startY + i * 30}>
						{l}
					</tspan>
				))}
			</text>

			{/* فاصل أسفل */}
			<line
				x1={W / 2 - 26}
				y1={startY + lines.length * 30 + 6}
				x2={W / 2 + 26}
				y2={startY + lines.length * 30 + 6}
				stroke={GOLD}
				strokeOpacity={0.7}
				strokeWidth={1}
			/>

			{author ? (
				<text
					x={W / 2}
					y={H - 62}
					textAnchor="middle"
					fill="rgba(244,241,234,0.72)"
					fontFamily="Amiri, Georgia, serif"
					fontSize={13}
				>
					{author.length > 30 ? `${author.slice(0, 29)}…` : author}
				</text>
			) : null}

			{year ? (
				<text
					x={W / 2}
					y={H - 40}
					textAnchor="middle"
					fill={GOLD}
					fontFamily="'STIX Two Text', Georgia, serif"
					fontSize={12}
					letterSpacing={1.5}
				>
					{year}
				</text>
			) : null}
		</svg>
	);
}

export default GeneratedCover;
