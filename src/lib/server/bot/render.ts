/**
 * Тексты бота. Чистые функции: данные на входе — HTML для Telegram на выходе,
 * без базы и сети. Пользовательский текст (комментарии, названия) всегда
 * проходит через esc().
 */
import { formatMoney, percentChange } from '../../money.ts';
import {
	dayHeading,
	dayKeyOf,
	dayRange,
	formatDay,
	formatTime,
	formatWhen,
	monthPrep,
	monthTitle,
	shiftMonth
} from '../../date.ts';
import { iconEmoji } from '../../icon-keys.ts';
import { ACTIONS, COMMAND_ORDER } from './ui.ts';
import type { Account, Category, Tx, TxType } from './store.ts';

/** Предел Telegram на длину сообщения. */
export const MAX_TEXT = 4096;

export const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** −250 ₴ / +30 000 ₴ / 5 000 ₴ (перевод) */
export function signed(type: TxType, amount: number): string {
	if (type === 'INCOME') return `+${formatMoney(amount)}`;
	if (type === 'EXPENSE') return `−${formatMoney(amount)}`;
	return formatMoney(amount);
}

export const iconed = (x: { icon: string; name: string }) => `${iconEmoji(x.icon)} ${esc(x.name)}`;

/** Подпись для кнопки — без HTML: Telegram показывает текст кнопок как есть. */
export const plainIconed = (x: { icon: string; name: string }) => `${iconEmoji(x.icon)} ${x.name}`;

/** «🍏 Продукты» / «🔄 Перевод → Накопления» / «❓ без категории» */
export function txLabel(tx: Pick<Tx, 'type' | 'category' | 'toAccount'>): string {
	if (tx.type === 'TRANSFER') return `🔄 Перевод → ${esc(tx.toAccount?.name ?? '?')}`;
	if (tx.category) return iconed(tx.category);
	return '❓ <i>без категории</i>';
}

/** Полоска лимита из 10 клеток: «▰▰▰▰▰▰▰▱▱▱ 69%». */
export function budgetBar(spent: number, budget: number): string {
	const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
	const filled = Math.max(0, Math.min(10, Math.round(pct / 10)));
	return `${'▰'.repeat(filled)}${'▱'.repeat(10 - filled)} ${pct}%`;
}

/** Обрезает слишком длинное сообщение по границе строки. */
export function clip(text: string, max = MAX_TEXT): string {
	if (text.length <= max) return text;
	const cut = text.lastIndexOf('\n', max - 2);
	return `${text.slice(0, cut > 0 ? cut : max - 2)}\n…`;
}

// ── Карточка операции ───────────────────────────────────────────────────

export type CardExtra = {
	/** расходы категории за месяц операции, вместе с ней */
	spent?: number;
	monthKey?: string;
	/** просим выбрать категорию — с подсказкой, какое слово запомним */
	ask?: { hint: string | null; change: boolean };
};

export function cardText(tx: Tx, tz: string, extra: CardExtra = {}): string {
	const mark = tx.type !== 'TRANSFER' && !tx.category ? '❓' : '✅';
	const head =
		tx.type !== 'TRANSFER' && !tx.category
			? `${mark} <b>${signed(tx.type, tx.amount)}</b> · <i>без категории</i>`
			: `${mark} <b>${signed(tx.type, tx.amount)}</b> · ${txLabel(tx)}`;

	const lines = [head, `${iconed(tx.account)} · ${formatWhen(tx.occurredAt, tz)}`];
	if (tx.note) lines.push(`📝 ${esc(tx.note)}`);

	const category = tx.category;
	if (category && tx.type === 'EXPENSE' && extra.spent !== undefined && extra.monthKey) {
		const budget = category.monthlyBudget;
		lines.push(
			'',
			`📊 В ${monthPrep(extra.monthKey)} на «${esc(category.name)}»: <b>${formatMoney(extra.spent)}</b>${budget ? ` из ${formatMoney(budget)}` : ''}`
		);
		if (budget) {
			lines.push(budgetBar(extra.spent, budget));
			if (extra.spent > budget)
				lines.push(`⚠️ Лимит превышен на ${formatMoney(extra.spent - budget)}`);
		}
	}

	if (extra.ask) {
		const { hint, change } = extra.ask;
		lines.push(
			'',
			change
				? '👇 Выбери новую категорию'
				: `👇 Выбери категорию${hint ? ` — запомню, что «${esc(hint)}» значит она` : ''}`
		);
	}
	return lines.join('\n');
}

