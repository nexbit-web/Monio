/**
 * Telegram-бот Monio. Главное — записать трату за одно сообщение:
 * «250 продукты» → запись, категория узнана, ответ с кнопками исправления.
 *
 * Управление — клавиатурой внизу чата (ui.ts): главный экран и «Команды».
 * Тексты — render.ts, база — store.ts. Бот обращается к базе минимально:
 * запись операции — три запроса (привязка; категории + счета + траты месяца
 * параллельно; создание), карточка собирается из уже загруженного.
 */
import { Bot, GrammyError, type Context } from 'grammy';
import type { InlineKeyboardButton, InlineKeyboardMarkup, UserFromGetMe } from 'grammy/types';
import {
	DAY_MS,
	addDaysToKey,
	dayKeyOf,
	dayRange,
	daysInMonth,
	isDayKey,
	isMonthKey,
	monthKeyOf,
	monthRange,
	shiftMonth,
	zonedParts
} from '../../date.ts';
import { formatDayShort, monthName } from './dates.ts';
import { dropNameWords, learnableWord, matchCategory } from '../finance/categorize.ts';
import { extractAccount, parseEntry } from './parse.ts';
import {
	FAILED,
	HELP,
	HISTORY_PAGE,
	LINKED,
	LINK_EXPIRED,
	MAIN_TEXT,
	NOT_LINKED,
	NO_ACCOUNTS,
	NO_AMOUNT,
	ONLY_TEXT,
	T,
	UNKNOWN_COMMAND,
	WELCOME_BACK,
	askAmountText,
	askCategoryText,
	balanceText,
	cardText,
	categoriesText,
	commandsText,
	dayText,
	deletedText,
	historyText,
	monthText,
	newLinkAlert,
	plainIconed,
	signed,
	type CardExtra
} from './render.ts';
import { autoRetry } from './retry.ts';
import {
	pendingFields,
	withLinkCache,
	type Account,
	type BotStore,
	type Category,
	type Kind,
	type Link,
	type Tx,
	type TxPatch
} from './store.ts';
import {
	ACTIONS,
	COMMAND_ORDER,
	btn,
	commandsKeyboard,
	grid,
	inline,
	isOldLabel,
	mainKeyboard,
	matchButton,
	type ActionId
} from './ui.ts';

export type BotContext = Context & { linked?: Link };

export type BotOptions = {
	/** готовый ответ getMe — тогда бот не ходит в сеть при старте (тесты, вебхук) */
	botInfo?: UserFromGetMe;
};

/** Сколько ждём сумму после выбора категории кнопкой — или новую сумму/описание при правке. */
export const PENDING_TTL_MS = 15 * 60_000;

/** Как в CRM: длиннее описание не сохраняем. */
const MAX_NOTE = 500;

/** Правка записи: ждём новую сумму (a) или описание (n) для записи txId в сообщении messageId. */
type PendingEdit = { field: 'a' | 'n'; txId: string; messageId: number };

/**
 * Режим карточки: просмотр, выбор категории, меню правки («Що змінити?»),
 * ждём новую сумму, ждём новое описание.
 */
type CardMode = 'view' | 'categories' | 'edit' | 'amount' | 'note';

const kindCode = (kind: Kind) => (kind === 'EXPENSE' ? 'E' : 'I');

/** Категории «всё подряд»: выбор такой не учит бота новому слову. */
const CATCH_ALL = new Set(['Другое', 'Інше']);

