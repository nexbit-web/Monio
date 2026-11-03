import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { isIconKey } from '$lib/icon-keys';
import { db } from '$lib/server/db';
import { normalize } from '$lib/server/finance/categorize';
import { totalsByCategory } from '$lib/server/finance/stats';
import { Prisma } from '$lib/server/prisma/client';
import { parseAmount } from '$lib/money';
import { currentMonthKey, monthRange } from '$lib/date';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	id: z
		.string()
		.max(40)
		.optional()
		.transform((v) => v || undefined),
	kind: z.enum(['EXPENSE', 'INCOME']),
	name: z
		.string()
		.trim()
		.min(1, 'Название не может быть пустым')
		.max(40, 'Название — до 40 символов'),
	icon: z.string().refine(isIconKey, 'Выбери иконку'),
	keywords: z.string().max(3000).optional(),
	monthlyBudget: z.string().max(20).optional()
});

/** «АТБ, сильпо\nновус» → ['атб', 'сильпо', 'новус'] — без повторов и пустых. */
function parseKeywords(raw: string | undefined): string[] {
	if (!raw) return [];
	const words = raw
		.split(/[,;\n]+/)
		.map((w) => normalize(w).trim().replace(/\s+/g, ' '))
		.filter((w) => w.length >= 2 && w.length <= 30);
	return [...new Set(words)].slice(0, 100);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!;
	const kind = url.searchParams.get('kind') === 'income' ? 'INCOME' : 'EXPENSE';
	const range = monthRange(currentMonthKey(user.timezone), user.timezone);

	const [categories, counts, spent, perKind] = await Promise.all([
		db.category.findMany({
			where: { userId: user.id, kind },
			orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
		}),
		db.transaction.groupBy({
			by: ['categoryId'],
			where: { userId: user.id },
			_count: { _all: true }
		}),
		totalsByCategory(db, user.id, range, kind),
		// для подписей на вкладках «Расходы / Доходы»
		db.category.groupBy({
			by: ['kind'],
			where: { userId: user.id, archived: false },
			_count: { _all: true }
		})
	]);
	const countOf = new Map(counts.map((c) => [c.categoryId, c._count._all]));
	const kindCount = (k: string) => perKind.find((p) => p.kind === k)?._count._all ?? 0;

	return {
		kind,
		kindCounts: { expense: kindCount('EXPENSE'), income: kindCount('INCOME') },
		categories: categories.map((c) => ({
			id: c.id,
			kind: c.kind,
			name: c.name,
			icon: c.icon,
			keywords: c.keywords,
			monthlyBudget: c.monthlyBudget,
			archived: c.archived,
			txCount: countOf.get(c.id) ?? 0,
			spentThisMonth: spent.get(c.id) ?? 0
		}))
	};
};

async function owned(userId: string, form: FormData) {
	const id = String(form.get('id') ?? '');
	return id ? db.category.findFirst({ where: { id, userId } }) : null;
}

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success)
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Проверь поля' });
		const f = parsed.data;

		let monthlyBudget: number | null = null;
		if (f.kind === 'EXPENSE' && f.monthlyBudget?.trim()) {
			monthlyBudget = parseAmount(f.monthlyBudget);
			if (monthlyBudget === null)
				return fail(400, { message: 'Лимит — число больше нуля или пусто' });
		}

		const data = { name: f.name, icon: f.icon, keywords: parseKeywords(f.keywords), monthlyBudget };

		try {
			if (f.id) {
				// kind не меняем: у категории уже могут быть операции нужного типа
				const { count } = await db.category.updateMany({ where: { id: f.id, userId }, data });
				if (!count) return fail(404, { message: 'Категория не найдена' });
			} else {
				const last = await db.category.aggregate({
					where: { userId, kind: f.kind },
					_max: { sortOrder: true }
				});
				await db.category.create({
					data: { ...data, userId, kind: f.kind, sortOrder: (last._max.sortOrder ?? -1) + 1 }
				});
			}
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
				return fail(400, { message: 'Категория с таким названием уже есть' });
			}
			throw e;
		}
		return { ok: true };
	},

	archive: async ({ request, locals }) => {
		const c = await owned(locals.user!.id, await request.formData());
		if (!c) return fail(404, { message: 'Категория не найдена' });
		await db.category.update({ where: { id: c.id }, data: { archived: true } });
		return { ok: true };
	},

	restore: async ({ request, locals }) => {
		const c = await owned(locals.user!.id, await request.formData());
		if (!c) return fail(404, { message: 'Категория не найдена' });
		await db.category.update({ where: { id: c.id }, data: { archived: false } });
		return { ok: true };
	},

	/** Удалить можно только пустую категорию — иначе потерялась бы история. */
	delete: async ({ request, locals }) => {
		const c = await owned(locals.user!.id, await request.formData());
		if (!c) return fail(404, { message: 'Категория не найдена' });
		if (await db.transaction.count({ where: { categoryId: c.id } })) {
			return fail(400, { message: 'В категории есть операции — её можно только архивировать' });
		}
		await db.category.delete({ where: { id: c.id } });
		return { ok: true };
	}
};
