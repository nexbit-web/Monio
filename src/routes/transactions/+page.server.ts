import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { filtersQuery, filtersWhere, parseFilters } from '$lib/server/finance/filters';
import { deleteTransaction, saveTransaction } from '$lib/server/finance/transactions';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	const filters = parseFilters(url.searchParams, user.timezone);
	const where = filtersWhere(user.id, filters, user.timezone);
	const page = Math.max(1, Math.min(10_000, Number(url.searchParams.get('page')) || 1));

	const ref = { select: { id: true, name: true, icon: true } };
	const [rows, count, sums, allCategories, allAccounts] = await Promise.all([
		db.transaction.findMany({
			where,
			include: { category: ref, account: ref, toAccount: ref },
			orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE
		}),
		db.transaction.count({ where }),
		// суммы по всем типам сразу (без фильтра по типу) — для подписей на вкладках
		db.transaction.groupBy({
			by: ['type'],
			where: filtersWhere(user.id, { ...filters, type: null }, user.timezone),
			_sum: { amount: true },
			_count: { _all: true }
		}),
		// в фильтрах нужны и архивные — по ним тоже бывают старые операции
		db.category.findMany({
			where: { userId: user.id },
			select: { id: true, name: true, icon: true, kind: true, archived: true },
			orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }]
		}),
		db.account.findMany({
			where: { userId: user.id },
			select: { id: true, name: true, icon: true, archived: true },
			orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
		})
	]);

	const sum = (t: string) => sums.find((s) => s.type === t)?._sum.amount ?? 0;
	const countOf = (t: string) => sums.find((s) => s.type === t)?._count._all ?? 0;

	return {
		filters,
		query: filtersQuery(filters),
		rows: rows.map((r) => ({
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
		count,
		page,
		pages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
		totals: { income: sum('INCOME'), expense: sum('EXPENSE'), transfer: sum('TRANSFER') },
		counts: {
			all: countOf('INCOME') + countOf('EXPENSE') + countOf('TRANSFER'),
			income: countOf('INCOME'),
			expense: countOf('EXPENSE'),
			transfer: countOf('TRANSFER')
		},
		allCategories,
		allAccounts
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const user = locals.user!;
		const raw = Object.fromEntries(await request.formData());
		const result = await saveTransaction(db, user.id, user.timezone, raw);
		if (!result.ok) return fail(400, { message: result.message });
		return { id: result.id };
	},

	delete: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id') ?? '');
		if (!id || !(await deleteTransaction(db, locals.user!.id, id))) {
			return fail(404, { message: 'Операция не найдена' });
		}
		return { deleted: id };
	}
};
