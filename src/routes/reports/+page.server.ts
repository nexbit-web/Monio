import { db } from '$lib/server/db';
import { totalsByCategoryMonth, totalsByMonth } from '$lib/server/finance/stats';
import { currentMonthKey, monthRange, monthsBetween, shiftMonth } from '$lib/date';
import type { CategoryKind } from '$lib/server/prisma/enums';
import type { PageServerLoad } from './$types';

const PERIODS = [3, 6, 12] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	const tz = user.timezone;
	const requested = Number(url.searchParams.get('n'));
	const n = PERIODS.find((p) => p === requested) ?? 6;

	const last = currentMonthKey(tz);
	const first = shiftMonth(last, -(n - 1));
	const months = monthsBetween(first, last);
	const range = { start: monthRange(first, tz).start, end: monthRange(last, tz).end };

	const [byMonth, expenseCells, incomeCells, categories] = await Promise.all([
		totalsByMonth(db, user.id, tz, range),
		totalsByCategoryMonth(db, user.id, tz, range, 'EXPENSE'),
		totalsByCategoryMonth(db, user.id, tz, range, 'INCOME'),
		db.category.findMany({ where: { userId: user.id } })
	]);
	const catById = new Map(categories.map((c) => [c.id, c]));

	// Среднее — по полным месяцам, в которых вообще велся учёт: текущий ещё не закончился,
	// а пустые месяцы до начала учёта занизили бы цифру. Округляем до гривны.
	const hasData = months.map((m) => {
		const t = byMonth.get(m);
		return !!t && t.income + t.expense > 0;
	});
	const counted = months.map((_, i) => i).filter((i) => hasData[i] && i < n - 1);
	const avg = (values: number[]) =>
		counted.length
			? Math.round(counted.reduce((s, i) => s + values[i], 0) / counted.length / 100) * 100
			: 0;

	const pivot = (cells: typeof expenseCells, kind: CategoryKind) => {
		const rows = new Map<string, { id: string | null; values: number[] }>();
		for (const cell of cells) {
			const key = cell.categoryId ?? 'none';
			const row = rows.get(key) ?? { id: cell.categoryId, values: months.map(() => 0) };
			const i = months.indexOf(cell.month);
			if (i >= 0) row.values[i] += cell.total;
			rows.set(key, row);
		}
		return [...rows.values()]
			.map((r) => {
				const c = r.id ? catById.get(r.id) : null;
				return {
					id: r.id,
					name: c?.name ?? 'Без категории',
					icon: c?.icon ?? null,
					kind,
					values: r.values,
					total: r.values.reduce((s, v) => s + v, 0),
					avg: avg(r.values)
				};
			})
			.sort((a, b) => b.total - a.total);
	};

	const series = months.map((m) => ({
		month: m,
		income: byMonth.get(m)?.income ?? 0,
		expense: byMonth.get(m)?.expense ?? 0
	}));

	const income = series.map((s) => s.income);
	const expense = series.map((s) => s.expense);
	const totalIncome = income.reduce((s, v) => s + v, 0);
	const totalExpense = expense.reduce((s, v) => s + v, 0);

	return {
		n,
		periods: PERIODS,
		months,
		series,
		summary: {
			countedMonths: counted.length,
			avgIncome: avg(income),
			avgExpense: avg(expense),
			totalIncome,
			totalExpense,
			savingsRate: totalIncome
				? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
				: null
		},
		expensePivot: pivot(expenseCells, 'EXPENSE'),
		incomePivot: pivot(incomeCells, 'INCOME')
	};
};