export function createBot(token: string, db: BotStore, options: BotOptions = {}): Bot<BotContext> {
	const store = withLinkCache(db);
	const bot = new Bot<BotContext>(token, { botInfo: options.botInfo });
	bot.api.config.use(autoRetry());

	// ── Надёжность ──────────────────────────────────────────────────────

	// Любая ошибка — в лог и короткое сообщение человеку, а не тишина.
	// Ловим здесь, а не в bot.catch: так вебхук всегда отвечает 200 и Telegram
	// не присылает то же сообщение повторно (иначе — двойная запись).
	bot.use(async (ctx, next) => {
		try {
			await next();
		} catch (err) {
			console.error(`[bot] ошибка в обновлении ${ctx.update.update_id}:`, err);
			await tellFailure(ctx);
		}
	});

	// Только личка: в группах пишут посторонние.
	bot.use(async (ctx, next) => {
		if (ctx.chat?.type === 'private' && ctx.from && !ctx.from.is_bot) await next();
	});

	// ── Привязка ────────────────────────────────────────────────────────

	bot.command('start', async (ctx) => {
		const telegramId = BigInt(ctx.from!.id);
		const code = ctx.match.trim();

		if (code) {
			const profile = {
				username: ctx.from!.username ?? null,
				firstName: ctx.from!.first_name ?? null
			};
			const linked = await store.redeemCode(code, telegramId, profile);
			await ctx.reply(linked ? LINKED : LINK_EXPIRED, {
				parse_mode: 'HTML',
				...(linked && { reply_markup: mainKeyboard })
			});
			// Уже привязанные Telegram узнают о новом входе — если ссылку увели, это сразу видно.
			if (linked)
				await Promise.all(
					linked.others.map((id) =>
						ctx.api
							.sendMessage(Number(id), newLinkAlert(profile), { parse_mode: 'HTML' })
							.catch(() => {})
					)
				);
			return;
		}

		const link = await store.link(telegramId);
		await ctx.reply(link ? WELCOME_BACK : NOT_LINKED, {
			parse_mode: 'HTML',
			reply_markup: link ? mainKeyboard : { remove_keyboard: true }
		});
	});

	// Всё остальное — только для привязанных аккаунтов.
	bot.use(async (ctx, next) => {
		const link = await store.link(BigInt(ctx.from!.id));
		if (!link) {
			if (ctx.callbackQuery) await ctx.answerCallbackQuery();
			await ctx.reply(NOT_LINKED, { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } });
			return;
		}
		ctx.linked = link;
		await next();
	});

	const me = (ctx: BotContext) => ctx.linked!;

	/** Категория, выбранная кнопкой, — если её выбрали недавно. */
	function pendingCategoryId(ctx: BotContext): string | null {
		const { pendingCategoryId, pendingAt } = me(ctx);
		if (!pendingCategoryId || !pendingAt) return null;
		return Date.now() - pendingAt.getTime() < PENDING_TTL_MS ? pendingCategoryId : null;
	}

	/** Правка, которую ждём, — если её начали недавно. */
	function pendingEdit(ctx: BotContext): PendingEdit | null {
		const { pendingEdit, pendingAt } = me(ctx);
		if (!pendingEdit || !pendingAt || Date.now() - pendingAt.getTime() >= PENDING_TTL_MS)
			return null;
		const m = /^([an]):(\w+):(\d+)$/.exec(pendingEdit);
		return m ? { field: m[1] as 'a' | 'n', txId: m[2], messageId: Number(m[3]) } : null;
	}

	async function setPendingEdit(ctx: BotContext, edit: string) {
		const link = me(ctx);
		await store.setPendingEdit(link.telegramId, edit);
		Object.assign(link, pendingFields(null, edit));
	}

	async function clearPending(ctx: BotContext) {
		const link = me(ctx);
		if (!link.pendingCategoryId && !link.pendingEdit) return;
		await store.setPending(link.telegramId, null);
		Object.assign(link, pendingFields(null, null));
	}

	// Нажал другую кнопку — правку, которую ждали, отменяем: иначе следующая
	// запись («250 кава») молча поменяла бы старую.
	bot.on('callback_query:data', async (ctx, next) => {
		if (me(ctx).pendingEdit && !/^e[an]:/.test(ctx.callbackQuery.data)) await clearPending(ctx);
		await next();
	});

	// ── Кнопки внизу и команды ──────────────────────────────────────────

	const actions: Record<ActionId, (ctx: BotContext) => Promise<unknown>> = {
		expense: (ctx) => askCategory(ctx, 'EXPENSE'),
		income: (ctx) => askCategory(ctx, 'INCOME'),
		today: (ctx) => showDay(ctx, dayKeyOf(new Date(), me(ctx).tz)),
		month: (ctx) => showMonth(ctx, monthKeyOf(new Date(), me(ctx).tz)),
		balance: (ctx) => showBalance(ctx),
		last: (ctx) => showHistory(ctx, 0),
		undo: askUndo,
		categories: async (ctx) =>
			ctx.reply(categoriesText(await store.categories(me(ctx).userId)), { parse_mode: 'HTML' }),
		help: (ctx) => ctx.reply(HELP, { parse_mode: 'HTML', reply_markup: mainKeyboard }),
		commands: (ctx) =>
			ctx.reply(commandsText(), { parse_mode: 'HTML', reply_markup: commandsKeyboard }),
		main: (ctx) => ctx.reply(MAIN_TEXT, { parse_mode: 'HTML', reply_markup: mainKeyboard })
	};

	async function runAction(ctx: BotContext, id: ActionId, oldKeyboard = false) {
		// Ушёл в другой раздел — значит, сумму для выбранной категории уже не ждём.
		if (id !== 'expense' && id !== 'income') await clearPending(ctx);
		if (oldKeyboard) await ctx.reply(T.keyboardUpdated, { reply_markup: mainKeyboard });
		await actions[id](ctx);
	}

	for (const id of COMMAND_ORDER) bot.command(ACTIONS[id].command, (ctx) => runAction(ctx, id));

	bot.on('message:text', async (ctx, next) => {
		const text = ctx.message.text;
		if (text.startsWith('/')) return next();
		const id = matchButton(text);
		// Ждём новое описание — им может быть и слово «історія». Кнопкой считаем
		// только нажатую надпись клавиатуры, она правку отменяет.
		const editing = pendingEdit(ctx);
		const keyPressed = !!id && (text.trim() === ACTIONS[id].label || isOldLabel(text));
		if (editing && !keyPressed) return applyEdit(ctx, editing, text);
		if (id) return runAction(ctx, id, isOldLabel(text));
		await record(ctx, text);
	});

	// ── Запись операции ─────────────────────────────────────────────────

	async function record(ctx: BotContext, text: string) {
		const { userId, tz, telegramId } = me(ctx);
		const entry = parseEntry(text);
		if (!entry) {
			// человек, похоже, потерялся — заодно вернём кнопки, если их стёрли
			await ctx.reply(NO_AMOUNT, { parse_mode: 'HTML', reply_markup: mainKeyboard });
			return;
		}

		const occurredAt = new Date(ctx.message!.date * 1000 - entry.daysAgo * DAY_MS);
		const month = monthKeyOf(occurredAt, tz);
		const [categories, accounts, spent] = await Promise.all([
			store.categories(userId),
			store.accounts(userId),
			store.spentByCategory(userId, monthRange(month, tz))
		]);
		if (accounts.length === 0) {
			await ctx.reply(NO_ACCOUNTS, { reply_markup: mainKeyboard });
			return;
		}

		const named = extractAccount(entry.note, accounts);
		const note = named.note;
		const account = named.account ?? accounts.find((a) => a.isDefault) ?? accounts[0];

		const pending = pendingCategoryId(ctx);
		let category = pending ? (categories.find((c) => c.id === pending) ?? null) : null;
		if (!category && note) {
			const expense = categories.filter((c) => c.kind === 'EXPENSE');
			const income = categories.filter((c) => c.kind === 'INCOME');
			if (entry.sign === '+') category = matchCategory(note, income);
			else {
				category = matchCategory(note, expense);
				// «зарплата 30000» без плюса — всё равно доход
				if (!category && entry.sign === null) category = matchCategory(note, income);
			}
		}

		// «продукти атб» в «Продуктах» → описание «атб»: название категории и так видно рядом
		const cleanNote = category ? dropNameWords(note, category.name) : note;

		const [tx] = await Promise.all([
			store.createTx({
				userId,
				type: category ? category.kind : entry.sign === '+' ? 'INCOME' : 'EXPENSE',
				amount: entry.amount,
				occurredAt,
				accountId: account.id,
				categoryId: category?.id ?? null,
				note: cleanNote || null
			}),
			me(ctx).pendingCategoryId ? store.setPending(telegramId, null) : null
		]);

		const extra: CardExtra =
			tx.category && tx.type === 'EXPENSE'
				? { spent: (spent.get(tx.category.id) ?? 0) + tx.amount, monthKey: month }
				: {};
		if (!tx.category) extra.ask = { hint: learnableWord(note, categories), change: false };

		await ctx.reply(cardText(tx, tz, extra), {
			parse_mode: 'HTML',
			reply_markup: cardKeyboard(tx, categories)
		});
	}

	// ── Выбор категории перед суммой ────────────────────────────────────

	function pickerKeyboard(categories: Category[], kind: Kind): InlineKeyboardMarkup {
		return inline([
			...grid(
				categories.filter((c) => c.kind === kind).map((c) => btn(plainIconed(c), `pick:${c.id}`))
			),
			[btn(T.cancel, 'unpick')]
		]);
	}

	async function askCategory(ctx: BotContext, kind: Kind) {
		const [categories] = await Promise.all([store.categories(me(ctx).userId), clearPending(ctx)]);
		await ctx.reply(askCategoryText(kind), {
			parse_mode: 'HTML',
			reply_markup: pickerKeyboard(categories, kind)
		});
	}

	bot.callbackQuery(/^ask:([EI])$/, async (ctx) => {
		const kind: Kind = ctx.match[1] === 'E' ? 'EXPENSE' : 'INCOME';
		const [categories] = await Promise.all([
			store.categories(me(ctx).userId),
			clearPending(ctx),
			ctx.answerCallbackQuery()
		]);
		await edit(ctx, askCategoryText(kind), pickerKeyboard(categories, kind));
	});

	bot.callbackQuery(/^pick:(\w+)$/, async (ctx) => {
		const { userId, telegramId } = me(ctx);
		const category = (await store.categories(userId)).find((c) => c.id === ctx.match[1]);
		if (!category) {
			await ctx.answerCallbackQuery({ text: T.categoryGone });
			return;
		}
		await Promise.all([store.setPending(telegramId, category.id), ctx.answerCallbackQuery()]);
		await edit(
			ctx,
			askAmountText(category),
			inline([[btn(T.otherCategory, `ask:${kindCode(category.kind)}`), btn(T.cancel, 'unpick')]])
		);
	});

	bot.callbackQuery('unpick', async (ctx) => {
		await Promise.all([
			store.setPending(me(ctx).telegramId, null),
			ctx.answerCallbackQuery({ text: T.cancelled })
		]);
		await ctx.deleteMessage().catch(() => ctx.editMessageReplyMarkup().catch(() => {}));
	});

	// ── Карточка операции и её кнопки ───────────────────────────────────

	function cardKeyboard(
		tx: Tx,
		categories: Category[],
		mode: CardMode = 'view'
	): InlineKeyboardMarkup {
		const remove = btn(T.remove, `del:${tx.id}`, 'danger');
		const change = btn(T.edit, `ed:${tx.id}`);
		const back = btn(T.back, `v:${tx.id}`);

		if (mode === 'edit') {
			const canLater = tx.occurredAt.getTime() + DAY_MS <= Date.now();
			return inline([
				[btn(T.editAmount, `ea:${tx.id}`), btn(T.editNote, `en:${tx.id}`)],
				[
					btn(T.dayEarlier, `back:${tx.id}`),
					...(canLater ? [btn(T.dayLater, `fwd:${tx.id}`)] : [])
				],
				[back]
			]);
		}
		if (mode === 'amount') return inline([[btn(T.back, `ed:${tx.id}`)]]);
		if (mode === 'note')
			return inline([
				[...(tx.note ? [btn(T.clearNote, `ec:${tx.id}`)] : []), btn(T.back, `ed:${tx.id}`)]
			]);

		if (tx.type === 'TRANSFER') return inline([[change, remove]]);

		if (mode === 'categories' || !tx.category) {
			const kind: Kind = tx.type;
			const rows: InlineKeyboardButton[][] = grid(
				categories
					.filter((c) => c.kind === kind)
					.map((c) =>
						btn(
							plainIconed(c),
							`sc:${tx.id}:${c.id}`,
							c.id === tx.category?.id ? 'primary' : undefined
						)
					)
			);
			const toggle = btn(kind === 'EXPENSE' ? T.toIncome : T.toExpense, `tt:${tx.id}`);
			if (tx.category) rows.push([toggle, back]);
			else rows.push([toggle, change], [remove]);
			return inline(rows);
		}

		return inline([
			[btn(T.category, `cats:${tx.id}`), btn(T.account, `accs:${tx.id}`)],
			[change, remove]
		]);
	}

	const FOOTERS: Partial<Record<CardMode, string>> = {
		edit: T.editWhat,
		amount: T.askAmount,
		note: T.askNote
	};

	/** Траты категории за месяц операции — для строки «У листопаді на …». */
	async function cardExtra(userId: string, tz: string, tx: Tx): Promise<CardExtra> {
		if (tx.type !== 'EXPENSE' || !tx.category) return {};
		const monthKey = monthKeyOf(tx.occurredAt, tz);
		const spent = await store.spentByCategory(userId, monthRange(monthKey, tz));
		return { spent: spent.get(tx.category.id) ?? 0, monthKey };
	}

	/** Показать карточку в режиме mode — в сообщении с кнопкой или в сообщении messageId. */
	async function showCard(ctx: BotContext, tx: Tx, mode: CardMode = 'view', messageId?: number) {
		const { userId, tz } = me(ctx);
		const needCategories =
			mode === 'categories' || (mode === 'view' && !tx.category && tx.type !== 'TRANSFER');
		const [extra, categories] = await Promise.all([
			cardExtra(userId, tz, tx),
			needCategories ? store.categories(userId) : ([] as Category[])
		]);
		if (needCategories)
			extra.ask = {
				hint: tx.category ? null : learnableWord(tx.note, categories),
				change: !!tx.category
			};
		extra.footer = FOOTERS[mode];
		await edit(ctx, cardText(tx, tz, extra), cardKeyboard(tx, categories, mode), messageId);
	}

	const NOT_FOUND = T.txGone;

	bot.callbackQuery(/^v:(\w+)$/, async (ctx) => {
		const tx = await store.tx(me(ctx).userId, ctx.match[1]);
		await ctx.answerCallbackQuery(tx ? undefined : { text: NOT_FOUND });
		if (tx) await showCard(ctx, tx);
	});

	bot.callbackQuery(/^cats:(\w+)$/, async (ctx) => {
		const tx = await store.tx(me(ctx).userId, ctx.match[1]);
		await ctx.answerCallbackQuery(tx ? undefined : { text: NOT_FOUND });
		if (tx) await showCard(ctx, tx, 'categories');
	});

	bot.callbackQuery(/^sc:(\w+):(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const [, txId, categoryId] = ctx.match;
		const [tx, categories] = await Promise.all([store.tx(userId, txId), store.categories(userId)]);
		const category = categories.find((c) => c.id === categoryId);
		if (!tx || !category || tx.type === 'TRANSFER') {
			await ctx.answerCallbackQuery({ text: T.txOrCategoryGone });
			return;
		}

		// Запоминаем слово, только если его не узнаёт ни одна категория — иначе это просто исправление.
		const word = CATCH_ALL.has(category.name) ? null : learnableWord(tx.note, categories);
		const updated = await store.updateTx(
			userId,
			tx.id,
			{ categoryId: category.id, type: category.kind },
			word ? { categoryId: category.id, word } : undefined
		);
		if (!updated) {
			await ctx.answerCallbackQuery({ text: NOT_FOUND });
			return;
		}
		await Promise.all([
			ctx.answerCallbackQuery({
				text: word ? T.learned(word, category.name) : plainIconed(category)
			}),
			showCard(ctx, updated)
		]);
	});

	bot.callbackQuery(/^tt:(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const tx = await store.tx(userId, ctx.match[1]);
		if (!tx || tx.type === 'TRANSFER') {
			await ctx.answerCallbackQuery({ text: NOT_FOUND });
			return;
		}
		const type: Kind = tx.type === 'EXPENSE' ? 'INCOME' : 'EXPENSE';
		const updated = await store.updateTx(userId, tx.id, { type, categoryId: null });
		if (!updated) {
			await ctx.answerCallbackQuery({ text: NOT_FOUND });
			return;
		}
		await Promise.all([
			ctx.answerCallbackQuery({ text: type === 'INCOME' ? T.nowIncome : T.nowExpense }),
			showCard(ctx, updated, 'categories')
		]);
	});

	bot.callbackQuery(/^accs:(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const txId = ctx.match[1];
		const [tx, accounts] = await Promise.all([store.tx(userId, txId), store.accounts(userId)]);
		if (!tx || tx.type === 'TRANSFER') {
			await ctx.answerCallbackQuery({ text: NOT_FOUND });
			return;
		}
		await ctx.answerCallbackQuery();
		await ctx
			.editMessageReplyMarkup({
				reply_markup: inline([
					...grid(
						accounts.map((a) =>
							btn(
								plainIconed(a),
								`sa:${txId}:${a.id}`,
								a.id === tx.account.id ? 'primary' : undefined
							)
						)
					),
					[btn(T.back, `v:${txId}`)]
				])
			})
			.catch(ignoreNotModified);
	});

	bot.callbackQuery(/^sa:(\w+):(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const [, txId, accountId] = ctx.match;
		const [tx, accounts] = await Promise.all([store.tx(userId, txId), store.accounts(userId)]);
		const account = accounts.find((a) => a.id === accountId);
		if (!tx || !account || tx.type === 'TRANSFER') {
			await ctx.answerCallbackQuery({ text: T.txOrAccountGone });
			return;
		}
		const updated = await store.updateTx(userId, tx.id, { accountId: account.id });
		if (!updated) {
			await ctx.answerCallbackQuery({ text: NOT_FOUND });
			return;
		}
		await Promise.all([
			ctx.answerCallbackQuery({ text: plainIconed(account) }),
			showCard(ctx, updated)
		]);
	});

	bot.callbackQuery(/^back:(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const tx = await store.tx(userId, ctx.match[1]);
		const updated = tx
			? await store.updateTx(userId, tx.id, {
					occurredAt: new Date(tx.occurredAt.getTime() - DAY_MS)
				})
			: null;
		if (!updated) {
			await ctx.answerCallbackQuery({ text: NOT_FOUND });
			return;
		}
		await Promise.all([
			ctx.answerCallbackQuery({ text: T.movedEarlier }),
			showCard(ctx, updated, 'edit')
		]);
	});

	bot.callbackQuery(/^fwd:(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const tx = await store.tx(userId, ctx.match[1]);
		if (!tx) {
			await ctx.answerCallbackQuery({ text: NOT_FOUND });
			return;
		}
		const later = new Date(tx.occurredAt.getTime() + DAY_MS);
		if (later.getTime() > Date.now()) {
			await ctx.answerCallbackQuery({ text: T.futureDay });
			return;
		}
		const updated = await store.updateTx(userId, tx.id, { occurredAt: later });
		if (!updated) {
			await ctx.answerCallbackQuery({ text: NOT_FOUND });
			return;
		}
		await Promise.all([
			ctx.answerCallbackQuery({ text: T.movedLater }),
			showCard(ctx, updated, 'edit')
		]);
	});

	// ── Правка суммы и описания ─────────────────────────────────────────

	bot.callbackQuery(/^ed:(\w+)$/, async (ctx) => {
		const tx = await store.tx(me(ctx).userId, ctx.match[1]);
		await ctx.answerCallbackQuery(tx ? undefined : { text: NOT_FOUND });
		if (tx) await showCard(ctx, tx, 'edit');
	});

	bot.callbackQuery(/^e([an]):(\w+)$/, async (ctx) => {
		const [, field, txId] = ctx.match;
		const tx = await store.tx(me(ctx).userId, txId);
		if (!tx) {
			await ctx.answerCallbackQuery({ text: NOT_FOUND });
			return;
		}
		// запомним и сообщение с карточкой — обновим его, когда придёт новое значение
		const messageId = ctx.callbackQuery.message?.message_id ?? 0;
		await Promise.all([
			setPendingEdit(ctx, `${field}:${tx.id}:${messageId}`),
			ctx.answerCallbackQuery()
		]);
		await showCard(ctx, tx, field === 'a' ? 'amount' : 'note');
	});

	bot.callbackQuery(/^ec:(\w+)$/, async (ctx) => {
		const updated = await store.updateTx(me(ctx).userId, ctx.match[1], { note: null });
		if (!updated) {
			await ctx.answerCallbackQuery({ text: NOT_FOUND });
			return;
		}
		await Promise.all([ctx.answerCallbackQuery({ text: T.noteCleared }), showCard(ctx, updated)]);
	});

	/** Пришла новая сумма или описание: меняем запись, обновляем карточку, внизу — подтверждение. */
	async function applyEdit(ctx: BotContext, editing: PendingEdit, text: string) {
		let patch: TxPatch;
		if (editing.field === 'a') {
			const entry = parseEntry(text);
			if (!entry || entry.note) {
				await ctx.reply(T.notAmount, { parse_mode: 'HTML' });
				return;
			}
			patch = { amount: entry.amount };
		} else {
			patch = { note: text.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE) };
		}

		const [updated] = await Promise.all([
			store.updateTx(me(ctx).userId, editing.txId, patch),
			clearPending(ctx)
		]);
		if (!updated) {
			await ctx.reply(NOT_FOUND);
			return;
		}
		await showCard(ctx, updated, 'view', editing.messageId);
		await ctx.reply(
			editing.field === 'a'
				? T.amountChanged(signed(updated.type, updated.amount))
				: T.noteChanged(updated.note ?? ''),
			{
				parse_mode: 'HTML',
				...(editing.messageId > 0 && {
					reply_parameters: { message_id: editing.messageId, allow_sending_without_reply: true }
				})
			}
		);
	}

	bot.callbackQuery(/^del:(\w+)$/, async (ctx) => {
		const tx = await store.deleteTx(me(ctx).userId, ctx.match[1]);
		if (!tx) {
			await ctx.answerCallbackQuery({ text: T.alreadyDeleted });
			await ctx.editMessageReplyMarkup().catch(() => {});
			return;
		}
		await Promise.all([ctx.answerCallbackQuery({ text: T.deleted }), edit(ctx, deletedText(tx))]);
	});

	async function askUndo(ctx: BotContext) {
		const { userId, tz } = me(ctx);
		const tx = await store.lastCreated(userId);
		if (!tx) {
			await ctx.reply(T.nothingToUndo);
			return;
		}
		await ctx.reply(`${T.askUndo}\n\n${cardText(tx, tz)}`, {
			parse_mode: 'HTML',
			reply_markup: inline([
				[btn(T.yesDelete, `del:${tx.id}`, 'danger'), btn(T.keep, `v:${tx.id}`)]
			])
		});
	}

	// ── Отчёты: день, месяц, счета, история ─────────────────────────────

	async function showDay(ctx: BotContext, key: string, inPlace = false) {
		const { userId, tz } = me(ctx);
		const txs = await store.between(userId, dayRange(key, tz));
		const today = dayKeyOf(new Date(), tz);
		const prev = addDaysToKey(key, -1);
		const next = addDaysToKey(key, 1);
		const label = (k: string) => formatDayShort(dayRange(k, tz).start, tz);
		const nav = inline([
			[
				btn(`‹ ${label(prev)}`, `d:${prev}`),
				...(key < today
					? [btn(next === today ? T.nextToday : `${label(next)} ›`, `d:${next}`)]
					: [])
			]
		]);
		const text = dayText(key, tz, txs);
		if (inPlace) await edit(ctx, text, nav);
		else await ctx.reply(text, { parse_mode: 'HTML', reply_markup: nav });
	}

	bot.callbackQuery(/^d:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
		const key = ctx.match[1];
		if (!isDayKey(key) || key > dayKeyOf(new Date(), me(ctx).tz)) {
			await ctx.answerCallbackQuery({ text: T.futureDay });
			return;
		}
		await Promise.all([ctx.answerCallbackQuery(), showDay(ctx, key, true)]);
	});

	async function showMonth(ctx: BotContext, key: string, inPlace = false) {
		const { userId, tz } = me(ctx);
		const now = new Date();
		const currentKey = monthKeyOf(now, tz);
		const current = key === currentKey;
		const start = monthRange(key, tz).start;
		const range = current ? { start, end: now } : monthRange(key, tz);

		const prevKey = shiftMonth(key, -1);
		const prevFull = monthRange(prevKey, tz);
		// для текущего месяца — «тот же период» прошлого: столько же времени от начала
		const prevRange = current
			? {
					start: prevFull.start,
					end: new Date(
						Math.min(
							prevFull.start.getTime() + (now.getTime() - start.getTime()),
							prevFull.end.getTime()
						)
					)
				}
			: prevFull;

		const [totals, prev, byCategory, categories] = await Promise.all([
			store.totals(userId, range),
			store.totals(userId, prevRange),
			store.spentByCategory(userId, range),
			store.categories(userId, true)
		]);

		const text = monthText({
			key,
			current,
			day: current ? zonedParts(now, tz).day : daysInMonth(key),
			totals,
			prevExpense: prev.expense,
			byCategory,
			categories
		});
		const nextKey = shiftMonth(key, 1);
		const nav = inline([
			[
				btn(`‹ ${monthName(prevKey)}`, `m:${prevKey}`),
				...(key < currentKey ? [btn(`${monthName(nextKey)} ›`, `m:${nextKey}`)] : [])
			]
		]);
		if (inPlace) await edit(ctx, text, nav);
		else await ctx.reply(text, { parse_mode: 'HTML', reply_markup: nav });
	}

	bot.callbackQuery(/^m:(\d{4}-\d{2})$/, async (ctx) => {
		const key = ctx.match[1];
		if (!isMonthKey(key) || key > monthKeyOf(new Date(), me(ctx).tz)) {
			await ctx.answerCallbackQuery({ text: T.futureMonth });
			return;
		}
		await Promise.all([ctx.answerCallbackQuery(), showMonth(ctx, key, true)]);
	});

	function defaultOf(accounts: Account[]): Account | undefined {
		return accounts.find((a) => a.isDefault) ?? accounts[0];
	}

	async function showBalance(ctx: BotContext, inPlace = false) {
		const { userId } = me(ctx);
		const [accounts, balances] = await Promise.all([
			store.accounts(userId),
			store.balances(userId)
		]);
		const main = defaultOf(accounts);
		const markup =
			accounts.length > 1
				? inline(
						grid(
							accounts.map((a) =>
								a.id === main?.id
									? btn(`✓ ${plainIconed(a)}`, `da:${a.id}`, 'primary')
									: btn(plainIconed(a), `da:${a.id}`)
							)
						)
					)
				: undefined;
		const text = balanceText(accounts, balances);
		if (inPlace) await edit(ctx, text, markup);
		else await ctx.reply(text, { parse_mode: 'HTML', reply_markup: markup });
	}

	bot.callbackQuery(/^da:(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const accounts = await store.accounts(userId);
		const account = accounts.find((a) => a.id === ctx.match[1]);
		if (!account) {
			await ctx.answerCallbackQuery({ text: T.accountGone });
			return;
		}
		if (
			defaultOf(accounts)?.id !== account.id &&
			!(await store.setDefaultAccount(userId, account.id))
		) {
			await ctx.answerCallbackQuery({ text: T.accountGone });
			return;
		}
		await Promise.all([
			ctx.answerCallbackQuery({ text: T.nowRecording(account.name) }),
			showBalance(ctx, true)
		]);
	});

	async function showHistory(ctx: BotContext, skip: number, inPlace = false) {
		const { userId, tz } = me(ctx);
		const rows = await store.recent(userId, skip, HISTORY_PAGE + 1);
		const page = rows.slice(0, HISTORY_PAGE);
		const nav = inline([
			[
				...(skip > 0 ? [btn(T.newer, `h:${Math.max(0, skip - HISTORY_PAGE)}`)] : []),
				...(rows.length > HISTORY_PAGE ? [btn(T.older, `h:${skip + HISTORY_PAGE}`)] : [])
			]
		]);
		const text = historyText(page, skip, tz);
		if (inPlace) await edit(ctx, text, nav);
		else await ctx.reply(text, { parse_mode: 'HTML', reply_markup: nav });
	}

	bot.callbackQuery(/^h:(\d{1,4})$/, async (ctx) => {
		const skip = Number(ctx.match[1]);
		await Promise.all([ctx.answerCallbackQuery(), showHistory(ctx, skip, true)]);
	});

	// ── Всё остальное ───────────────────────────────────────────────────

	// Клавиатура в Telegram живёт на сообщении, которое её прислало: удалили его или
	// очистили историю — кнопки пропали. Ответы «не понял» приносят их обратно.
	bot.on('message:text', (ctx) => ctx.reply(UNKNOWN_COMMAND, { reply_markup: mainKeyboard }));
	bot.on('message', (ctx) =>
		ctx.reply(ONLY_TEXT, { parse_mode: 'HTML', reply_markup: mainKeyboard })
	);
	bot.on('callback_query:data', (ctx) => ctx.answerCallbackQuery({ text: T.staleButton }));

	bot.catch((err) => {
		console.error(`[bot] ошибка в обновлении ${err.ctx.update.update_id}:`, err.error);
	});

	return bot;
}

