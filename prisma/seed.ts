import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/lib/server/prisma/client.ts';
import type { TemplateKey } from '../src/lib/server/prisma/enums.ts';

const adapter = new PrismaPg({
	connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL
});
const db = new PrismaClient({ adapter });

type Ex = {
	slug: string;
	name: string;
	muscleGroup: string;
	incrementKg?: number;
	isMain?: boolean;
	bodyweight?: boolean;
};

type Item = { slug: string; sets: number; repMin: number; repMax: number; note?: string };

const EXERCISES: Ex[] = [
	// Верх
	{ slug: 'bench-press', name: 'Жим лёжа', muscleGroup: 'Грудь', isMain: true },
	{ slug: 'barbell-row', name: 'Тяга штанги в наклоне', muscleGroup: 'Спина', isMain: true },
	{ slug: 'db-shoulder-press', name: 'Жим гантелей сидя', muscleGroup: 'Плечи' },
	{ slug: 'pull-up', name: 'Подтягивания / верхний блок', muscleGroup: 'Спина' },
	{ slug: 'db-fly', name: 'Разводка гантелей', muscleGroup: 'Грудь' },
	{ slug: 'hammer-curl', name: 'Молотки', muscleGroup: 'Бицепс' },
	{ slug: 'incline-db-press', name: 'Жим гантелей на наклонной', muscleGroup: 'Грудь' },
	{ slug: 'seated-row', name: 'Тяга горизонтального блока', muscleGroup: 'Спина' },
	{ slug: 'overhead-press', name: 'Жим стоя', muscleGroup: 'Плечи', isMain: true },
	{ slug: 'reverse-pulldown', name: 'Верхний блок обратным хватом', muscleGroup: 'Спина' },
	{ slug: 'lateral-raise', name: 'Махи в стороны', muscleGroup: 'Плечи' },
	{ slug: 'triceps-pushdown', name: 'Разгибания на трицепс', muscleGroup: 'Трицепс' },
	// Низ
	{ slug: 'back-squat', name: 'Присед со штангой', muscleGroup: 'Ноги', incrementKg: 5, isMain: true },
	{ slug: 'romanian-deadlift', name: 'Румынская тяга', muscleGroup: 'Задняя цепь', incrementKg: 5 },
	{ slug: 'leg-press', name: 'Жим ногами', muscleGroup: 'Ноги', incrementKg: 5 },
	{ slug: 'standing-calf', name: 'Икры стоя', muscleGroup: 'Икры' },
	{ slug: 'plank', name: 'Планка / скручивания', muscleGroup: 'Кор', bodyweight: true },
	{ slug: 'deadlift', name: 'Становая тяга', muscleGroup: 'Задняя цепь', incrementKg: 5, isMain: true },
	{ slug: 'bulgarian-split-squat', name: 'Болгарские выпады', muscleGroup: 'Ноги' },
	{ slug: 'leg-curl', name: 'Сгибания ног', muscleGroup: 'Задняя цепь' },
	{ slug: 'seated-calf', name: 'Икры сидя', muscleGroup: 'Икры' }
];

const TEMPLATES: { key: TemplateKey; name: string; sortOrder: number; items: Item[] }[] = [
	{
		key: 'UPPER_A',
		name: 'Верх A',
		sortOrder: 1,
		items: [
			{ slug: 'bench-press', sets: 3, repMin: 5, repMax: 8 },
			{ slug: 'barbell-row', sets: 3, repMin: 6, repMax: 10 },
			{ slug: 'db-shoulder-press', sets: 3, repMin: 8, repMax: 12 },
			{ slug: 'pull-up', sets: 3, repMin: 6, repMax: 12 },
			{ slug: 'db-fly', sets: 2, repMin: 12, repMax: 15 },
			{ slug: 'hammer-curl', sets: 2, repMin: 10, repMax: 12 }
		]
	},
	{
		key: 'LOWER_A',
		name: 'Низ A',
		sortOrder: 2,
		items: [
			{ slug: 'back-squat', sets: 3, repMin: 5, repMax: 8 },
			{ slug: 'romanian-deadlift', sets: 3, repMin: 8, repMax: 10 },
			{ slug: 'leg-press', sets: 2, repMin: 10, repMax: 15 },
			{ slug: 'standing-calf', sets: 3, repMin: 12, repMax: 15 },
			{ slug: 'plank', sets: 3, repMin: 30, repMax: 60, note: 'Секунды или повторы — как удобнее' }
		]
	},
	{
		key: 'UPPER_B',
		name: 'Верх B',
		sortOrder: 3,
		items: [
			{ slug: 'incline-db-press', sets: 3, repMin: 8, repMax: 12 },
			{ slug: 'seated-row', sets: 3, repMin: 8, repMax: 12 },
			{ slug: 'overhead-press', sets: 3, repMin: 6, repMax: 10 },
			{ slug: 'reverse-pulldown', sets: 3, repMin: 10, repMax: 12 },
			{ slug: 'lateral-raise', sets: 3, repMin: 12, repMax: 20 },
			{ slug: 'triceps-pushdown', sets: 2, repMin: 10, repMax: 15 }
		]
	},
	{
		key: 'LOWER_B',
		name: 'Низ B',
		sortOrder: 4,
		items: [
			{ slug: 'deadlift', sets: 3, repMin: 5, repMax: 5, note: 'Или 1×5 тяжёлый + 2×8 полегче' },
			{ slug: 'bulgarian-split-squat', sets: 3, repMin: 8, repMax: 10, note: 'На каждую ногу' },
			{ slug: 'leg-curl', sets: 3, repMin: 10, repMax: 12 },
			{ slug: 'seated-calf', sets: 3, repMin: 15, repMax: 20 }
		]
	}
];

async function main() {
	for (const ex of EXERCISES) {
		const data = {
			name: ex.name,
			muscleGroup: ex.muscleGroup,
			incrementKg: ex.incrementKg ?? 2.5,
			isMain: ex.isMain ?? false,
			bodyweight: ex.bodyweight ?? false
		};
		await db.exercise.upsert({
			where: { slug: ex.slug },
			create: { slug: ex.slug, ...data },
			update: data
		});
	}

	for (const tpl of TEMPLATES) {
		await db.dayTemplate.upsert({
			where: { key: tpl.key },
			create: { key: tpl.key, name: tpl.name, sortOrder: tpl.sortOrder },
			update: { name: tpl.name, sortOrder: tpl.sortOrder }
		});

		for (const [i, item] of tpl.items.entries()) {
			const exercise = await db.exercise.findUniqueOrThrow({ where: { slug: item.slug } });
			const data = {
				sortOrder: i,
				sets: item.sets,
				repMin: item.repMin,
				repMax: item.repMax,
				note: item.note ?? null
			};
			await db.templateExercise.upsert({
				where: { templateKey_exerciseId: { templateKey: tpl.key, exerciseId: exercise.id } },
				create: { templateKey: tpl.key, exerciseId: exercise.id, ...data },
				update: data
			});
		}
	}

	console.log(`Готово: ${EXERCISES.length} упражнений, ${TEMPLATES.length} шаблонов дня.`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
