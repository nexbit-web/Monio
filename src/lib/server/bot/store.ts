/**
 * Всё, что боту нужно от базы, — одним интерфейсом. Бот не знает про Prisma:
 * в работе ему дают prismaStore(db), в тестах — хранилище в памяти
 * (testing/memory-store.ts), и все сценарии проверяются без сети и Neon.
 *
 * Каждый метод — один запрос (или одна транзакция), чтобы ответ в чате
 * приходил за минимум обращений к базе.
 */
import type { Prisma, PrismaClient } from '../prisma/client.ts';
import { initializeUser } from '../finance/defaults.ts';
import { accountBalances, totalsByCategory, totalsByType, type Range } from '../finance/stats.ts';

export type { Range };

export type Kind = 'EXPENSE' | 'INCOME';
export type TxType = 'EXPENSE' | 'INCOME' | 'TRANSFER';
export type AccountType = 'CARD' | 'CASH' | 'SAVINGS' | 'OTHER';

export type Category = {
	id: string;
	kind: Kind;
	name: string;
	icon: string;
	keywords: string[];
	monthlyBudget: number | null;
};

export type Account = {
	id: string;
	name: string;
	icon: string;
	type: AccountType;
	isDefault: boolean;
};

export type Tx = {
	id: string;
	type: TxType;
	/** копейки, всегда > 0 */
	amount: number;
	occurredAt: Date;
	note: string | null;
	category: Category | null;
	account: Account;
	toAccount: Account | null;
};

export type Link = {
	telegramId: bigint;
	userId: string;
	tz: string;
	pendingCategoryId: string | null;
	pendingAt: Date | null;
};

export type NewTx = {
	userId: string;
	type: Kind;
	amount: number;
	occurredAt: Date;
	accountId: string;
	categoryId: string | null;
	note: string | null;
};

export type TxPatch = Partial<{
	type: Kind;
	categoryId: string | null;
	accountId: string;
	occurredAt: Date;
}>;

export interface BotStore {
	/** Привязка Telegram → пользователь; заодно создаёт стартовые счета и категории. */
	link(telegramId: bigint): Promise<Link | null>;
	/**
	 * Привязать по одноразовому коду из CRM. null — код неверный или истёк.
	 * others — Telegram, которые уже были привязаны к этому аккаунту: их
	 * предупреждаем о новом входе.
	 */
	redeemCode(
		code: string,
		telegramId: bigint,
		profile: { username: string | null; firstName: string | null }
	): Promise<{ others: bigint[] } | null>;
	setPending(telegramId: bigint, categoryId: string | null): Promise<void>;

	/** Активные категории в порядке из CRM; withArchived — и архивные (для отчётов). */
	categories(userId: string, withArchived?: boolean): Promise<Category[]>;
	/** Активные счета в порядке из CRM. */
	accounts(userId: string): Promise<Account[]>;
	setDefaultAccount(userId: string, accountId: string): Promise<boolean>;
	addKeyword(userId: string, categoryId: string, word: string): Promise<void>;

	createTx(input: NewTx): Promise<Tx>;
	/** null — операции нет или она чужая. */
	tx(userId: string, id: string): Promise<Tx | null>;
	updateTx(userId: string, id: string, patch: TxPatch, learn?: LearnWord): Promise<Tx | null>;
	deleteTx(userId: string, id: string): Promise<Tx | null>;
	/** Последняя записанная (по времени создания, а не операции). */
	lastCreated(userId: string): Promise<Tx | null>;
	/** Операции за период, по времени. */
	between(userId: string, range: Range): Promise<Tx[]>;
	/** Последние по времени операции, с пропуском skip. */
	recent(userId: string, skip: number, take: number): Promise<Tx[]>;

	totals(userId: string, range: Range): Promise<{ income: number; expense: number }>;
	/** categoryId → расходы за период; ключ null — без категории. */
	spentByCategory(userId: string, range: Range): Promise<Map<string | null, number>>;
	balances(userId: string): Promise<Map<string, number>>;
}

/** Слово, которое запоминаем за категорией вместе со сменой категории. */
export type LearnWord = { categoryId: string; word: string };

/** Сколько помним привязку Telegram → пользователь. */
export const LINK_CACHE_MS = 60_000;

/**
 * Привязку спрашиваем у базы на каждое сообщение, а меняется она редко.
 * Помним её минуту: несколько записей подряд — без лишнего запроса (~150 мс
 * до Neon). Выбор категории (pending) меняет сам бот — его обновляем на месте.
 * Отвязку в CRM или смену часового пояса бот заметит не позже чем через минуту.
 */
export function withLinkCache(store: BotStore, ttlMs = LINK_CACHE_MS): BotStore {
	const cache = new Map<bigint, { link: Link; at: number }>();
	return {
		...store,
		async link(telegramId) {
			const hit = cache.get(telegramId);
			if (hit && Date.now() - hit.at < ttlMs) return { ...hit.link };
			const link = await store.link(telegramId);
			if (link) cache.set(telegramId, { link: { ...link }, at: Date.now() });
			else cache.delete(telegramId);
			return link;
		},
		async redeemCode(code, telegramId, profile) {
			cache.delete(telegramId);
			return store.redeemCode(code, telegramId, profile);
		},
		async setPending(telegramId, categoryId) {
			await store.setPending(telegramId, categoryId);
			const hit = cache.get(telegramId);
			if (hit) {
				hit.link.pendingCategoryId = categoryId;
				hit.link.pendingAt = categoryId ? new Date() : null;
			}
		}
	};
}

