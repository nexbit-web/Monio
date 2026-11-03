import { db } from '$lib/server/db';
import {
	accountBalances,
	expenseByDay,
	totalsByCategory,
	totalsByType
} from '$lib/server/finance/stats';
import {
	currentMonthKey,
	daysInMonth,
	isMonthKey,
	monthRange,
	shiftMonth,
	zonedParts
} from '$lib/date';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	const tz = user.timezone;
	const now = new Date();
	const thisMonth = currentMonthKey(tz);
	const m = url.searchParams.get('m');
	const month = isMonthKey(m) && m <= thisMonth ? m : thisMonth;
	const prevMonth = shiftMonth(month, -1);
	const isCurrent = month === thisMonth;

	const range = monthRange(month, tz);
	const prevRange = monthRange(prevMonth, tz);

	// Текущий месяц честно сравниваем с тем же отрезком прошлого: 1–3 ноября против 1–3 октября.
	const elapsed = now.getTime() - range.start.getTime();
	const prevComparable = isCurrent
		? {
				start: prevRange.start,
				end: new Date(Math.min(prevRange.start.getTime() + elapsed, prevRange.end.getTime()))
			}
		: prevRange;

	const [
		totals,
		prevTotals,
		expByCat,
		prevExpByCat,
		incByCat,
		daily,
		prevDaily,
		balances,
		categories,
		accounts,
		recent
	] = await Promise.all([
		totalsByType(db, user.id, range),
		totalsByType(db, user.id, prevComparable),
		totalsByCategory(db, user.id, range, 'EXPENSE'),
		totalsByCategory(db, user.id, prevRange, 'EXPENSE'),
		totalsByCategory(db, user.id, range, 'INCOME'),
		expenseByDay(db, user.id, tz, range),
		expenseByDay(db, user.id, tz, prevRange),
		accountBalances(db, user.id),
		db.category.findMany({ where: { userId: user.id } }),
		db.account.findMany({
			where: { userId: user.id, archived: false },
			orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
		}),
		db.transaction.findMany({
			where: { userId: user.id, occurredAt: { gte: range.start, lt: range.end } },
			include: {
				category: { select: { id: true, name: true, icon: true } },
				account: { select: { id: true, name: true, icon: true } },
				toAccount: { select: { id: true, name: true, icon: true } }
			},
			orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
			take: 7
		})
	]);

	const catById = new Map(categories.map((c) => [c.id, c]));

	const breakdown = (
		current: Map<string | null, number>,
		previous?: Map<string | null, number>
	) => {
		const ids = new Set([...current.keys()]);
		// категории с лимитом показываем, даже если в этом месяце по ним ещё не тратили
		if (previous)
			for (const c of categories)
				if (c.kind === 'EXPENSE' && c.monthlyBudget && !c.archived) ids.add(c.id);
		return [...ids]
			.map((id) => {
				const c = id ? catById.get(id) : null;
				return {
					id,
					name: c?.name ?? 'Без категории',
					icon: c?.icon ?? null,
					amount: current.get(id) ?? 0,
					prevAmount: previous?.get(id) ?? 0,
					budget: c?.monthlyBudget ?? null
				};
			})
			.sort((a, b) => b.amount - a.amount || (b.budget ?? 0) - (a.budget ?? 0));
	};

	// Нарастающий итог расходов по дням: этот месяц до сегодня, прошлый — целиком.
	const cumulative = (byDay: Map<number, number>, days: number) => {
		const out: { day: number; total: number }[] = [];
		let acc = 0;
		for (let d = 1; d <= days; d++) {
			acc += byDay.get(d) ?? 0;
			out.push({ day: d, total: acc });
		}
		return out;
	};
	const today = zonedParts(now, tz).day;

	const accountsWithBalance = accounts.map((a) => ({
		id: a.id,
		name: a.name,
		icon: a.icon,
		type: a.type,
		balance: balances.get(a.id) ?? 0
	}));

	return {
		month,
		prevMonth,
		thisMonth,
		isCurrent,
		totals,
		prevTotals,
		expenses: breakdown(expByCat, prevExpByCat),
		incomes: breakdown(incByCat),
		chart: {
			current: cumulative(daily, isCurrent ? today : daysInMonth(month)),
			previous: cumulative(prevDaily, daysInMonth(prevMonth))
		},
		accounts: accountsWithBalance,
		totalBalance: accountsWithBalance.reduce((s, a) => s + a.balance, 0),
		recent: recent.map((r) => ({
			id: r.id,
			type: r.type,
			amount: r.amount,
			occurredAt: r.occurredAt,
			note: r.note,
			source: r.source,
			category: r.category,
			account: r.account,
			toAccount: r.toAccount
		})),
		dayOfMonth: today
	};
};
