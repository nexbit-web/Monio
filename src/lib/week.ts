/**
 * Итоги недели (понедельник–воскресенье в часовом поясе пользователя): сколько
 * заработал и потратил, куда ушли деньги, самые крупные траты — и сравнение
 * со «своей обычной неделей», средней за прошлые HISTORY_WEEKS полных недель.
 *
 * Чистые функции, общие для бота и CRM. Неделя — ключ её понедельника: «2026-11-16».
 */
import { isEatingOut, isGroceries, type AccountType, type CategoryRef } from './advisor.ts';
import { addDaysToKey, dayKeyOf, dayRange, zonedParts } from './date.ts';
import { percentChange } from './money.ts';

/** Сколько прошлых недель усредняем для «обычной недели». */
export const HISTORY_WEEKS = 8;

export type WeekTx = {
	type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
	amount: number;
	occurredAt: Date;
	note: string | null;
	category: { id: string; name: string; icon: string } | null;
	toAccount: { type: AccountType } | null;
};

/** Понедельник недели, в которую попал момент date. */
export function weekKeyOf(date: Date, tz: string): string {
	const weekday = zonedParts(date, tz).weekday; // 0 — воскресенье
	return addDaysToKey(dayKeyOf(date, tz), -((weekday + 6) % 7));
}

export function isWeekKey(key: string | null | undefined): key is string {
	if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
	const d = new Date(`${key}T00:00:00Z`);
	return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(key) && d.getUTCDay() === 1;
}

/** [понедельник 00:00, следующий понедельник 00:00) в UTC-моментах. */
export function weekRange(key: string, tz: string): { start: Date; end: Date } {
	return { start: dayRange(key, tz).start, end: dayRange(addDaysToKey(key, 7), tz).start };
}

/** Что загрузить для итогов недели: HISTORY_WEEKS недель до неё и саму неделю. */
export function weekWindow(key: string, tz: string): { start: Date; end: Date } {
	return {
		start: dayRange(addDaysToKey(key, -7 * HISTORY_WEEKS), tz).start,
		end: weekRange(key, tz).end
	};
}

export type WeekCategory = CategoryRef & {
	amount: number;
	/** доля от расходов недели, % */
	share: number;
	/** в обычную неделю; null — истории мало */
	usual: number | null;
	/** к обычной неделе, %; null — сравнивать не с чем */
	change: number | null;
};

export type WeekSummary = {
	key: string;
	/** дней недели уже прошло, включая сегодня: 7 — неделя целиком */
	elapsed: number;
	income: number;
	expense: number;
	net: number;
	/** доля дохода, что осталась; null — доходов не было */
	rate: number | null;
	/** переведено на счета «Накопления» */
	toSavings: number;
	/** записей за неделю */
	count: number;
	categories: WeekCategory[];
	food: { groceries: number; eatingOut: number; total: number };
	biggest: (CategoryRef & { amount: number; note: string | null; day: string })[];
	/** самый затратный день — если траты были хотя бы в два дня */
	topDay: { day: string; amount: number } | null;
	/** обычная неделя: среднее за прошлые полные недели учёта */
	usual: { weeks: number; income: number; expense: number } | null;
	/** прошлая неделя, если она учтена целиком */
	prev: { income: number; expense: number } | null;
	uncategorized: number;
};

const ref = (c: WeekTx['category']): CategoryRef =>
	c ? { id: c.id, name: c.name, icon: c.icon } : { id: null, name: 'Без категории', icon: null };

/**
 * txs — операции за weekWindow(key). firstTxAt — начало учёта: неделя считается
 * в «обычную», только если учёт к её вторнику уже шёл.
 */
