import { describe, expect, it } from 'vitest';
import {
	analyze,
	fromUsd,
	toUsd,
	toUsdUp,
	type AdvisorCategory,
	type AdvisorInput,
	type MonthCell
} from './advisor.ts';

/** 17 ноября 2026, 14:00 по Киеву: 17-й день из 30. */
const NOW = new Date('2026-11-17T12:00:00Z');
const TZ = 'Europe/Kyiv';
const uah = (n: number) => n * 100;
/** курс 40 ₴ за $1: цель $100 = 4 000 ₴ */
const RATES = { current: 40, date: '2026-11-17', monthEnd: {} };

const cat = (
	id: string,
	icon: string,
	kind: 'EXPENSE' | 'INCOME' = 'EXPENSE'
): AdvisorCategory => ({
	id,
	kind,
	name: id,
	icon
});

const CATS: AdvisorCategory[] = [
	cat('Зарплата', 'salary', 'INCOME'),
	cat('Жильё', 'home'),
	cat('Продукты', 'groceries'),
	cat('Кафе', 'cafe'),
	cat('Развлечения', 'fun'),
	cat('Одежда', 'clothes')
];

const cell = (
	month: string,
	categoryId: string,
	total: number,
	type: 'EXPENSE' | 'INCOME' = 'EXPENSE'
): MonthCell => ({
	month,
	type,
	categoryId,
	total: uah(total)
});

/** Один и тот же месяц: доход 40 000, расходы 31 000. */
function typicalMonth(month: string): MonthCell[] {
	return [
		cell(month, 'Зарплата', 40_000, 'INCOME'),
		cell(month, 'Жильё', 10_000),
		cell(month, 'Продукты', 8_000),
		cell(month, 'Кафе', 6_000),
		cell(month, 'Развлечения', 4_000),
		cell(month, 'Одежда', 3_000)
	];
}

const HISTORY = [
	...typicalMonth('2026-08'),
	...typicalMonth('2026-09'),
	...typicalMonth('2026-10')
];

function input(over: Partial<AdvisorInput> = {}): AdvisorInput {
	return {
		now: NOW,
		tz: TZ,
		cells: HISTORY,
		saved: new Map(),
		categories: CATS,
		firstTxAt: new Date('2026-07-01T09:00:00Z'),
		goalUsd: 100,
		rates: RATES,
		...over
	};
}

describe('доллары', () => {
	it('цель в гривнах — до целой гривны по курсу', () => {
		expect(fromUsd(100, 45.3918)).toBe(uah(4_539));
		expect(fromUsd(100, 40)).toBe(uah(4_000));
	});

	it('отложено — вниз, чтобы «почти» не выглядело выполненным', () => {
		expect(toUsd(uah(4_520), 45.39)).toBe(99);
		// ровно цель, округлённая до гривны, — ровно $100
		expect(toUsd(fromUsd(100, 45.3918), 45.3918)).toBe(100);
		expect(toUsd(uah(264), 45.39)).toBe(5);
	});

	it('не хватило — вверх, но не меньше $1', () => {
		expect(toUsdUp(uah(19), 45.39)).toBe(1);
		expect(toUsdUp(uah(2_700), 45)).toBe(60);
	});
});

describe('цель', () => {
	it('$100 по сегодняшнему курсу НБУ', () => {
		expect(analyze(input()).goal).toEqual({
			usd: 100,
			rate: 40,
			rateDate: '2026-11-17',
			amount: uah(4_000)
		});
	});

	it('своя сумма из настроек; ноль — по умолчанию $100', () => {
		expect(analyze(input({ goalUsd: 150 })).goal.amount).toBe(uah(6_000));
		expect(analyze(input({ goalUsd: 0 })).goal.usd).toBe(100);
	});
});

