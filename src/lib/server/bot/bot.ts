import { Bot, GrammyError, InlineKeyboard, Keyboard, type Context } from 'grammy';
import type { InlineKeyboardButton } from 'grammy/types';
import type { PrismaClient } from '../prisma/client.ts';
import type { CategoryKind } from '../prisma/enums.ts';
import { formatMoney, percentChange } from '../../money.ts';
import {
	DAY_MS,
	dayKeyOf,
	dayRange,
	formatDay,
	formatTime,
	formatWhen,
	monthKeyOf,
	monthPrep,
	monthRange,
	monthTitle,
	shiftMonth,
	zonedParts
} from '../../date.ts';
import { learnableWord, matchCategory } from '../finance/categorize.ts';
import { initializeUser } from '../finance/defaults.ts';
import { accountBalances, totalsByCategory, totalsByType } from '../finance/stats.ts';
import { parseEntry } from './parse.ts';
import { iconEmoji } from '../../icon-keys.ts';

type Linked = {
	userId: string;
	telegramId: bigint;
	tz: string;
	pendingCategoryId: string | null;
	pendingAt: Date | null;
};

export type BotContext = Context & { linked?: Linked };

export const BUTTONS = {
	expense: '➖ Расход',
	income: '➕ Доход',
	today: '📊 Сегодня',
	month: '📅 Месяц',
	balance: '💰 Баланс',
	last: '🕘 Последние'
} as const;

export const COMMANDS = [
	{ command: 'today', description: 'Операции за сегодня' },
	{ command: 'month', description: 'Итоги месяца' },
	{ command: 'balance', description: 'Остатки по счетам' },
	{ command: 'last', description: 'Последние 10 операций' },
	{ command: 'undo', description: 'Удалить последнюю операцию' },
	{ command: 'categories', description: 'Категории и слова, по которым я их узнаю' },
	{ command: 'help', description: 'Как пользоваться' }
];

/** Сколько ждём сумму после выбора категории кнопкой. */
const PENDING_TTL_MS = 15 * 60_000;

const mainKeyboard = new Keyboard()
	.text(BUTTONS.expense)
	.text(BUTTONS.income)
	.row()
	.text(BUTTONS.today)
	.text(BUTTONS.month)
	.row()
	.text(BUTTONS.balance)
	.text(BUTTONS.last)
	.resized()
	.persistent();

const HELP = [
	'<b>Как записать операцию</b>',
	'Напиши сумму и на что — категорию я узнаю сам:',
	'<code>250 продукты</code>',
	'<code>кофе 65</code>',
	'<code>вчера такси 180</code>',
	'<code>+30000 зарплата</code> — плюс перед суммой = доход',
	'',
	'Или нажми «➖ Расход» / «➕ Доход», выбери категорию и отправь сумму.',
	'',
	'Под каждой записью есть кнопки: сменить категорию или счёт, сдвинуть на день назад, удалить. ',
	'Если я не узнал категорию — выбери её кнопкой, и я запомню слово на будущее.',
	'',
	'/today — сегодня · /month — месяц · /balance — счета · /last — последние · /undo — отменить'
].join('\n');

const NOT_LINKED = [
	'👋 Это бот учёта доходов и расходов.',
	'',
	'Чтобы записывать траты, привяжи аккаунт: открой CRM → <b>Настройки</b> → <b>Telegram</b> → «Подключить» и перейди по ссылке.'
].join('\n');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const btn = (label: string, data: string) => InlineKeyboard.text(label, data);

function grid(buttons: InlineKeyboardButton[], cols = 2): InlineKeyboardButton[][] {
	const rows: InlineKeyboardButton[][] = [];
	for (let i = 0; i < buttons.length; i += cols) rows.push(buttons.slice(i, i + cols));
	return rows;
}

function signed(type: string, amount: number): string {
	if (type === 'INCOME') return `+${formatMoney(amount)}`;
	if (type === 'EXPENSE') return `−${formatMoney(amount)}`;
	return formatMoney(amount);
}

