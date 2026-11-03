import type { PrismaClient } from '../prisma/client.ts';
import type { CategoryKind } from '../prisma/enums.ts';

export type Range = { start: Date; end: Date };

const inRange = (r: Range) => ({ gte: r.start, lt: r.end });

/** Сумма доходов и расходов за период (переводы между счетами не считаются). */
export async function totalsByType(
	db: PrismaClient,
	userId: string,
	range: Range
): Promise<{ income: number; expense: number }> {
	const rows = await db.transaction.groupBy({
		by: ['type'],
		where: { userId, occurredAt: inRange(range), type: { in: ['INCOME', 'EXPENSE'] } },
		_sum: { amount: true }
	});
	const get = (t: string) => rows.find((r) => r.type === t)?._sum.amount ?? 0;
	return { income: get('INCOME'), expense: get('EXPENSE') };
}

/** categoryId → сумма за период. Ключ null — операции без категории. */
export async function totalsByCategory(
	db: PrismaClient,
	userId: string,
	range: Range,
	kind: CategoryKind
): Promise<Map<string | null, number>> {
	const rows = await db.transaction.groupBy({
		by: ['categoryId'],
		where: { userId, type: kind, occurredAt: inRange(range) },
		_sum: { amount: true }
	});
	return new Map(rows.map((r) => [r.categoryId, r._sum.amount ?? 0]));
}

/** «2026-11» → { income, expense } по месяцам в часовом поясе пользователя. */
export async function totalsByMonth(
	db: PrismaClient,
	userId: string,
	tz: string,
	range: Range
): Promise<Map<string, { income: number; expense: number }>> {
	const rows = await db.$queryRaw<{ month: string; type: string; total: number }[]>`
		SELECT to_char("occurredAt" AT TIME ZONE ${tz}, 'YYYY-MM') AS month,
		       "type"::text AS type,
		       SUM("amount")::float8 AS total
		FROM "Transaction"
		WHERE "userId" = ${userId}
		  AND "occurredAt" >= ${range.start} AND "occurredAt" < ${range.end}
		  AND "type" <> 'TRANSFER'
		GROUP BY 1, 2`;

	const out = new Map<string, { income: number; expense: number }>();
	for (const r of rows) {
		const cell = out.get(r.month) ?? { income: 0, expense: 0 };
		if (r.type === 'INCOME') cell.income = Number(r.total);
		else cell.expense = Number(r.total);
		out.set(r.month, cell);
	}
	return out;
}

/** Сводная таблица «категория × месяц»: `${categoryId}|${month}` → сумма. */
export async function totalsByCategoryMonth(
	db: PrismaClient,
	userId: string,
	tz: string,
	range: Range,
	kind: CategoryKind
): Promise<{ categoryId: string | null; month: string; total: number }[]> {
	const rows = await db.$queryRaw<{ categoryId: string | null; month: string; total: number }[]>`
		SELECT "categoryId",
		       to_char("occurredAt" AT TIME ZONE ${tz}, 'YYYY-MM') AS month,
		       SUM("amount")::float8 AS total
		FROM "Transaction"
		WHERE "userId" = ${userId}
		  AND "occurredAt" >= ${range.start} AND "occurredAt" < ${range.end}
		  AND "type" = CAST(${kind} AS "TxType")
		GROUP BY 1, 2`;
	return rows.map((r) => ({ ...r, total: Number(r.total) }));
}

/** День месяца (1…31) → сумма расходов. */
export async function expenseByDay(
	db: PrismaClient,
	userId: string,
	tz: string,
	range: Range
): Promise<Map<number, number>> {
	const rows = await db.$queryRaw<{ day: number; total: number }[]>`
		SELECT EXTRACT(DAY FROM "occurredAt" AT TIME ZONE ${tz})::int AS day,
		       SUM("amount")::float8 AS total
		FROM "Transaction"
		WHERE "userId" = ${userId}
		  AND "occurredAt" >= ${range.start} AND "occurredAt" < ${range.end}
		  AND "type" = 'EXPENSE'
		GROUP BY 1`;
	return new Map(rows.map((r) => [Number(r.day), Number(r.total)]));
}

/** Текущий остаток каждого счёта: стартовый + доходы − расходы ± переводы. */
export async function accountBalances(
	db: PrismaClient,
	userId: string
): Promise<Map<string, number>> {
	const [accounts, flows, incoming] = await Promise.all([
		db.account.findMany({ where: { userId }, select: { id: true, openingBalance: true } }),
		db.transaction.groupBy({
			by: ['accountId', 'type'],
			where: { userId },
			_sum: { amount: true }
		}),
		db.transaction.groupBy({
			by: ['toAccountId'],
			where: { userId, type: 'TRANSFER' },
			_sum: { amount: true }
		})
	]);

	const balance = new Map(accounts.map((a) => [a.id, a.openingBalance]));
	for (const f of flows) {
		const sum = f._sum.amount ?? 0;
		const delta = f.type === 'INCOME' ? sum : -sum; // расход и исходящий перевод уменьшают остаток
		balance.set(f.accountId, (balance.get(f.accountId) ?? 0) + delta);
	}
	for (const t of incoming) {
		if (!t.toAccountId) continue;
		balance.set(t.toAccountId, (balance.get(t.toAccountId) ?? 0) + (t._sum.amount ?? 0));
	}
	return balance;
}