// ── Помощники ───────────────────────────────────────────────────────────

/** Telegram ругается, если отредактировать сообщение тем же самым текстом, — это не ошибка. */
function ignoreNotModified(err: unknown) {
	if (err instanceof GrammyError && err.description.includes('message is not modified')) return;
	throw err;
}

/**
 * Обновить сообщение на месте: то, под которым нажали кнопку, или messageId
 * (0 — неизвестно какое, сразу шлём новым). Если его уже нельзя править
 * (старше 48 часов или удалено) — пришлём новым сообщением, чтобы ничего не пропало.
 */
async function edit(
	ctx: Context,
	text: string,
	reply_markup?: InlineKeyboardMarkup,
	messageId?: number
) {
	try {
		if (messageId === 0) await ctx.reply(text, { parse_mode: 'HTML', reply_markup });
		else if (messageId)
			await ctx.api.editMessageText(ctx.chat!.id, messageId, text, {
				parse_mode: 'HTML',
				reply_markup
			});
		else await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup });
	} catch (err) {
		if (!(err instanceof GrammyError)) throw err;
		if (err.description.includes('message is not modified')) return;
		if (/message to edit not found|message can't be edited/.test(err.description)) {
			await ctx.reply(text, { parse_mode: 'HTML', reply_markup });
			return;
		}
		throw err;
	}
}

async function tellFailure(ctx: Context) {
	try {
		if (ctx.callbackQuery) {
			await ctx.answerCallbackQuery({ text: FAILED, show_alert: true });
			return;
		}
	} catch {
		// на нажатие уже ответили — скажем в чат
	}
	try {
		if (ctx.chat) await ctx.reply(FAILED);
	} catch {
		// Telegram тоже недоступен — остаётся запись в логе
	}
}
