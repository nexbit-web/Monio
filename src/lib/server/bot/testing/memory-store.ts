/**
 * Хранилище бота в памяти — для тестов. Повторяет поведение prismaStore:
 * порядок сортировки, проверку владельца, учёт переводов в остатках.
 * Считает обращения (calls), чтобы тесты ловили лишние запросы к базе,
 * и умеет «сломаться» на нужном методе (failNext) — для проверки ошибок.
 */
import {
	DEFAULT_ACCOUNTS,
	DEFAULT_EXPENSE_CATEGORIES,
	DEFAULT_INCOME_CATEGORIES
} from '../../finance/defaults.ts';
import type {
	Account,
	AccountType,
	BotStore,
	Category,
	Kind,
	LearnWord,
	Link,
	NewTx,
	Range,
	Tx,
	TxPatch,
	TxType
} from '../store.ts';

type UserRow = { id: string; tz: string; initialized: boolean };
type LinkRow = {
	telegramId: bigint;
	userId: string;
	username: string | null;
	firstName: string | null;
	pendingCategoryId: string | null;
	pendingAt: Date | null;
};
type CategoryRow = Category & { userId: string; archived: boolean; sortOrder: number; seq: number };
type AccountRow = Account & {
	userId: string;
	archived: boolean;
	sortOrder: number;
	openingBalance: number;
	seq: number;
};
type TxRow = {
	id: string;
	userId: string;
	type: TxType;
	amount: number;
	occurredAt: Date;
	note: string | null;
	categoryId: string | null;
	accountId: string;
	toAccountId: string | null;
	source: 'WEB' | 'TELEGRAM';
	seq: number;
};

export type MemoryStore = ReturnType<typeof memoryStore>;