describe('средний месяц и хватает ли на цель', () => {
	it('три последних полных месяца, текущий не считается', () => {
		const a = analyze(input());
		expect(a.mode).toBe('history');
		expect(a.months).toBe(3);
		expect(a.income).toBe(uah(40_000));
		expect(a.expense).toBe(uah(31_000));
		expect(a.free).toBe(uah(9_000));
	});

	it('остаётся больше цели — хватает; тратить можно до дохода минус цель', () => {
		expect(analyze(input()).plan).toEqual({ kind: 'enough', gap: 0, maxSpend: uah(36_000) });
	});

	it('остаётся меньше цели — сколько не хватает', () => {
		const cells = [...HISTORY, cell('2026-10', 'Кафе', 21_000)];
		const a = analyze(input({ cells, firstTxAt: new Date('2026-10-01T09:00:00Z') }));
		// октябрь: 40 000 − 52 000 → дефицит 12 000, до цели — 16 000
		expect(a.plan).toEqual({ kind: 'deficit', gap: uah(16_000), maxSpend: uah(36_000) });

		const b = analyze(
			input({
				cells: [...typicalMonth('2026-10'), cell('2026-10', 'Кафе', 7_000)],
				firstTxAt: new Date('2026-10-01T09:00:00Z')
			})
		);
		// свободно 2 000 из 4 000
		expect(b.plan).toEqual({ kind: 'gap', gap: uah(2_000), maxSpend: uah(36_000) });
	});

	it('без суммы по категориям — только общий итог', () => {
		const a = analyze(input()) as unknown as Record<string, unknown>;
		expect(a).not.toHaveProperty('categories');
		expect(a).not.toHaveProperty('tips');
	});

	it('месяц, в середине которого начался учёт, полным не считается', () => {
		const b = analyze(input({ firstTxAt: new Date('2026-08-10T09:00:00Z') }));
		expect(b.months).toBe(2);
		expect(b.income).toBe(uah(40_000));
	});
});

describe('этот месяц: считается только отложенное вручную', () => {
	const nov = (cells: MonthCell[], saved = 0) =>
		analyze(input({ cells: [...HISTORY, ...cells], saved: new Map([['2026-11', uah(saved)]]) }));

	it('отложено 1 000 из 4 000 — сколько ещё можно тратить', () => {
		const a = nov(
			[
				cell('2026-11', 'Зарплата', 40_000, 'INCOME'),
				cell('2026-11', 'Жильё', 10_000),
				cell('2026-11', 'Продукты', 5_000)
			],
			1_000
		);
		expect(a.month).toMatchObject({
			key: '2026-11',
			day: 17,
			days: 30,
			income: uah(40_000),
			expense: uah(15_000),
			saved: uah(1_000),
			remaining: uah(3_000),
			// на руках: 40 000 − 15 000 − 1 000 отложенных
			free: uah(24_000),
			expectedIncome: uah(40_000),
			// 40 000 − 15 000 − цель 4 000
			left: uah(21_000),
			status: 'ok'
		});
		// 21 000 на 14 дней (с сегодняшним)
		expect(a.month.perDay).toBe(uah(1_500));
		// аренда как есть + продукты 5 000 за 17 дней → на 30: 10 000 + 8 823,53
		expect(a.month.projected).toBe(uah(18_824));
	});

	it('остаток на карте — не отложено: без перевода цель не выполнена', () => {
		const a = nov([cell('2026-11', 'Зарплата', 40_000, 'INCOME')]);
		expect(a.month.saved).toBe(0);
		expect(a.month.remaining).toBe(uah(4_000));
		expect(a.month.status).toBe('ok');
	});

	it('отложил всю цель — выполнено', () => {
		expect(nov([cell('2026-11', 'Зарплата', 40_000, 'INCOME')], 4_000).month.status).toBe('done');
		expect(nov([], 5_000).month.remaining).toBe(0);
	});

	it('денег на цель уже не хватает', () => {
		const a = nov([
			cell('2026-11', 'Зарплата', 40_000, 'INCOME'),
			cell('2026-11', 'Жильё', 38_000)
		]);
		expect(a.month.status).toBe('short');
		expect(a.month.left).toBe(-uah(2_000));
		// но при нынешнем темпе 2 000 ₴ отложить реально
		expect(a.month.canSave).toBe(uah(2_000));
	});

	it('темп трат не даст отложить — предупреждает', () => {
		const a = nov([
			cell('2026-11', 'Зарплата', 40_000, 'INCOME'),
			cell('2026-11', 'Продукты', 25_000)
		]);
		expect(a.month.left).toBe(uah(11_000));
		expect(a.month.status).toBe('pace');
	});

	it('зарплаты ещё не было — рассчитываем на средний доход', () => {
		const a = nov([]);
		expect(a.month.expectedIncome).toBe(uah(40_000));
		expect(a.month.perDay).toBe(Math.floor(uah(36_000) / 14 / 100) * 100);
	});

	it('по первым дням и без доходов — честно говорит, что доходов нет', () => {
		const a = analyze(
			input({
				cells: [cell('2026-11', 'Продукты', 2_000)],
				firstTxAt: new Date('2026-11-03T08:00:00Z')
			})
		);
		expect(a.mode).toBe('estimate');
		expect(a.month.status).toBe('no-income');
		expect(a.plan.kind).toBe('no-income');
	});
});