export function deletedText(tx: Tx): string {
	return `❌ Удалено: <s>${signed(tx.type, tx.amount)}</s> · ${txLabel(tx)}${tx.note ? ` · ${esc(tx.note)}` : ''}`;
}

// ── Ввод кнопками ───────────────────────────────────────────────────────

export function askCategoryText(kind: 'EXPENSE' | 'INCOME'): string {
	return kind === 'EXPENSE'
		? '🔴 <b>Расход</b> — на что?\nВыбери категорию или сразу напиши: <code>250 продукты</code>'
		: '🟢 <b>Доход</b> — откуда?\nВыбери категорию или сразу напиши: <code>+30000 зарплата</code>';
}

export function askAmountText(category: Category): string {
	const sample = category.kind === 'INCOME' ? '30000 аванс' : '250 хлеб, молоко';
	return `${iconed(category)} — <b>сколько?</b>\nОтправь сумму, можно с комментарием: <code>${sample}</code>`;
}

// ── Отчёты ──────────────────────────────────────────────────────────────

function txLine(t: Tx, when: string): string {
	return `${when} · ${txLabel(t)} — <b>${signed(t.type, t.amount)}</b>${t.note ? ` · ${esc(t.note)}` : ''}`;
}

function sums(txs: Tx[]) {
	let expense = 0;
	let income = 0;
	for (const t of txs) {
		if (t.type === 'EXPENSE') expense += t.amount;
		else if (t.type === 'INCOME') income += t.amount;
	}
	return { expense, income };
}

/** «Сегодня, 3 ноября» / «Вчера, 2 ноября» / «Понедельник, 1 ноября» */
export function dayTitle(key: string, tz: string): string {
	const heading = dayHeading(key, tz);
	if (heading !== 'Сегодня' && heading !== 'Вчера') return heading;
	return `${heading}, ${formatDay(dayRange(key, tz).start, tz)}`;
}

export function dayText(key: string, tz: string, txs: Tx[]): string {
	const lines = [`📊 <b>${dayTitle(key, tz)}</b>`, ''];
	if (txs.length === 0) {
		lines.push(
			key === dayKeyOf(new Date(), tz)
				? 'Операций пока нет. Напиши, например: <code>250 продукты</code>'
				: 'В этот день операций нет.'
		);
		return lines.join('\n');
	}
	for (const t of txs) lines.push(txLine(t, formatTime(t.occurredAt, tz)));
	const { expense, income } = sums(txs);
	lines.push('', `🔴 Расходы: <b>${formatMoney(expense)}</b>`);
	if (income) lines.push(`🟢 Доходы: <b>${formatMoney(income)}</b>`);
	return clip(lines.join('\n'));
}

export type MonthData = {
	key: string;
	/** месяц ещё идёт — считаем «1–N число» и сравниваем с тем же периодом */
	current: boolean;
	/** последний учтённый день месяца (для текущего — сегодня) */
	day: number;
	totals: { income: number; expense: number };
	prevExpense: number;
	byCategory: Map<string | null, number>;
	categories: Category[];
};

