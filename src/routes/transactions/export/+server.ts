import { db } from '$lib/server/db';
import { filtersWhere, parseFilters } from '$lib/server/finance/filters';
import { dayKeyOf, formatTime } from '$lib/date';
import type { RequestHandler } from './$types';

const TYPE_LABEL = { EXPENSE: 'Расход', INCOME: 'Доход', TRANSFER: 'Перевод' } as const;

/** Экранирование для CSV + защита от формул: Excel выполнит ячейку, начинающуюся с = + - @. */
function cell(v: string): string {
	const isNumber = /^-?\d+(,\d+)?$/.test(v);
	const safe = !isNumber && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
	return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV под Excel: разделитель «;», запятая в дробях, BOM — чтобы кириллица открылась без кракозябр. */
export const GET: RequestHandler = async ({ locals, url }) => {
	const user = locals.user!;
	const tz = user.timezone;
	const filters = parseFilters(url.searchParams, tz);

	const rows = await db.transaction.findMany({
		where: filtersWhere(user.id, filters, tz),
		include: {
			category: { select: { name: true } },
			account: { select: { name: true } },
			toAccount: { select: { name: true } }
		},
		orderBy: { occurredAt: 'asc' },
		take: 100_000
	});

	const lines = [
		['Дата', 'Время', 'Тип', 'Категория', 'Счёт', 'Сумма, грн', 'Комментарий', 'Источник']
	];
	for (const r of rows) {
		const sign = r.type === 'EXPENSE' ? -1 : 1;
		lines.push([
			dayKeyOf(r.occurredAt, tz),
			formatTime(r.occurredAt, tz),
			TYPE_LABEL[r.type],
			r.category?.name ?? (r.type === 'TRANSFER' ? '' : 'Без категории'),
			r.toAccount ? `${r.account.name} → ${r.toAccount.name}` : r.account.name,
			((sign * r.amount) / 100).toFixed(2).replace('.', ','),
			r.note ?? '',
			r.source === 'TELEGRAM' ? 'Telegram' : 'CRM'
		]);
	}

	const csv = '﻿' + lines.map((l) => l.map(cell).join(';')).join('\r\n');
	const name = filters.month && filters.month !== 'all' ? filters.month : 'all';

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="moneta-${name}.csv"`,
			'Cache-Control': 'no-store'
		}
	});
};