/** Telegram ругается, если отредактировать сообщение тем же самым текстом, — это не ошибка. */
function ignoreNotModified(err: unknown) {
	if (err instanceof GrammyError && err.description.includes('message is not modified')) return;
	throw err;
}

export function createBot(token: string, db: PrismaClient): Bot<BotContext> {
	const bot = new Bot<BotContext>(token);

	// ── Доступ ──────────────────────────────────────────────────────────

	// Только личка: в группах пишут посторонние.
	bot.use(async (ctx, next) => {
		if (ctx.chat?.type === 'private' && ctx.from) await next();
	});

	bot.command('start', async (ctx) => {
		const telegramId = BigInt(ctx.from!.id);
		const code = ctx.match.trim();

		if (code) {
			const row = await db.telegramLinkCode.findUnique({ where: { code } });
			if (!row || row.expiresAt.getTime() < Date.now()) {
				await ctx.reply(
					'⛔ Ссылка устарела или уже использована. Получи новую в CRM → Настройки → Telegram.'
				);
				return;
			}
			const profile = {
				username: ctx.from!.username ?? null,
				firstName: ctx.from!.first_name ?? null
			};
			await db.$transaction([
				db.telegramLink.upsert({
					where: { telegramId },
					create: { telegramId, userId: row.userId, ...profile },
					update: { userId: row.userId, ...profile, pendingCategoryId: null, pendingAt: null }
				}),
				db.telegramLinkCode.delete({ where: { code } })
			]);
			await initializeUser(db, row.userId);
			await ctx.reply(`✅ Аккаунт привязан!\n\n${HELP}`, {
				parse_mode: 'HTML',
				reply_markup: mainKeyboard
			});
			return;
		}

		const link = await db.telegramLink.findUnique({ where: { telegramId } });
		await ctx.reply(link ? HELP : NOT_LINKED, {
			parse_mode: 'HTML',
			reply_markup: link ? mainKeyboard : { remove_keyboard: true }
		});
	});

	// Всё остальное — только для привязанных аккаунтов.
	bot.use(async (ctx, next) => {
		const link = await db.telegramLink.findUnique({
			where: { telegramId: BigInt(ctx.from!.id) },
			include: { user: { select: { timezone: true, initializedAt: true } } }
		});
		if (!link) {
			if (ctx.callbackQuery) await ctx.answerCallbackQuery();
			await ctx.reply(NOT_LINKED, { parse_mode: 'HTML' });
			return;
		}
		if (!link.user.initializedAt) await initializeUser(db, link.userId);
		ctx.linked = {
			userId: link.userId,
			telegramId: link.telegramId,
			tz: link.user.timezone,
			pendingCategoryId: link.pendingCategoryId,
			pendingAt: link.pendingAt
		};
		await next();
	});

	const me = (ctx: BotContext) => ctx.linked!;

	const categoriesOf = (userId: string, kind?: CategoryKind) =>
		db.category.findMany({
			where: { userId, archived: false, ...(kind && { kind }) },
			orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
		});

	const defaultAccount = (userId: string) =>
		db.account.findFirst({
			where: { userId, archived: false },
			orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }]
		});

	const setPending = (telegramId: bigint, categoryId: string | null) =>
		db.telegramLink.update({
			where: { telegramId },
			data: { pendingCategoryId: categoryId, pendingAt: categoryId ? new Date() : null }
		});

	// ── Карточка операции ───────────────────────────────────────────────

	async function categoryButtons(userId: string, kind: CategoryKind, data: (id: string) => string) {
		const cats = await categoriesOf(userId, kind);
		return grid(cats.map((c) => btn(`${iconEmoji(c.icon)} ${c.name}`, data(c.id))));
	}

	/** Текст и кнопки для операции. null — операции нет (удалили в CRM или чужая). */
	async function txCard(
		userId: string,
		tz: string,
		id: string,
		mode: 'view' | 'categories' = 'view'
	) {
		const tx = await db.transaction.findFirst({
			where: { id, userId },
			include: { category: true, account: true, toAccount: true }
		});
		if (!tx) return null;

		const title = tx.category
			? `${iconEmoji(tx.category.icon)} ${esc(tx.category.name)}`
			: tx.type === 'TRANSFER'
				? `🔄 Перевод → ${esc(tx.toAccount?.name ?? '?')}`
				: '❓ <i>без категории</i>';

		const lines = [
			`✅ <b>${signed(tx.type, tx.amount)}</b> · ${title}`,
			`${iconEmoji(tx.account.icon)} ${esc(tx.account.name)} · ${formatWhen(tx.occurredAt, tz)}`
		];
		if (tx.note) lines.push(`📝 ${esc(tx.note)}`);

		const month = monthKeyOf(tx.occurredAt, tz);
		if (tx.category && tx.type === 'EXPENSE') {
			const spent = await db.transaction.aggregate({
				where: {
					userId,
					type: 'EXPENSE',
					categoryId: tx.category.id,
					occurredAt: { gte: monthRange(month, tz).start, lt: monthRange(month, tz).end }
				},
				_sum: { amount: true }
			});
			const total = spent._sum.amount ?? 0;
			const budget = tx.category.monthlyBudget;
			let line = `\n📊 В ${monthPrep(month)} на «${esc(tx.category.name)}»: <b>${formatMoney(total)}</b>`;
			if (budget) {
				const pct = Math.round((total / budget) * 100);
				line += ` из ${formatMoney(budget)} (${pct}%)`;
				if (total > budget) line += `\n⚠️ Лимит превышен на ${formatMoney(total - budget)}`;
			}
			lines.push(line);
		}

		const rows: InlineKeyboardButton[][] = [];
		const kind: CategoryKind = tx.type === 'INCOME' ? 'INCOME' : 'EXPENSE';

		if (tx.type !== 'TRANSFER' && (mode === 'categories' || !tx.category)) {
			if (!tx.category) {
				const hint = learnableWord(tx.note, await categoriesOf(userId));
				lines.push(
					`\n👇 Выбери категорию${hint ? ` — запомню, что «${esc(hint)}» значит она` : ''}`
				);
			}
			rows.push(...(await categoryButtons(userId, kind, (c) => `sc:${tx.id}:${c}`)));
			rows.push([
				btn(kind === 'EXPENSE' ? '↔️ Это доход' : '↔️ Это расход', `tt:${tx.id}`),
				tx.category ? btn('« Назад', `v:${tx.id}`) : btn('🗑 Удалить', `del:${tx.id}`)
			]);
		} else {
			rows.push(
				tx.type === 'TRANSFER'
					? [btn('⏪ −1 день', `back:${tx.id}`)]
					: [btn('🏷 Категория', `cats:${tx.id}`), btn('💳 Счёт', `accs:${tx.id}`)]
			);
			rows.push(
				tx.type === 'TRANSFER'
					? [btn('🗑 Удалить', `del:${tx.id}`)]
					: [btn('⏪ −1 день', `back:${tx.id}`), btn('🗑 Удалить', `del:${tx.id}`)]
			);
		}

		return { text: lines.join('\n'), reply_markup: InlineKeyboard.from(rows) };
	}

	async function editCard(ctx: BotContext, id: string, mode: 'view' | 'categories' = 'view') {
		const { userId, tz } = me(ctx);
		const card = await txCard(userId, tz, id, mode);
		if (!card) {
			await ctx.answerCallbackQuery({ text: 'Операция не найдена — возможно, её удалили' });
			return;
		}
		await ctx
			.editMessageText(card.text, { parse_mode: 'HTML', reply_markup: card.reply_markup })
			.catch(ignoreNotModified);
	}

	// ── Ввод операций ───────────────────────────────────────────────────

	async function askCategory(ctx: BotContext, kind: CategoryKind) {
		const { userId } = me(ctx);
		const rows = await categoryButtons(userId, kind, (c) => `pick:${c}`);
		await ctx.reply(kind === 'EXPENSE' ? '➖ На что потратил?' : '➕ Откуда доход?', {
			reply_markup: InlineKeyboard.from(rows)
		});
	}

	// Кнопки нижней клавиатуры — до общего обработчика текста, иначе он примет их за ввод суммы.
	bot.hears(BUTTONS.expense, (ctx) => askCategory(ctx, 'EXPENSE'));
	bot.hears(BUTTONS.income, (ctx) => askCategory(ctx, 'INCOME'));
	bot.hears(BUTTONS.today, today);
	bot.hears(BUTTONS.month, month);
	bot.hears(BUTTONS.balance, balance);
	bot.hears(BUTTONS.last, last);

	bot.callbackQuery(/^pick:(\w+)$/, async (ctx) => {
		const { userId, telegramId } = me(ctx);
		const category = await db.category.findFirst({ where: { id: ctx.match[1], userId } });
		if (!category) {
			await ctx.answerCallbackQuery({ text: 'Категория не найдена' });
			return;
		}
		await setPending(telegramId, category.id);
		await ctx.answerCallbackQuery();
		await ctx.editMessageText(
			`${iconEmoji(category.icon)} <b>${esc(category.name)}</b> — сколько?\nОтправь сумму, можно с комментарием: <code>250 хлеб, молоко</code>`,
			{ parse_mode: 'HTML', reply_markup: InlineKeyboard.from([[btn('✖ Отмена', 'unpick')]]) }
		);
	});

	bot.callbackQuery('unpick', async (ctx) => {
		await setPending(me(ctx).telegramId, null);
		await ctx.answerCallbackQuery({ text: 'Отменено' });
		await ctx.deleteMessage().catch(() => {});
	});

	bot.on('message:text', async (ctx, next) => {
		const text = ctx.message.text;
		if (text.startsWith('/')) return next();

		const { userId, tz, telegramId, pendingCategoryId, pendingAt } = me(ctx);
		const entry = parseEntry(text);
		if (!entry) {
			await ctx.reply(
				'Не нашёл сумму 🤔 Напиши, например: <code>250 продукты</code> или <code>+30000 зарплата</code>.\n/help — подробнее',
				{ parse_mode: 'HTML' }
			);
			return;
		}

		const categories = await categoriesOf(userId);
		const expense = categories.filter((c) => c.kind === 'EXPENSE');
		const income = categories.filter((c) => c.kind === 'INCOME');

		const pendingAlive =
			pendingCategoryId && pendingAt && Date.now() - pendingAt.getTime() < PENDING_TTL_MS;
		let category = pendingAlive
			? (categories.find((c) => c.id === pendingCategoryId) ?? null)
			: null;

		if (!category && entry.note) {
			if (entry.sign === '+') category = matchCategory(entry.note, income);
			else {
				category = matchCategory(entry.note, expense);
				// «зарплата 30000» без плюса — всё равно доход
				if (!category && entry.sign === null) category = matchCategory(entry.note, income);
			}
		}

		const account = await defaultAccount(userId);
		if (!account) {
			await ctx.reply('Нет ни одного активного счёта — создай его в CRM → Счета.');
			return;
		}

		const type = category ? category.kind : entry.sign === '+' ? 'INCOME' : 'EXPENSE';
		const occurredAt = new Date(ctx.message.date * 1000 - entry.daysAgo * DAY_MS);

		const tx = await db.transaction.create({
			data: {
				userId,
				type,
				amount: entry.amount,
				occurredAt,
				accountId: account.id,
				categoryId: category?.id ?? null,
				note: entry.note || null,
				source: 'TELEGRAM'
			}
		});
		if (pendingCategoryId) await setPending(telegramId, null);

		const card = await txCard(userId, tz, tx.id);
		await ctx.reply(card!.text, { parse_mode: 'HTML', reply_markup: card!.reply_markup });
	});

	// ── Кнопки под операцией ────────────────────────────────────────────

	bot.callbackQuery(/^v:(\w+)$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		await editCard(ctx, ctx.match[1]);
	});

	bot.callbackQuery(/^cats:(\w+)$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		await editCard(ctx, ctx.match[1], 'categories');
	});

	bot.callbackQuery(/^sc:(\w+):(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const [, txId, categoryId] = ctx.match;
		const [tx, category] = await Promise.all([
			db.transaction.findFirst({ where: { id: txId, userId } }),
			db.category.findFirst({ where: { id: categoryId, userId } })
		]);
		if (!tx || !category || tx.type === 'TRANSFER') {
			await ctx.answerCallbackQuery({ text: 'Операция или категория не найдена' });
			return;
		}

		// Запоминаем слово, только если его не узнаёт ни одна категория — иначе это просто исправление.
		const word =
			category.name === 'Другое' ? null : learnableWord(tx.note, await categoriesOf(userId));

		await db.$transaction([
			db.transaction.update({
				where: { id: tx.id },
				data: { categoryId: category.id, type: category.kind }
			}),
			...(word
				? [db.category.update({ where: { id: category.id }, data: { keywords: { push: word } } })]
				: [])
		]);

		await ctx.answerCallbackQuery({
			text: word
				? `Запомнил: «${word}» → ${category.name}`
				: `${iconEmoji(category.icon)} ${category.name}`
		});
		await editCard(ctx, tx.id);
	});

	bot.callbackQuery(/^tt:(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const tx = await db.transaction.findFirst({ where: { id: ctx.match[1], userId } });
		if (!tx || tx.type === 'TRANSFER') {
			await ctx.answerCallbackQuery({ text: 'Операция не найдена' });
			return;
		}
		await db.transaction.update({
			where: { id: tx.id },
			data: { type: tx.type === 'EXPENSE' ? 'INCOME' : 'EXPENSE', categoryId: null }
		});
		await ctx.answerCallbackQuery({
			text: tx.type === 'EXPENSE' ? 'Теперь это доход' : 'Теперь это расход'
		});
		await editCard(ctx, tx.id, 'categories');
	});

	bot.callbackQuery(/^accs:(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const txId = ctx.match[1];
		const accounts = await db.account.findMany({
			where: { userId, archived: false },
			orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
		});
		await ctx.answerCallbackQuery();
		await ctx
			.editMessageReplyMarkup({
				reply_markup: InlineKeyboard.from([
					...grid(accounts.map((a) => btn(`${iconEmoji(a.icon)} ${a.name}`, `sa:${txId}:${a.id}`))),
					[btn('« Назад', `v:${txId}`)]
				])
			})
			.catch(ignoreNotModified);
	});

	bot.callbackQuery(/^sa:(\w+):(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const [, txId, accountId] = ctx.match;
		const account = await db.account.findFirst({ where: { id: accountId, userId } });
		const { count } = account
			? await db.transaction.updateMany({
					where: { id: txId, userId, type: { not: 'TRANSFER' } },
					data: { accountId }
				})
			: { count: 0 };
		await ctx.answerCallbackQuery({
			text: count ? `${iconEmoji(account!.icon)} ${account!.name}` : 'Не получилось'
		});
		await editCard(ctx, txId);
	});

	bot.callbackQuery(/^back:(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const tx = await db.transaction.findFirst({ where: { id: ctx.match[1], userId } });
		if (!tx) {
			await ctx.answerCallbackQuery({ text: 'Операция не найдена' });
			return;
		}
		await db.transaction.update({
			where: { id: tx.id },
			data: { occurredAt: new Date(tx.occurredAt.getTime() - DAY_MS) }
		});
		await ctx.answerCallbackQuery({ text: 'Сдвинул на день назад' });
		await editCard(ctx, tx.id);
	});

	bot.callbackQuery(/^del:(\w+)$/, async (ctx) => {
		const { userId } = me(ctx);
		const tx = await db.transaction.findFirst({
			where: { id: ctx.match[1], userId },
			include: { category: true }
		});
		if (!tx) {
			await ctx.answerCallbackQuery({ text: 'Уже удалено' });
			await ctx.editMessageReplyMarkup().catch(() => {});
			return;
		}
		await db.transaction.delete({ where: { id: tx.id } });
		await ctx.answerCallbackQuery({ text: 'Удалено' });
		const what = tx.category ? ` · ${iconEmoji(tx.category.icon)} ${esc(tx.category.name)}` : '';
		await ctx.editMessageText(`🗑 Удалено: <s>${signed(tx.type, tx.amount)}</s>${what}`, {
			parse_mode: 'HTML'
		});
	});

	// ── Отчёты ──────────────────────────────────────────────────────────

	async function today(ctx: BotContext) {
		const { userId, tz } = me(ctx);
		const range = dayRange(dayKeyOf(new Date(), tz), tz);
		const txs = await db.transaction.findMany({
			where: { userId, occurredAt: { gte: range.start, lt: range.end } },
			include: { category: true },
			orderBy: { occurredAt: 'asc' }
		});

		if (txs.length === 0) {
			await ctx.reply(
				'📊 Сегодня операций пока нет.\nНапиши, например: <code>250 продукты</code>',
				{
					parse_mode: 'HTML'
				}
			);
			return;
		}

		const spent = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
		const earned = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
		const lines = [`📊 <b>Сегодня, ${formatDay(new Date(), tz)}</b>`, ''];
		for (const t of txs) {
			const cat = t.category
				? `${iconEmoji(t.category.icon)} ${esc(t.category.name)}`
				: t.type === 'TRANSFER'
					? '🔄 Перевод'
					: '❓';
			lines.push(
				`${formatTime(t.occurredAt, tz)}  ${cat} — <b>${signed(t.type, t.amount)}</b>${t.note ? ` · ${esc(t.note)}` : ''}`
			);
		}
		lines.push('', `➖ Расходы: <b>${formatMoney(spent)}</b>`);
		if (earned) lines.push(`➕ Доходы: <b>${formatMoney(earned)}</b>`);
		await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
	}

	async function month(ctx: BotContext) {
		const { userId, tz } = me(ctx);
		const now = new Date();
		const key = monthKeyOf(now, tz);
		const range = { start: monthRange(key, tz).start, end: now };
		const prevKey = shiftMonth(key, -1);
		const prevStart = monthRange(prevKey, tz).start;
		// «тот же период» прошлого месяца: столько же времени от его начала
		const prevSame = {
			start: prevStart,
			end: new Date(
				Math.min(
					prevStart.getTime() + (now.getTime() - range.start.getTime()),
					monthRange(prevKey, tz).end.getTime()
				)
			)
		};

		const [totals, prev, byCat, cats] = await Promise.all([
			totalsByType(db, userId, range),
			totalsByType(db, userId, prevSame),
			totalsByCategory(db, userId, range, 'EXPENSE'),
			db.category.findMany({ where: { userId } })
		]);
		const catById = new Map(cats.map((c) => [c.id, c]));
		const net = totals.income - totals.expense;
		const day = zonedParts(now, tz).day;

		const lines = [
			`📅 <b>${monthTitle(key)}</b> · 1–${day} число`,
			'',
			`➕ Доходы: <b>${formatMoney(totals.income)}</b>`,
			`➖ Расходы: <b>${formatMoney(totals.expense)}</b>`,
			`💰 Остаток: <b>${formatMoney(net, { sign: true })}</b>`
		];

		const ranked = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
		if (ranked.length) {
			lines.push('', '<b>Куда ушли деньги:</b>');
			for (const [id, sum] of ranked.slice(0, 10)) {
				const c = id ? catById.get(id) : null;
				const share = totals.expense ? Math.round((sum / totals.expense) * 100) : 0;
				lines.push(
					`${c ? `${iconEmoji(c.icon)} ${esc(c.name)}` : '❓ Без категории'} — ${formatMoney(sum)} · ${share}%`
				);
			}
			if (ranked.length > 10) lines.push(`…и ещё ${ranked.length - 10}`);
		}

		const over = ranked
			.map(([id, sum]) => ({ c: id ? catById.get(id) : null, sum }))
			.filter((x) => x.c?.monthlyBudget && x.sum > x.c.monthlyBudget);
		if (over.length) {
			lines.push('', '⚠️ <b>Превышены лимиты:</b>');
			for (const { c, sum } of over)
				lines.push(
					`${iconEmoji(c!.icon)} ${esc(c!.name)}: ${formatMoney(sum)} из ${formatMoney(c!.monthlyBudget!)}`
				);
		}

		const change = percentChange(totals.expense, prev.expense);
		if (change !== null) {
			const word = change > 0 ? 'больше' : 'меньше';
			lines.push(
				'',
				`За 1–${day} число прошлого месяца ушло ${formatMoney(prev.expense)} — сейчас на ${Math.abs(Math.round(change))}% ${word}.`
			);
		}

		await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
	}

	async function balance(ctx: BotContext) {
		const { userId } = me(ctx);
		const [accounts, balances] = await Promise.all([
			db.account.findMany({
				where: { userId, archived: false },
				orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
			}),
			accountBalances(db, userId)
		]);
		const total = accounts.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
		const lines = ['💰 <b>Остатки</b>', ''];
		for (const a of accounts)
			lines.push(
				`${iconEmoji(a.icon)} ${esc(a.name)}: <b>${formatMoney(balances.get(a.id) ?? 0)}</b>`
			);
		lines.push('', `Всего: <b>${formatMoney(total)}</b>`);
		await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
	}

	async function last(ctx: BotContext) {
		const { userId, tz } = me(ctx);
		const txs = await db.transaction.findMany({
			where: { userId },
			include: { category: true },
			orderBy: { occurredAt: 'desc' },
			take: 10
		});
		if (txs.length === 0) {
			await ctx.reply('Операций пока нет.');
			return;
		}
		const lines = ['🕘 <b>Последние операции</b>', ''];
		for (const t of txs) {
			const cat = t.category
				? `${iconEmoji(t.category.icon)} ${esc(t.category.name)}`
				: t.type === 'TRANSFER'
					? '🔄 Перевод'
					: '❓';
			lines.push(
				`${formatWhen(t.occurredAt, tz)} · ${cat} — <b>${signed(t.type, t.amount)}</b>${t.note ? ` · ${esc(t.note)}` : ''}`
			);
		}
		await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
	}

	async function categoriesList(ctx: BotContext) {
		const cats = await categoriesOf(me(ctx).userId);
		const block = (kind: CategoryKind) =>
			cats
				.filter((c) => c.kind === kind)
				.map((c) => {
					const words = c.keywords.slice(0, 6).join(', ');
					return `${iconEmoji(c.icon)} <b>${esc(c.name)}</b>${words ? ` — ${esc(words)}${c.keywords.length > 6 ? '…' : ''}` : ''}`;
				})
				.join('\n');
		await ctx.reply(
			`<b>Расходы</b>\n${block('EXPENSE')}\n\n<b>Доходы</b>\n${block('INCOME')}\n\nКлючевые слова можно править в CRM → Категории.`,
			{ parse_mode: 'HTML' }
		);
	}

	bot.command('help', (ctx) => ctx.reply(HELP, { parse_mode: 'HTML', reply_markup: mainKeyboard }));
	bot.command('today', today);
	bot.command('month', month);
	bot.command('balance', balance);
	bot.command('last', last);
	bot.command('categories', categoriesList);

	bot.command('undo', async (ctx) => {
		const { userId, tz } = me(ctx);
		const lastTx = await db.transaction.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' }
		});
		if (!lastTx) {
			await ctx.reply('Удалять нечего — операций нет.');
			return;
		}
		const card = await txCard(userId, tz, lastTx.id);
		await ctx.reply(`Удалить последнюю запись?\n\n${card!.text}`, {
			parse_mode: 'HTML',
			reply_markup: InlineKeyboard.from([
				[btn('🗑 Да, удалить', `del:${lastTx.id}`), btn('Оставить', `v:${lastTx.id}`)]
			])
		});
	});

	bot.on('message:text', (ctx) => ctx.reply('Не знаю такой команды. /help — что я умею'));
	bot.on('message', (ctx) =>
		ctx.reply('Я понимаю только текст: напиши сумму и на что, например <code>250 продукты</code>', {
			parse_mode: 'HTML'
		})
	);
	bot.on('callback_query:data', (ctx) => ctx.answerCallbackQuery({ text: 'Кнопка устарела' }));

	bot.catch((err) => {
		console.error(`[bot] ошибка в обновлении ${err.ctx.update.update_id}:`, err.error);
	});

	return bot;
}
