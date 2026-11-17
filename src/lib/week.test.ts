import { describe, expect, it } from 'vitest';
import {
	HISTORY_WEEKS,
	isWeekKey,
	summarizeWeek,
	weekKeyOf,
	weekRange,
	weekWindow,
	type WeekTx
} from './week.ts';

const TZ = 'Europe/Kyiv';
const uah = (n: number) => n * 100;

const groceries = { id: 'g', name: 'Продукты', icon: 'groceries' };
const cafe = { id: 'c', name: 'Кафе', icon: 'cafe' };
const salary = { id: 's', name: 'Зарплата', icon: 'salary' };

const tx = (iso: string, amount: number, over: Partial<WeekTx> = {}): WeekTx => ({
	type: 'EXPENSE',
	amount: uah(amount),
	occurredAt: new Date(iso),
	note: null,
	category: groceries,
	toAccount: null,
	...over
});

describe('неделя — с понедельника по воскресенье по Киеву', () => {
	it.each([
		['2026-11-17T12:00:00Z', '2026-11-16'], // вторник
		['2026-11-22T19:00:00Z', '2026-11-16'], // воскресенье, 21:00
		['2026-11-15T22:30:00Z', '2026-11-16'], // понедельник, 00:30 по Киеву
		['2026-11-15T21:30:00Z', '2026-11-09'] // воскресенье, 23:30 по Киеву
	])('%s → %s', (iso, key) => expect(weekKeyOf(new Date(iso), TZ)).toBe(key));

	it('ключ — только понедельник', () => {
		expect(isWeekKey('2026-11-16')).toBe(true);
		expect(isWeekKey('2026-11-17')).toBe(false);
		expect(isWeekKey('2026-02-30')).toBe(false);
		expect(isWeekKey('x')).toBe(false);
	});

	it('границы недели и окно загрузки', () => {
		expect(weekRange('2026-11-16', TZ)).toEqual({
			start: new Date('2026-11-15T22:00:00Z'),
			end: new Date('2026-11-22T22:00:00Z')
		});
		// 8 недель назад — 21 сентября, ещё летнее время (UTC+3)
		expect(HISTORY_WEEKS).toBe(8);
		expect(weekWindow('2026-11-16', TZ)).toEqual({
			start: new Date('2026-09-20T21:00:00Z'),
			end: new Date('2026-11-22T22:00:00Z')
		});
	});
});

describe('итоги недели', () => {
	/** воскресенье 22 ноября, 21:00 по Киеву — когда приходит отчёт */
	const SUNDAY = new Date('2026-11-22T19:00:00Z');
	const FIRST = new Date('2026-10-01T09:00:00Z');

	const history: WeekTx[] = [];
	// каждая прошлая неделя с 5 октября: продукты 1 000 и кафе 400
	for (let i = 1; i <= 7; i++) {
		const monday = new Date(Date.parse('2026-11-16T10:00:00Z') - i * 7 * 86_400_000);
		history.push(tx(monday.toISOString(), 1_000));
		history.push(
			tx(new Date(monday.getTime() + 86_400_000).toISOString(), 400, { category: cafe })
		);
	}

	const week: WeekTx[] = [
		tx('2026-11-16T08:00:00Z', 20_000, { type: 'INCOME', category: salary }),
		tx('2026-11-17T10:00:00Z', 1_500, { note: 'атб' }),
		tx('2026-11-18T10:00:00Z', 300, { category: cafe }),
		tx('2026-11-21T10:00:00Z', 2_000, { category: null, note: 'куртка' }),
		tx('2026-11-21T12:00:00Z', 500, { category: cafe }),
		tx('2026-11-20T10:00:00Z', 5_000, {
			type: 'TRANSFER',
			category: null,
			toAccount: { type: 'SAVINGS' }
		})
	];

	const s = summarizeWeek([...history, ...week], '2026-11-16', TZ, SUNDAY, FIRST);

	it('доходы, расходы, остаток; переводы — не расход, а в копилку', () => {
		expect(s.elapsed).toBe(7);
		expect(s.income).toBe(uah(20_000));
		expect(s.expense).toBe(uah(4_300));
		expect(s.net).toBe(uah(15_700));
		expect(s.rate).toBe(79);
		expect(s.toSavings).toBe(uah(5_000));
		expect(s.count).toBe(6);
	});

	it('обычная неделя — по полным неделям учёта (с 5 октября: 6 недель)', () => {
		// неделя 28 сентября началась до учёта (1 октября — четверг) — не считается
		expect(s.usual).toEqual({ weeks: 6, income: 0, expense: uah(1_400) });
		expect(s.prev).toEqual({ income: 0, expense: uah(1_400) });
	});

	it('категории по убыванию, с долей и сравнением с обычной неделей', () => {
		expect(s.categories.map((c) => [c.name, c.amount, c.share])).toEqual([
			['Без категории', uah(2_000), 47],
			['Продукты', uah(1_500), 35],
			['Кафе', uah(800), 19]
		]);
		const g = s.categories.find((c) => c.name === 'Продукты')!;
		expect(g.usual).toBe(uah(1_000));
		expect(g.change).toBe(50);
		expect(s.uncategorized).toBe(uah(2_000));
	});

	it('еда, самые крупные траты и самый затратный день', () => {
		expect(s.food).toEqual({ groceries: uah(1_500), eatingOut: uah(800), total: uah(2_300) });
		expect(s.biggest.map((b) => [b.amount, b.note, b.day])).toEqual([
			[uah(2_000), 'куртка', '2026-11-21'],
			[uah(1_500), 'атб', '2026-11-17'],
			[uah(500), null, '2026-11-21']
		]);
		expect(s.topDay).toEqual({ day: '2026-11-21', amount: uah(2_500) });
	});

	it('неделя ещё идёт — считаем прошедшие дни', () => {
		const mid = summarizeWeek(week, '2026-11-16', TZ, new Date('2026-11-18T12:00:00Z'), FIRST);
		expect(mid.elapsed).toBe(3);
	});

	it('учёт начался на этой неделе — сравнивать не с чем', () => {
		const fresh = summarizeWeek(week, '2026-11-16', TZ, SUNDAY, new Date('2026-11-16T08:00:00Z'));
		expect(fresh.usual).toBeNull();
		expect(fresh.prev).toBeNull();
		expect(fresh.categories.every((c) => c.change === null)).toBe(true);
	});

	it('пустая неделя', () => {
		const empty = summarizeWeek([], '2026-11-16', TZ, SUNDAY, null);
		expect(empty).toMatchObject({ income: 0, expense: 0, rate: null, topDay: null, count: 0 });
		expect(empty.categories).toEqual([]);
	});
});