export function monthText(m: MonthData): string {
	const net = m.totals.income - m.totals.expense;
	const lines = [
		`📅 <b>${monthTitle(m.key)}</b>${m.current ? ` · 1–${m.day} число` : ''}`,
		'',
		`🟢 Доходы: <b>${formatMoney(m.totals.income)}</b>`,
		`🔴 Расходы: <b>${formatMoney(m.totals.expense)}</b>`,
		`💰 Итог: <b>${formatMoney(net, { sign: true })}</b>`
	];

	const byId = new Map(m.categories.map((c) => [c.id, c]));
	const ranked = [...m.byCategory.entries()].filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);

	if (ranked.length) {
		lines.push('', '<b>Куда ушли деньги</b>');
		for (const [id, sum] of ranked.slice(0, 10)) {
			const c = id ? byId.get(id) : null;
			const share = m.totals.expense ? Math.round((sum / m.totals.expense) * 100) : 0;
			lines.push(`${c ? iconed(c) : '❓ Без категории'} — ${formatMoney(sum)} · ${share}%`);
		}
		if (ranked.length > 10) lines.push(`…и ещё ${ranked.length - 10}`);
	} else if (!m.totals.income) {
		lines.push('', 'Операций за этот месяц нет.');
	}

	const over = ranked
		.map(([id, sum]) => ({ c: id ? byId.get(id) : undefined, sum }))
		.filter(
			(x): x is { c: Category; sum: number } => !!x.c?.monthlyBudget && x.sum > x.c.monthlyBudget
		);
	if (over.length) {
		lines.push('', '⚠️ <b>Превышены лимиты</b>');
		for (const { c, sum } of over)
			lines.push(`${iconed(c)}: ${formatMoney(sum)} из ${formatMoney(c.monthlyBudget!)}`);
	}

	const change = percentChange(m.totals.expense, m.prevExpense);
	if (change !== null) {
		const pct = Math.abs(Math.round(change));
		const word = change > 0 ? 'больше' : 'меньше';
		const prevKey = shiftMonth(m.key, -1);
		lines.push(
			'',
			pct === 0
				? m.current
					? `За 1–${m.day} число прошлого месяца ушло столько же — ${formatMoney(m.prevExpense)}.`
					: `В ${monthPrep(prevKey)} ушло столько же — ${formatMoney(m.prevExpense)}.`
				: m.current
					? `За 1–${m.day} число прошлого месяца ушло ${formatMoney(m.prevExpense)} — сейчас на ${pct}% ${word}.`
					: `В ${monthPrep(prevKey)} ушло ${formatMoney(m.prevExpense)} — в ${monthPrep(m.key)} на ${pct}% ${word}.`
		);
	}
	return clip(lines.join('\n'));
}

export function balanceText(accounts: Account[], balances: Map<string, number>): string {
	if (accounts.length === 0) return '💳 Активных счетов нет — создай счёт в Monio → Счета.';
	const total = accounts.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
	const lines = ['💳 <b>Счета</b>', ''];
	for (const a of accounts)
		lines.push(`${iconed(a)} — <b>${formatMoney(balances.get(a.id) ?? 0)}</b>`);
	lines.push('', `💰 Всего: <b>${formatMoney(total)}</b>`);

	const main = accounts.find((a) => a.isDefault) ?? accounts[0];
	if (accounts.length > 1)
		lines.push(
			'',
			`Записи из чата идут на «${esc(main.name)}» — сменить можно кнопкой ниже.`,
			`Разово — словом в сообщении: <code>250 кофе нал</code>`
		);
	return lines.join('\n');
}

export const HISTORY_PAGE = 10;

export function historyText(txs: Tx[], skip: number, tz: string): string {
	if (txs.length === 0)
		return skip
			? '🧾 Дальше операций нет.'
			: '🧾 Операций пока нет. Напиши, например: <code>250 продукты</code>';
	const title = skip
		? `🧾 <b>Операции ${skip + 1}–${skip + txs.length}</b>`
		: '🧾 <b>Последние операции</b>';
	return clip([title, '', ...txs.map((t) => txLine(t, formatWhen(t.occurredAt, tz)))].join('\n'));
}