describe('итоги прошлых месяцев', () => {
	const past = (over: Partial<AdvisorInput>) => analyze(input(over)).history;
	const october = (cells: MonthCell[], saved: number, monthEnd = {}) =>
		past({
			cells: [...typicalMonth('2026-08'), ...typicalMonth('2026-09'), ...cells],
			saved: new Map([['2026-10', uah(saved)]]),
			rates: { ...RATES, monthEnd }
		})[0];

	it('цель — по курсу на конец месяца; отложил больше — выполнено', () => {
		const h = october(typicalMonth('2026-10'), 5_000, { '2026-10': 41 });
		expect(h).toMatchObject({
			key: '2026-10',
			partial: false,
			saved: uah(5_000),
			rate: 41,
			goal: uah(4_100),
			met: true,
			reasons: []
		});
	});

	it('деньги были, но не отложены — так и говорит', () => {
		const h = october(typicalMonth('2026-10'), 1_000);
		expect(h.met).toBe(false);
		// 40 000 − 31 000 − 1 000 отложенных
		expect(h.reasons).toEqual([{ id: 'not-saved', free: uah(8_000) }]);
	});

	it('доход меньше обычного', () => {
		const cells = typicalMonth('2026-10').map((c) =>
			c.type === 'INCOME' ? { ...c, total: uah(30_000) } : c
		);
		expect(october(cells, 0).reasons).toEqual([
			{ id: 'income-down', amount: uah(10_000), usual: uah(40_000) }
		]);
	});

	it('расходы больше обычного — и какие траты выросли', () => {
		const cells = [...typicalMonth('2026-10'), cell('2026-10', 'Кафе', 8_000)];
		expect(october(cells, 0).reasons).toEqual([
			{
				id: 'expense-up',
				amount: uah(8_000),
				usual: uah(31_000),
				top: [{ id: 'Кафе', name: 'Кафе', icon: 'cafe', delta: uah(8_000) }]
			}
		]);
	});

	it('не с чем сравнить: расходы забрали почти весь доход или больше', () => {
		const first = { firstTxAt: new Date('2026-10-01T09:00:00Z') };
		const high = past({
			...first,
			cells: [cell('2026-10', 'Зарплата', 40_000, 'INCOME'), cell('2026-10', 'Жильё', 38_000)]
		})[0];
		expect(high.reasons).toEqual([{ id: 'expense-high', share: 95 }]);

		const deficit = past({
			...first,
			cells: [cell('2026-10', 'Зарплата', 40_000, 'INCOME'), cell('2026-10', 'Жильё', 45_000)]
		})[0];
		expect(deficit.reasons).toEqual([{ id: 'deficit', amount: uah(5_000) }]);

		const noIncome = past({ ...first, cells: [cell('2026-10', 'Жильё', 5_000)] })[0];
		expect(noIncome.reasons).toEqual([{ id: 'no-income' }]);
	});

	it('сначала последний месяц; до начала учёта и пустые — не показывает', () => {
		const h = past({
			cells: [...typicalMonth('2026-08'), ...typicalMonth('2026-10')],
			firstTxAt: new Date('2026-08-10T09:00:00Z')
		});
		expect(h.map((x) => x.key)).toEqual(['2026-10', '2026-08']);
		expect(h[1].partial).toBe(true);
	});
});

describe('первые дни учёта', () => {
	it('пара недель — оценка: ежедневные траты растягиваем на месяц, счета — как есть', () => {
		const cells: MonthCell[] = [
			cell('2026-11', 'Зарплата', 30_000, 'INCOME'),
			cell('2026-11', 'Жильё', 8_000),
			cell('2026-11', 'Продукты', 3_000)
		];
		// учёт с 3 ноября: 15 дней
		const a = analyze(input({ cells, firstTxAt: new Date('2026-11-03T08:00:00Z') }));
		expect(a.mode).toBe('estimate');
		expect(a.days).toBe(15);
		expect(a.income).toBe(uah(30_000));
		// 8 000 + 3 000 × 30,4 / 15
		expect(a.expense).toBe(uah(14_080));
		expect(a.history).toEqual([]);
	});

	it('без операций вообще — ничего не ломается', () => {
		const a = analyze(input({ cells: [], firstTxAt: null }));
		expect(a.mode).toBe('none');
		expect(a.plan.kind).toBe('none');
		expect(a.month.perDay).toBeNull();
		expect(a.month.status).toBe('no-income');
		expect(a.history).toEqual([]);
	});
});
