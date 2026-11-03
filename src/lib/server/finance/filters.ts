import type { Prisma } from '../prisma/client.ts';
import type { TxType } from '../prisma/enums.ts';
import { currentMonthKey, dayRange, isDayKey, isMonthKey, monthRange } from '../../date.ts';

/**
 * Фильтры списка операций живут в URL, поэтому ссылку на выборку можно сохранить:
 *   ?m=2026-11 | ?m=all | ?from=2026-10-01&to=2026-10-15
 *   &type=EXPENSE &cat=<id>|none &acc=<id> &q=текст
 */
export type TxFilters = {
	/** «2026-11», «all» или null, если задан произвольный период from–to */
	month: string | null;
	from: string | null;
	to: string | null;
	type: TxType | null;
	/** id категории, «none» — без категории */
	category: string | null;
	account: string | null;
	q: string;
};

const TYPES: TxType[] = ['EXPENSE', 'INCOME', 'TRANSFER'];
const ID = /^[a-z0-9]{10,40}$/;

export function parseFilters(params: URLSearchParams, tz: string): TxFilters {
	const from = params.get('from');
	const to = params.get('to');
	const m = params.get('m');
	const custom = isDayKey(from) || isDayKey(to);
	const type = params.get('type') as TxType | null;
	const cat = params.get('cat');
	const acc = params.get('acc');

	return {
		month: custom ? null : m === 'all' || isMonthKey(m) ? m : currentMonthKey(tz),
		from: custom && isDayKey(from) ? from : null,
		to: custom && isDayKey(to) ? to : null,
		type: type && TYPES.includes(type) ? type : null,
		category: cat === 'none' || (cat && ID.test(cat)) ? cat : null,
		account: acc && ID.test(acc) ? acc : null,
		q: (params.get('q') ?? '').trim().slice(0, 100)
	};
}

export function filtersWhere(
	userId: string,
	f: TxFilters,
	tz: string
): Prisma.TransactionWhereInput {
	const where: Prisma.TransactionWhereInput = { userId };

	if (f.month && f.month !== 'all') {
		const r = monthRange(f.month, tz);
		where.occurredAt = { gte: r.start, lt: r.end };
	} else if (f.from || f.to) {
		where.occurredAt = {
			...(f.from && { gte: dayRange(f.from, tz).start }),
			...(f.to && { lt: dayRange(f.to, tz).end })
		};
	}

	if (f.type) where.type = f.type;
	if (f.category) where.categoryId = f.category === 'none' ? null : f.category;
	if (f.account) where.OR = [{ accountId: f.account }, { toAccountId: f.account }];
	if (f.q) where.note = { contains: f.q, mode: 'insensitive' };

	return where;
}

/** Сериализация обратно в query-строку (для ссылок пагинации и экспорта). */
export function filtersQuery(f: TxFilters, extra: Record<string, string> = {}): string {
	const p = new URLSearchParams();
	if (f.month) p.set('m', f.month);
	if (f.from) p.set('from', f.from);
	if (f.to) p.set('to', f.to);
	if (f.type) p.set('type', f.type);
	if (f.category) p.set('cat', f.category);
	if (f.account) p.set('acc', f.account);
	if (f.q) p.set('q', f.q);
	for (const [k, v] of Object.entries(extra)) p.set(k, v);
	return p.toString();
}
