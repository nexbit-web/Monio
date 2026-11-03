/**
 * Демо-аккаунт с правдоподобными операциями за 4 месяца — чтобы посмотреть CRM на живых цифрах.
 *   npm run db:seed
 * Вход: demo@moneta.local / demo12345. Твои данные не трогает; повторный запуск пересоздаёт только демо.
 */
import 'dotenv/config';
import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';
import { createDb } from '../src/lib/server/db-client.ts';
import { initializeUser } from '../src/lib/server/finance/defaults.ts';
import {
	DEFAULT_TZ,
	currentMonthKey,
	daysInMonth,
	shiftMonth,
	zonedParts,
	zonedToUtc
} from '../src/lib/date.ts';

const DEMO_EMAIL = 'demo@moneta.local';
const DEMO_PASSWORD = 'demo12345';

const db = createDb(process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '');

const scrypt = promisify(scryptCb) as (p: string, s: Buffer, n: number) => Promise<Buffer>;
async function hashPassword(password: string) {
	const salt = randomBytes(16);
	const key = await scrypt(password.normalize('NFKC'), salt, 64);
	return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

// Детерминированный генератор: каждый запуск даёт одинаковую картину.
let state = 20261103;
const rand = () => (state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

async function main() {
	await db.user.deleteMany({ where: { email: DEMO_EMAIL } });
	const user = await db.user.create({
		data: { email: DEMO_EMAIL, name: 'Демо', passwordHash: await hashPassword(DEMO_PASSWORD) }
	});
	await initializeUser(db, user.id);

	const savings = await db.account.create({
		data: {
			userId: user.id,
			name: 'Накопления',
			icon: 'savings',
			type: 'SAVINGS',
			openingBalance: 2_000_000,
			sortOrder: 2
		}
	});
	const [card, cash] = await Promise.all([
		db.account.findFirstOrThrow({ where: { userId: user.id, type: 'CARD' } }),
		db.account.findFirstOrThrow({ where: { userId: user.id, type: 'CASH' } })
	]);
	await db.account.update({ where: { id: card.id }, data: { openingBalance: 850_000 } });
	await db.account.update({ where: { id: cash.id }, data: { openingBalance: 120_000 } });

	const cats = await db.category.findMany({ where: { userId: user.id } });
	const cat = (kind: 'EXPENSE' | 'INCOME', name: string) =>
		cats.find((c) => c.kind === kind && c.name === name)!.id;

	await db.category.update({
		where: { id: cat('EXPENSE', 'Продукты') },
		data: { monthlyBudget: 900_000 }
	});
	await db.category.update({
		where: { id: cat('EXPENSE', 'Кафе и рестораны') },
		data: { monthlyBudget: 300_000 }
	});
	await db.category.update({
		where: { id: cat('EXPENSE', 'Транспорт') },
		data: { monthlyBudget: 150_000 }
	});

	const tz = DEFAULT_TZ;
	const now = new Date();
	const thisMonth = currentMonthKey(tz);
	const today = zonedParts(now, tz).day;
	const rows: Parameters<typeof db.transaction.createMany>[0]['data'] = [];

	const add = (
		month: string,
		day: number,
		type: 'EXPENSE' | 'INCOME' | 'TRANSFER',
		categoryName: string | null,
		uah: number,
		note: string | null,
		extra: { accountId?: string; toAccountId?: string; source?: 'WEB' | 'TELEGRAM' } = {}
	) => {
		if (month === thisMonth && day > today) return;
		const [y, m] = month.split('-').map(Number);
		const at = zonedToUtc(y, m, day, between(8, 21), between(0, 59), tz);
		if (at > now) return;
		rows.push({
			userId: user.id,
			type,
			amount: uah * 100,
			occurredAt: at,
			accountId: extra.accountId ?? card.id,
			toAccountId: extra.toAccountId ?? null,
			categoryId: categoryName && type !== 'TRANSFER' ? cat(type, categoryName) : null,
			note,
			source: extra.source ?? (rand() < 0.6 ? 'TELEGRAM' : 'WEB')
		});
	};

	for (let i = 3; i >= 0; i--) {
		const month = shiftMonth(thisMonth, -i);
		const days = daysInMonth(month);

		add(month, 5, 'INCOME', 'Зарплата', 32_000, 'зарплата', { source: 'WEB' });
		add(month, 20, 'INCOME', 'Зарплата', 18_000, 'аванс', { source: 'WEB' });
		if (rand() < 0.7)
			add(month, between(8, 26), 'INCOME', 'Фриланс', between(4, 14) * 1000, 'заказ на сайт');
		add(month, 28, 'INCOME', 'Кешбэк и проценты', between(120, 380), 'кешбэк');

		add(month, 1, 'EXPENSE', 'Жильё', 14_000, 'аренда квартиры', { source: 'WEB' });
		add(month, 10, 'EXPENSE', 'Мобильная связь', 250, 'киевстар');
		add(month, 12, 'EXPENSE', 'Интернет и ТВ', 300, 'интернет');
		add(month, 15, 'EXPENSE', 'Коммунальные услуги', between(1600, 2900), 'коммуналка');
		add(month, 3, 'EXPENSE', 'Подписки', 199, 'spotify');
		add(month, 18, 'EXPENSE', 'Подписки', 299, 'netflix');
		add(month, 6, 'TRANSFER', null, 6000, 'в копилку', { toAccountId: savings.id, source: 'WEB' });
		add(month, 7, 'TRANSFER', null, 2000, 'снял наличные', { toAccountId: cash.id, source: 'WEB' });

		for (let d = 1; d <= days; d++) {
			if (rand() < 0.45)
				add(
					month,
					d,
					'EXPENSE',
					'Продукты',
					between(150, 950),
					pick(['атб', 'сильпо', 'новус', 'продукты', null])
				);
			if (rand() < 0.3)
				add(
					month,
					d,
					'EXPENSE',
					'Кафе и рестораны',
					between(70, 420),
					pick(['кофе', 'обед', 'пицца', 'суши', null])
				);
			if (rand() < 0.35)
				add(
					month,
					d,
					'EXPENSE',
					'Транспорт',
					between(80, 260),
					pick(['такси', 'bolt', 'метро', 'uklon'])
				);
			if (rand() < 0.04) add(month, d, 'EXPENSE', 'Здоровье', between(150, 1200), 'аптека');
			if (rand() < 0.05)
				add(
					month,
					d,
					'EXPENSE',
					'Развлечения',
					between(200, 900),
					pick(['кино', 'бар', 'концерт']),
					{ accountId: cash.id }
				);
			if (rand() < 0.03)
				add(
					month,
					d,
					'EXPENSE',
					'Одежда и обувь',
					between(800, 3500),
					pick(['кроссовки', 'футболка', 'куртка'])
				);
			if (rand() < 0.03)
				add(
					month,
					d,
					'EXPENSE',
					'Дом и быт',
					between(150, 1400),
					pick(['посуда', 'хозтовары', 'эпицентр'])
				);
			if (rand() < 0.02) add(month, d, 'EXPENSE', 'Подарки', between(300, 1500), 'подарок');
		}
		add(month, between(2, 25), 'EXPENSE', 'Спорт', 900, 'абонемент в зал');
		add(month, between(2, 25), 'EXPENSE', 'Красота и уход', 450, 'барбер', { accountId: cash.id });
	}

	// пара записей без категории — как будто бот не узнал слово
	add(thisMonth, Math.max(1, today - 1), 'EXPENSE', null, 135, 'чебуреки', { source: 'TELEGRAM' });

	await db.transaction.createMany({ data: rows });
	console.log(`✅ Демо: ${DEMO_EMAIL} / ${DEMO_PASSWORD} — ${rows.length} операций`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
