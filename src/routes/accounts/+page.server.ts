import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { isIconKey } from '$lib/icon-keys';
import { db } from '$lib/server/db';
import { accountBalances } from '$lib/server/finance/stats';
import { parseAmount } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	id: z
		.string()
		.max(40)
		.optional()
		.transform((v) => v || undefined),
	name: z
		.string()
		.trim()
		.min(1, 'Название не может быть пустым')
		.max(40, 'Название — до 40 символов'),
	icon: z.string().refine(isIconKey, 'Выбери иконку'),
	type: z.enum(['CARD', 'CASH', 'SAVINGS', 'OTHER']),
	openingBalance: z.string().max(20).optional(),
	isDefault: z.literal('on').optional()
});

/** Стартовый остаток может быть отрицательным (кредитка), поэтому знак разбираем отдельно. */
function parseBalance(raw: string | undefined): number | null {
	const s = (raw ?? '').trim();
	if (!s || s === '0') return 0;
	const negative = /^[-−]/.test(s);
	const value = parseAmount(s.replace(/^[-−]/, ''));
	return value === null ? null : negative ? -value : value;
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const [accounts, balances, counts] = await Promise.all([
		db.account.findMany({
			where: { userId },
			orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
		}),
		accountBalances(db, userId),
		db.transaction.groupBy({ by: ['accountId'], where: { userId }, _count: { _all: true } })
	]);
	const countOf = new Map(counts.map((c) => [c.accountId, c._count._all]));

	const rows = accounts.map((a) => ({
		id: a.id,
		name: a.name,
		icon: a.icon,
		type: a.type,
		openingBalance: a.openingBalance,
		isDefault: a.isDefault,
		archived: a.archived,
		balance: balances.get(a.id) ?? 0,
		txCount: countOf.get(a.id) ?? 0
	}));

	return {
		accounts: rows,
		total: rows.filter((a) => !a.archived).reduce((s, a) => s + a.balance, 0)
	};
};

async function owned(userId: string, form: FormData) {
	const id = String(form.get('id') ?? '');
	return id ? db.account.findFirst({ where: { id, userId } }) : null;
}

/** Ровно один основной счёт среди активных: если основного нет — назначаем первый. */
async function ensureDefault(userId: string) {
	const active = await db.account.findMany({
		where: { userId, archived: false },
		orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }]
	});
	if (active.length && !active[0].isDefault) {
		await db.account.update({ where: { id: active[0].id }, data: { isDefault: true } });
	}
}

async function makeDefault(userId: string, id: string) {
	await db.$transaction([
		db.account.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } }),
		db.account.update({ where: { id }, data: { isDefault: true } })
	]);
}

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success)
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Проверь поля' });
		const f = parsed.data;

		const openingBalance = parseBalance(f.openingBalance);
		if (openingBalance === null)
			return fail(400, { message: 'Начальный остаток — число, например 1500 или -200' });

		const data = { name: f.name, icon: f.icon, type: f.type, openingBalance };
		let id = f.id;
		if (id) {
			const { count } = await db.account.updateMany({ where: { id, userId }, data });
			if (!count) return fail(404, { message: 'Счёт не найден' });
		} else {
			const last = await db.account.aggregate({ where: { userId }, _max: { sortOrder: true } });
			id = (
				await db.account.create({
					data: { ...data, userId, sortOrder: (last._max.sortOrder ?? -1) + 1 }
				})
			).id;
		}

		if (f.isDefault) await makeDefault(userId, id);
		await ensureDefault(userId);
		return { ok: true };
	},

	setDefault: async ({ request, locals }) => {
		const a = await owned(locals.user!.id, await request.formData());
		if (!a || a.archived) return fail(404, { message: 'Счёт не найден' });
		await makeDefault(a.userId, a.id);
		return { ok: true };
	},

	archive: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const a = await owned(userId, await request.formData());
		if (!a) return fail(404, { message: 'Счёт не найден' });
		if ((await db.account.count({ where: { userId, archived: false } })) <= 1) {
			return fail(400, { message: 'Нужен хотя бы один активный счёт' });
		}
		await db.account.update({ where: { id: a.id }, data: { archived: true, isDefault: false } });
		await ensureDefault(userId);
		return { ok: true };
	},

	restore: async ({ request, locals }) => {
		const a = await owned(locals.user!.id, await request.formData());
		if (!a) return fail(404, { message: 'Счёт не найден' });
		await db.account.update({ where: { id: a.id }, data: { archived: false } });
		return { ok: true };
	},

	delete: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const a = await owned(userId, await request.formData());
		if (!a) return fail(404, { message: 'Счёт не найден' });
		const used = await db.transaction.count({
			where: { OR: [{ accountId: a.id }, { toAccountId: a.id }] }
		});
		if (used)
			return fail(400, { message: 'По счёту есть операции — его можно только архивировать' });
		await db.account.delete({ where: { id: a.id } });
		await ensureDefault(userId);
		return { ok: true };
	}
};