export function memoryStore() {
	let counter = 0;
	/** id как у cuid: 25 символов — чтобы проверять длину callback_data честно */
	const newId = () => `c${(++counter).toString(36).padStart(24, '0')}`;
	const seq = () => ++counter;

	const users = new Map<string, UserRow>();
	const links = new Map<bigint, LinkRow>();
	const codes = new Map<string, { userId: string; expiresAt: Date }>();
	const categories: CategoryRow[] = [];
	const accounts: AccountRow[] = [];
	const txs: TxRow[] = [];

	const calls: Record<string, number> = {};
	const failures = new Set<string>();

	const byOrder = <T extends { sortOrder: number; seq: number }>(a: T, b: T) =>
		a.sortOrder - b.sortOrder || a.seq - b.seq;

	const toCategory = ({
		id,
		kind,
		name,
		icon,
		keywords,
		monthlyBudget
	}: CategoryRow): Category => ({
		id,
		kind,
		name,
		icon,
		keywords: [...keywords],
		monthlyBudget
	});
	const toAccount = ({ id, name, icon, type, isDefault }: AccountRow): Account => ({
		id,
		name,
		icon,
		type,
		isDefault
	});

	function full(row: TxRow): Tx {
		const category = row.categoryId ? categories.find((c) => c.id === row.categoryId) : null;
		const account = accounts.find((a) => a.id === row.accountId)!;
		const to = row.toAccountId ? accounts.find((a) => a.id === row.toAccountId) : null;
		return {
			id: row.id,
			type: row.type,
			amount: row.amount,
			occurredAt: new Date(row.occurredAt),
			note: row.note,
			category: category ? toCategory(category) : null,
			account: toAccount(account),
			toAccount: to ? toAccount(to) : null
		};
	}

	const inRange = (d: Date, r: Range) => d >= r.start && d < r.end;

	/** Стартовые счета и категории, как initializeUser. */
	function initialize(userId: string) {
		const user = users.get(userId)!;
		if (user.initialized) return;
		const add = (kind: Kind, list: typeof DEFAULT_EXPENSE_CATEGORIES) =>
			list.forEach((c, i) =>
				categories.push({
					id: newId(),
					userId,
					kind,
					name: c.name,
					icon: c.icon,
					keywords: [...c.keywords],
					monthlyBudget: null,
					archived: false,
					sortOrder: i,
					seq: seq()
				})
			);
		add('EXPENSE', DEFAULT_EXPENSE_CATEGORIES);
		add('INCOME', DEFAULT_INCOME_CATEGORIES);
		if (!accounts.some((a) => a.userId === userId))
			DEFAULT_ACCOUNTS.forEach((a, i) =>
				accounts.push({
					id: newId(),
					userId,
					name: a.name,
					icon: a.icon,
					type: a.type,
					isDefault: a.isDefault ?? false,
					archived: false,
					sortOrder: i,
					openingBalance: 0,
					seq: seq()
				})
			);
		user.initialized = true;
	}

	/** Оборачивает метод: считает вызовы и бросает ошибку, если попросили. */
	function track<A extends unknown[], R>(name: string, fn: (...args: A) => R) {
		return async (...args: A): Promise<Awaited<R>> => {
			calls[name] = (calls[name] ?? 0) + 1;
			if (failures.delete(name)) throw new Error(`база недоступна (${name})`);
			return await fn(...args);
		};
	}

	const store: BotStore = {
		link: track('link', (telegramId: bigint): Link | null => {
			const link = links.get(telegramId);
			if (!link) return null;
			initialize(link.userId);
			return {
				telegramId,
				userId: link.userId,
				tz: users.get(link.userId)!.tz,
				pendingCategoryId: link.pendingCategoryId,
				pendingAt: link.pendingAt
			};
		}),

		redeemCode: track(
			'redeemCode',
			(
				code: string,
				telegramId: bigint,
				profile: { username: string | null; firstName: string | null }
			) => {
				const row = codes.get(code);
				if (!row || row.expiresAt.getTime() < Date.now()) return null;
				const others = [...links.values()]
					.filter((l) => l.userId === row.userId && l.telegramId !== telegramId)
					.map((l) => l.telegramId);
				links.set(telegramId, {
					telegramId,
					userId: row.userId,
					...profile,
					pendingCategoryId: null,
					pendingAt: null
				});
				codes.delete(code);
				initialize(row.userId);
				return { others };
			}
		),

		setPending: track('setPending', (telegramId: bigint, categoryId: string | null) => {
			const link = links.get(telegramId);
			if (!link) throw new Error('нет привязки');
			link.pendingCategoryId = categoryId;
			link.pendingAt = categoryId ? new Date() : null;
		}),

		categories: track('categories', (userId: string, withArchived = false) =>
			categories
				.filter((c) => c.userId === userId && (withArchived || !c.archived))
				.sort(byOrder)
				.map(toCategory)
		),

		accounts: track('accounts', (userId: string) =>
			accounts
				.filter((a) => a.userId === userId && !a.archived)
				.sort(byOrder)
				.map(toAccount)
		),

		setDefaultAccount: track('setDefaultAccount', (userId: string, accountId: string) => {
			const target = accounts.find((a) => a.id === accountId && a.userId === userId && !a.archived);
			if (!target) return false;
			for (const a of accounts) if (a.userId === userId) a.isDefault = a.id === accountId;
			return true;
		}),

		addKeyword: track('addKeyword', (userId: string, categoryId: string, word: string) => {
			const c = categories.find((x) => x.id === categoryId && x.userId === userId);
			if (c) c.keywords.push(word);
		}),

		createTx: track('createTx', (input: NewTx) => {
			const row: TxRow = {
				id: newId(),
				...input,
				occurredAt: new Date(input.occurredAt),
				toAccountId: null,
				source: 'TELEGRAM',
				seq: seq()
			};
			txs.push(row);
			return full(row);
		}),

		tx: track('tx', (userId: string, id: string) => {
			const row = txs.find((t) => t.id === id && t.userId === userId);
			return row ? full(row) : null;
		}),

		updateTx: track('updateTx', (userId: string, id: string, patch: TxPatch, learn?: LearnWord) => {
			const row = txs.find((t) => t.id === id && t.userId === userId);
			if (!row) return null;
			Object.assign(row, patch);
			if (learn) {
				const c = categories.find((x) => x.id === learn.categoryId && x.userId === userId);
				if (c) c.keywords.push(learn.word);
			}
			return full(row);
		}),

		deleteTx: track('deleteTx', (userId: string, id: string) => {
			const i = txs.findIndex((t) => t.id === id && t.userId === userId);
			if (i < 0) return null;
			const tx = full(txs[i]);
			txs.splice(i, 1);
			return tx;
		}),

		lastCreated: track('lastCreated', (userId: string) => {
			const mine = txs.filter((t) => t.userId === userId);
			const last = mine.reduce<TxRow | null>((a, b) => (!a || b.seq > a.seq ? b : a), null);
			return last ? full(last) : null;
		}),

		between: track('between', (userId: string, range: Range) =>
			txs
				.filter((t) => t.userId === userId && inRange(t.occurredAt, range))
				.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
				.map(full)
		),

		recent: track('recent', (userId: string, skip: number, take: number) =>
			txs
				.filter((t) => t.userId === userId)
				.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || (b.id > a.id ? 1 : -1))
				.slice(skip, skip + take)
				.map(full)
		),

		totals: track('totals', (userId: string, range: Range) => {
			const out = { income: 0, expense: 0 };
			for (const t of txs)
				if (t.userId === userId && inRange(t.occurredAt, range)) {
					if (t.type === 'INCOME') out.income += t.amount;
					if (t.type === 'EXPENSE') out.expense += t.amount;
				}
			return out;
		}),

		spentByCategory: track('spentByCategory', (userId: string, range: Range) => {
			const out = new Map<string | null, number>();
			for (const t of txs)
				if (t.userId === userId && t.type === 'EXPENSE' && inRange(t.occurredAt, range))
					out.set(t.categoryId, (out.get(t.categoryId) ?? 0) + t.amount);
			return out;
		}),

		balances: track('balances', (userId: string) => {
			const out = new Map<string, number>();
			for (const a of accounts) if (a.userId === userId) out.set(a.id, a.openingBalance);
			for (const t of txs) {
				if (t.userId !== userId) continue;
				const delta = t.type === 'INCOME' ? t.amount : -t.amount;
				out.set(t.accountId, (out.get(t.accountId) ?? 0) + delta);
				if (t.type === 'TRANSFER' && t.toAccountId)
					out.set(t.toAccountId, (out.get(t.toAccountId) ?? 0) + t.amount);
			}
			return out;
		})
	};

	// ── Наполнение для тестов ───────────────────────────────────────────

	function addUser({ tz = 'Europe/Kyiv', initialized = true } = {}) {
		const id = newId();
		users.set(id, { id, tz, initialized: false });
		if (initialized) initialize(id);
		return id;
	}

	function linkTelegram(userId: string, telegramId: bigint) {
		links.set(telegramId, {
			telegramId,
			userId,
			username: null,
			firstName: null,
			pendingCategoryId: null,
			pendingAt: null
		});
	}

	function addCode(code: string, userId: string, expiresAt: Date) {
		codes.set(code, { userId, expiresAt });
	}

	function category(userId: string, name: string, kind?: Kind): CategoryRow {
		const c = categories.find(
			(x) => x.userId === userId && x.name === name && (!kind || x.kind === kind)
		);
		if (!c) throw new Error(`нет категории «${name}»`);
		return c;
	}

	function account(userId: string, name: string): AccountRow {
		const a = accounts.find((x) => x.userId === userId && x.name === name);
		if (!a) throw new Error(`нет счёта «${name}»`);
		return a;
	}

	function addAccount(
		userId: string,
		name: string,
		{ type = 'OTHER' as AccountType, icon = 'wallet', openingBalance = 0 } = {}
	): AccountRow {
		const row: AccountRow = {
			id: newId(),
			userId,
			name,
			icon,
			type,
			isDefault: false,
			archived: false,
			sortOrder: accounts.filter((a) => a.userId === userId).length,
			openingBalance,
			seq: seq()
		};
		accounts.push(row);
		return row;
	}

	function addTx(
		userId: string,
		t: Partial<Omit<TxRow, 'id' | 'userId' | 'seq'>> & { amount: number; occurredAt: Date }
	): TxRow {
		const row: TxRow = {
			id: newId(),
			userId,
			type: 'EXPENSE',
			note: null,
			categoryId: null,
			accountId: accounts.find((a) => a.userId === userId && a.isDefault)!.id,
			toAccountId: null,
			source: 'WEB',
			...t,
			seq: seq()
		};
		txs.push(row);
		return row;
	}

	return {
		store,
		users,
		links,
		codes,
		categories,
		accounts,
		txs,
		calls,
		/** следующий вызов метода бросит ошибку */
		failNext: (method: keyof BotStore) => failures.add(method),
		resetCalls: () => {
			for (const k of Object.keys(calls)) delete calls[k];
		},
		addUser,
		linkTelegram,
		addCode,
		category,
		account,
		addAccount,
		addTx
	};
}