export function categoriesText(categories: Category[]): string {
	const block = (kind: 'EXPENSE' | 'INCOME') =>
		categories
			.filter((c) => c.kind === kind)
			.map((c) => {
				const words = c.keywords.slice(0, 6).join(', ');
				const more = c.keywords.length > 6 ? '…' : '';
				return `${iconEmoji(c.icon)} <b>${esc(c.name)}</b>${words ? ` — ${esc(words)}${more}` : ''}`;
			})
			.join('\n') || '—';
	return clip(
		[
			'🏷 <b>Категории</b>',
			'',
			'<b>Расходы</b>',
			block('EXPENSE'),
			'',
			'<b>Доходы</b>',
			block('INCOME'),
			'',
			'Слова-подсказки можно править в Monio → Категории. А если я не узнал слово — выбери категорию кнопкой, и я запомню его сам.'
		].join('\n')
	);
}

export const HELP = [
	'<b>Как записывать</b>',
	'Пиши сумму и на что — категорию я узнаю сам:',
	'<code>250 продукты</code>',
	'<code>кофе 65</code>',
	'<code>вчера такси 180</code>',
	'<code>+30000 зарплата</code> — плюс перед суммой = доход',
	'<code>250 обед нал</code> — слово счёта («нал», «карта») = с этого счёта',
	'',
	'Только сумма — <code>250</code> — и категорию выберешь кнопкой. Не узнал слово — выбери категорию, и я запомню его.',
	'',
	'<b>Кнопки внизу</b>',
	'«− Расход» / «+ Доход» — выбрать категорию и написать сумму.',
	'«📋 Команды» — всё остальное: история, отмена, категории.',
	'',
	'Под каждой записью: сменить категорию или счёт, сдвинуть на день раньше, удалить.'
].join('\n');

export function commandsText(): string {
	return [
		'📋 <b>Все команды</b>',
		'Жми кнопку внизу или команду прямо в тексте:',
		'',
		...COMMAND_ORDER.map((id) => `/${ACTIONS[id].command} — ${ACTIONS[id].description}`)
	].join('\n');
}

export const MAIN_TEXT = '👌 Главные кнопки — внизу. Или просто напиши: <code>250 продукты</code>';

export const NOT_LINKED = [
	'👋 Привет! Это <b>Monio</b> — учёт доходов и расходов.',
	'',
	'Чтобы записывать траты, привяжи аккаунт: открой Monio → <b>Настройки</b> → <b>Telegram-бот</b> → «Подключить Telegram» и перейди по ссылке.'
].join('\n');

export const LINKED = `✅ <b>Готово, аккаунт привязан!</b>\n\n${HELP}`;

/** Предупреждение остальным привязанным Telegram о новом входе. */
export function newLinkAlert(who: { firstName: string | null; username: string | null }): string {
	const name = [who.firstName && esc(who.firstName), who.username && `@${esc(who.username)}`]
		.filter(Boolean)
		.join(' ');
	return [
		'🔐 <b>К твоему Monio подключили ещё один Telegram</b>',
		name ? `Кто: ${name}` : '',
		'',
		'Если это не ты — открой Monio → Настройки → Telegram-бот, отвяжи его и смени пароль в разделе «Вход и безопасность».'
	]
		.filter((l, i) => l || i === 2)
		.join('\n');
}

export const LINK_EXPIRED =
	'⛔ Ссылка устарела или уже использована. Получи новую: Monio → Настройки → Telegram-бот.';

export const NO_AMOUNT =
	'🤔 Не нашёл сумму. Напиши, например: <code>250 продукты</code> или <code>+30000 зарплата</code>.\nВсе команды — кнопка «📋 Команды».';

export const NO_ACCOUNTS = '💳 Нет ни одного активного счёта — создай его в Monio → Счета.';

export const ONLY_TEXT =
	'Я понимаю только текст: напиши сумму и на что, например <code>250 продукты</code>';

export const UNKNOWN_COMMAND = '🤔 Не знаю такой команды. Все команды — кнопка «📋 Команды».';

export const FAILED = '⚠️ Что-то пошло не так — попробуй ещё раз через пару секунд.';
