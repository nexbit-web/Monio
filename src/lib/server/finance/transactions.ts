import { z } from 'zod';
import type { PrismaClient } from '../prisma/client.ts';
import type { TxSource } from '../prisma/enums.ts';
import { parseAmount } from '../../money.ts';
import { fromLocalInput } from '../../date.ts';

const id = z.string().max(40);
const optionalId = id.optional().transform((v) => v || undefined);

export const txFormSchema = z.object({
	id: optionalId,
	type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']),
	amount: z.string().max(40),
	accountId: id.min(1),
	toAccountId: optionalId,
	categoryId: optionalId,
	occurredAt: z.string().max(20),
	note: z.string().max(500).optional()
});

export type SaveResult = { ok: true; id: string } | { ok: false; message: string };

/**
 * Создаёт или обновляет операцию из полей формы.
 * Каждый id из формы перепроверяется на принадлежность пользователю —
 * подставить чужой счёт или категорию нельзя.
 */
export async function saveTransaction(
	db: PrismaClient,
	userId: string,
	tz: string,
	raw: Record<string, unknown>,
	source: TxSource = 'WEB'
): Promise<SaveResult> {
	const parsed = txFormSchema.safeParse(raw);
	if (!parsed.success) return { ok: false, message: 'Проверь поля формы' };
	const f = parsed.data;

	const amount = parseAmount(f.amount);
	if (amount === null)
		return { ok: false, message: 'Сумма — число больше нуля, например 250 или 99,90' };

	const occurredAt = fromLocalInput(f.occurredAt, tz);
	if (!occurredAt) return { ok: false, message: 'Укажи дату и время' };

	const account = await db.account.findFirst({ where: { id: f.accountId, userId } });
	if (!account) return { ok: false, message: 'Счёт не найден' };

	let toAccountId: string | null = null;
	let categoryId: string | null = null;

	if (f.type === 'TRANSFER') {
		const to = f.toAccountId
			? await db.account.findFirst({ where: { id: f.toAccountId, userId } })
			: null;
		if (!to) return { ok: false, message: 'Выбери счёт, на который переводишь' };
		if (to.id === account.id) return { ok: false, message: 'Счета перевода должны отличаться' };
		toAccountId = to.id;
	} else if (f.categoryId) {
		const category = await db.category.findFirst({ where: { id: f.categoryId, userId } });
		if (!category || category.kind !== f.type) {
			return { ok: false, message: 'Категория не подходит к типу операции' };
		}
		categoryId = category.id;
	}

	const data = {
		type: f.type,
		amount,
		occurredAt,
		accountId: account.id,
		toAccountId,
		categoryId,
		note: f.note?.trim() || null
	};

	if (f.id) {
		const { count } = await db.transaction.updateMany({ where: { id: f.id, userId }, data });
		return count ? { ok: true, id: f.id } : { ok: false, message: 'Операция не найдена' };
	}

	const created = await db.transaction.create({ data: { ...data, userId, source } });
	return { ok: true, id: created.id };
}

export async function deleteTransaction(db: PrismaClient, userId: string, id: string) {
	const { count } = await db.transaction.deleteMany({ where: { id, userId } });
	return count > 0;
}
