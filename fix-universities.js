// fix-universities.js
// Usage:
//   node fix-universities.js          (dry run - no changes)
//   node fix-universities.js --apply  (write changes)

const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

// ⚠️ Change "exam" to your real model name from schema.prisma if different
const MODEL = prisma.exam

const UNIVERSITY_MAP = {
	"Annaba": "Université Badji Mokhtar - Annaba",
	"Béjaia": "Université Abderrahmane Mira - Béjaïa",
	"Biskra": "Université Mohamed Khider - Biskra",
	"Concours national d'accès au Doctorat (Algérie)": "Source inconnue",
	"El Oued": "Université Echahid Hamma Lakhdar - El Oued",
	"Laghouat": "Université Amar Telidji - Laghouat",
	"Mascara": "Université Mustapha Stambouli - Mascara",
	"Oum El Bouaghi": "Université Larbi Ben M'Hidi - Oum El Bouaghi",
	"Sétif 1": "Université Ferhat Abbas - Sétif 1",
	"Sidi Bel Abbès": "Université Djilali Liabès - Sidi Bel Abbès",
	"Skikda": "Université 20 Août 1955 - Skikda",
	"Tébessa": "Université Larbi Tébessi - Tébessa",
	"Université Abbès Laghrour de Khenchela": "Université Abbès Laghrour - Khenchela",
	"Université Abderrahmane Mira de Béjaïa": "Université Abderrahmane Mira - Béjaïa",
	"Université Aboubekr Belkaïd - Tlemcen": "Université Abou Bekr Belkaïd - Tlemcen",
	"Université Ahmed Draia d'Adrar": "Université Ahmed Draïa - Adrar",
	"Université Constantine 1": "Université Frères Mentouri - Constantine 1",
	"Université de Batna 2": "Université Batna 2 - Mostefa Ben Boulaïd",
	"Université de Saïda - Dr. Moulay Tahar": "Université Dr Moulay Tahar - Saïda",
	"Université de Sidi Bel Abbès": "Université Djilali Liabès - Sidi Bel Abbès",
	"Université Djillali Liabès - Sidi Bel Abbès": "Université Djilali Liabès - Sidi Bel Abbès",
	"Université du Relizane": "Université Ahmed Zabana de Relizane",
	"Université Echahid Hamma Lakhdar d'El Oued": "Université Echahid Hamma Lakhdar - El Oued",
	"Université M'Hamed Bougara de Boumerdès": "Université M'Hamed Bougara - Boumerdès",
	"Université Mohamed Khider de Biskra": "Université Mohamed Khider - Biskra",
	"Université Mouloud Mammeri de Tizi-Ouzou": "Université Mouloud Mammeri - Tizi Ouzou",
	"Université Oran 1": "Université Ahmed Ben Bella - Oran 1",
	"Université Yahia Farès de Médéa": "Université Yahia Farès - Médéa",
	"Unknown University": "Source inconnue",
	"USTHB": "Université des Sciences et de la Technologie Houari Boumediène (USTHB)",
	"USTHB - Université des Sciences et de la Technologie Houari Boumediene":
		"Université des Sciences et de la Technologie Houari Boumediène (USTHB)",
	"USTO": "Université des Sciences et de la Technologie d'Oran (USTO)",
	"المدرسة الوطنية العليا للرياضيات": "École Nationale Supérieure de Mathématiques (ENSM)",
}

async function main() {
	const apply = process.argv.includes("--apply")

	console.log(
		apply
			? "🚀 RUN MODE (writing changes)"
			: "🔎 DRY RUN (no changes written — add --apply to write)",
	)
	console.log("")

	let totalMatched = 0
	let totalUpdated = 0

	for (const [oldName, newName] of Object.entries(UNIVERSITY_MAP)) {
		if (oldName === newName) continue

		const count = await MODEL.count({ where: { university: oldName } })
		totalMatched += count
		if (count === 0) continue

		console.log(`"${oldName}" -> "${newName}"  (${count} exam${count > 1 ? "s" : ""})`)

		if (apply) {
			const result = await MODEL.updateMany({
				where: { university: oldName },
				data: { university: newName },
			})
			totalUpdated += result.count
		}
	}

	const remaining = await MODEL.findMany({
		select: { university: true },
		distinct: ["university"],
		orderBy: { university: "asc" },
	})

	console.log("")
	console.log(`✅ Total records matched for fixing: ${totalMatched}`)
	if (apply) console.log(`✅ Total records actually updated: ${totalUpdated}`)
	console.log(`📋 Unique universities remaining: ${remaining.length}`)
	console.log("")
	remaining.forEach((r, i) => console.log(`${i + 1}. ${r.university}`))

	await prisma.$disconnect()
}

main().catch(async (err) => {
	console.error(err)
	await prisma.$disconnect()
	process.exit(1)
})