export function summarizeWeek(
	txs: WeekTx[],
	key: string,
	tz: string,
	now: Date,
	firstTxAt: Date | null
): WeekSummary {
	const range = weekRange(key, tz);
	const nowKey = dayKeyOf(now, tz);
	const elapsed =
		now >= range.end
			? 7
			: Math.max(
					1,
					Math.round(
						(Date.parse(`${nowKey}T00:00:00Z`) - Date.parse(`${key}T00:00:00Z`)) / 86_400_000
					) + 1
				);

	const inWeek = (t: WeekTx) => t.occurredAt >= range.start && t.occurredAt < range.end;
	const week = txs.filter(inWeek);

	// ── Прошлые недели ──────────────────────────────────────────────────
	const counted: string[] = [];
	for (let i = 1; i <= HISTORY_WEEKS; i++) {
		const k = addDaysToKey(key, -7 * i);
		if (firstTxAt && firstTxAt < dayRange(addDaysToKey(k, 1), tz).start) counted.push(k);
	}
	const weekOf = (t: WeekTx) => weekKeyOf(t.occurredAt, tz);
	const countedSet = new Set(counted);
	const past = new Map<string, { income: number; expense: number }>();
	const pastByCat = new Map<string | null, number>();
	for (const t of txs) {
		if (inWeek(t) || t.type === 'TRANSFER') continue;
		const k = weekOf(t);
		if (!countedSet.has(k)) continue;
		const w = past.get(k) ?? { income: 0, expense: 0 };
		if (t.type === 'INCOME') w.income += t.amount;
		else {
			w.expense += t.amount;
			const id = t.category?.id ?? null;
			pastByCat.set(id, (pastByCat.get(id) ?? 0) + t.amount);
		}
		past.set(k, w);
	}
	const n = counted.length;
	const sumPast = (f: 'income' | 'expense') => [...past.values()].reduce((s, w) => s + w[f], 0);
	const usual = n
		? {
				weeks: n,
				income: Math.round(sumPast('income') / n),
				expense: Math.round(sumPast('expense') / n)
			}
		: null;
	const prevKey = addDaysToKey(key, -7);
	const prev = countedSet.has(prevKey) ? (past.get(prevKey) ?? { income: 0, expense: 0 }) : null;

	// ── Эта неделя ──────────────────────────────────────────────────────
	let income = 0;
	let expense = 0;
	let toSavings = 0;
	const byCat = new Map<string | null, { ref: CategoryRef; amount: number }>();
	const byDay = new Map<string, number>();
	const food = { groceries: 0, eatingOut: 0, total: 0 };
	for (const t of week) {
		if (t.type === 'INCOME') income += t.amount;
		else if (t.type === 'TRANSFER') {
			if (t.toAccount?.type === 'SAVINGS') toSavings += t.amount;
		} else {
			expense += t.amount;
			const id = t.category?.id ?? null;
			const row = byCat.get(id) ?? { ref: ref(t.category), amount: 0 };
			row.amount += t.amount;
			byCat.set(id, row);
			const day = dayKeyOf(t.occurredAt, tz);
			byDay.set(day, (byDay.get(day) ?? 0) + t.amount);
			if (isGroceries(t.category)) food.groceries += t.amount;
			else if (isEatingOut(t.category)) food.eatingOut += t.amount;
		}
	}
	food.total = food.groceries + food.eatingOut;

	const categories: WeekCategory[] = [...byCat.entries()]
		.map(([id, { ref: r, amount }]) => {
			const usualCat = n >= 2 ? Math.round((pastByCat.get(id) ?? 0) / n) : null;
			return {
				...r,
				amount,
				share: expense ? Math.round((amount / expense) * 100) : 0,
				usual: usualCat,
				change: usualCat ? percentChange(amount, usualCat) : null
			};
		})
		.sort((a, b) => b.amount - a.amount);

	const biggest = week
		.filter((t) => t.type === 'EXPENSE')
		.sort((a, b) => b.amount - a.amount)
		.slice(0, 3)
		.map((t) => ({
			...ref(t.category),
			amount: t.amount,
			note: t.note,
			day: dayKeyOf(t.occurredAt, tz)
		}));

	const days = [...byDay.entries()].sort((a, b) => b[1] - a[1]);
	const topDay = days.length >= 2 ? { day: days[0][0], amount: days[0][1] } : null;

	return {
		key,
		elapsed,
		income,
		expense,
		net: income - expense,
		rate: income > 0 ? Math.round(((income - expense) / income) * 100) : null,
		toSavings,
		count: week.length,
		categories,
		food,
		biggest,
		topDay,
		usual,
		prev,
		uncategorized: byCat.get(null)?.amount ?? 0
	};
}