// ── Prisma ──────────────────────────────────────────────────────────────

const ORDER = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }];

const CATEGORY_FIELDS = {
	id: true,
	kind: true,
	name: true,
	icon: true,
	keywords: true,
	monthlyBudget: true
} satisfies Prisma.CategorySelect;

const ACCOUNT_FIELDS = {
	id: true,
	name: true,
	icon: true,
	type: true,
	isDefault: true
} satisfies Prisma.AccountSelect;

const TX_FIELDS = {
	id: true,
	type: true,
	amount: true,
	occurredAt: true,
	note: true,
	category: { select: CATEGORY_FIELDS },
	account: { select: ACCOUNT_FIELDS },
	toAccount: { select: ACCOUNT_FIELDS }
} satisfies Prisma.TransactionSelect;

/** Prisma бросает P2025, если записи под условием нет, — для бота это просто «не нашлось». */
function notFound(err: unknown): null {
	if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') return null;
	throw err;
}

export function prismaStore(db: PrismaClient): BotStore {
	return {
		async link(telegramId) {
			const link = await db.telegramLink.findUnique({
				where: { telegramId },
				select: {
					telegramId: true,
					userId: true,
					pendingCategoryId: true,
					pendingAt: true,
					user: { select: { timezone: true, initializedAt: true } }
				}
			});
			if (!link) return null;
			if (!link.user.initializedAt) await initializeUser(db, link.userId);
			return {
				telegramId: link.telegramId,
				userId: link.userId,
				tz: link.user.timezone,
				pendingCategoryId: link.pendingCategoryId,
				pendingAt: link.pendingAt
			};
		},

		async redeemCode(code, telegramId, profile) {
			const row = await db.telegramLinkCode.findUnique({ where: { code } });
			if (!row || row.expiresAt.getTime() < Date.now()) return null;
			const [, , others] = await db.$transaction([
				db.telegramLink.upsert({
					where: { telegramId },
					create: { telegramId, userId: row.userId, ...profile },
					update: { userId: row.userId, ...profile, pendingCategoryId: null, pendingAt: null }
				}),
				db.telegramLinkCode.delete({ where: { code } }),
				db.telegramLink.findMany({
					where: { userId: row.userId, NOT: { telegramId } },
					select: { telegramId: true }
				})
			]);
			await initializeUser(db, row.userId);
			return { others: others.map((o) => o.telegramId) };
		},

		async setPending(telegramId, categoryId) {
			await db.telegramLink.update({
				where: { telegramId },
				data: { pendingCategoryId: categoryId, pendingAt: categoryId ? new Date() : null }
			});
		},

		categories: (userId, withArchived = false) =>
			db.category.findMany({
				where: { userId, ...(!withArchived && { archived: false }) },
				orderBy: ORDER,
				select: CATEGORY_FIELDS
			}),

		accounts: (userId) =>
			db.account.findMany({
				where: { userId, archived: false },
				orderBy: ORDER,
				select: ACCOUNT_FIELDS
			}),

		async setDefaultAccount(userId, accountId) {
			const account = await db.account.findFirst({
				where: { id: accountId, userId, archived: false },
				select: { id: true }
			});
			if (!account) return false;
			await db.$transaction([
				db.account.updateMany({
					where: { userId, isDefault: true, id: { not: accountId } },
					data: { isDefault: false }
				}),
				db.account.update({ where: { id: accountId }, data: { isDefault: true } })
			]);
			return true;
		},

		async addKeyword(userId, categoryId, word) {
			await db.category.updateMany({
				where: { id: categoryId, userId },
				data: { keywords: { push: word } }
			});
		},

		createTx: (input) =>
			db.transaction.create({ data: { ...input, source: 'TELEGRAM' }, select: TX_FIELDS }),

		tx: (userId, id) => db.transaction.findFirst({ where: { id, userId }, select: TX_FIELDS }),

		async updateTx(userId, id, patch, learn) {
			const update = db.transaction.update({
				where: { id, userId },
				data: patch,
				select: TX_FIELDS
			});
			if (!learn) return update.catch(notFound);
			const [tx] = (await db
				.$transaction([
					update,
					db.category.updateMany({
						where: { id: learn.categoryId, userId },
						data: { keywords: { push: learn.word } }
					})
				])
				.catch(notFound)) ?? [null];
			return tx;
		},

		deleteTx: (userId, id) =>
			db.transaction.delete({ where: { id, userId }, select: TX_FIELDS }).catch(notFound),

		lastCreated: (userId) =>
			db.transaction.findFirst({
				where: { userId },
				orderBy: { createdAt: 'desc' },
				select: TX_FIELDS
			}),

		between: (userId, range) =>
			db.transaction.findMany({
				where: { userId, occurredAt: { gte: range.start, lt: range.end } },
				orderBy: { occurredAt: 'asc' },
				select: TX_FIELDS
			}),

		recent: (userId, skip, take) =>
			db.transaction.findMany({
				where: { userId },
				orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
				skip,
				take,
				select: TX_FIELDS
			}),

		totals: (userId, range) => totalsByType(db, userId, range),
		spentByCategory: (userId, range) => totalsByCategory(db, userId, range, 'EXPENSE'),
		balances: (userId) => accountBalances(db, userId)
	};
}
