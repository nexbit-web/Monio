/**
 * Тексты бота — по-украински. Чистые функции: данные на входе — HTML для
 * Telegram на выходе, без базы и сети. Пользовательский текст (комментарии,
 * названия) всегда проходит через esc().
 *
 * Названия категорий и счетов приходят из CRM как есть. Разделы CRM
 * («Настройки», «Счета»…) называем так, как они подписаны на сайте, — чтобы
 * их было легко найти.
 */
import { formatMoney, percentChange } from '../../money.ts';
import { dayKeyOf, dayRange, daysInMonth, formatTime, shiftMonth } from '../../date.ts';
import { iconEmoji } from '../../icon-keys.ts';
import { dayHeading, formatDay, formatWhen, monthGen, monthLoc, monthTitle } from './dates.ts';
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

/** «🍏 Продукты» / «🔄 Переказ → Накопления» / «❓ без категорії» */
export function txLabel(tx: Pick<Tx, 'type' | 'category' | 'toAccount'>): string {
	if (tx.type === 'TRANSFER') return `🔄 Переказ → ${esc(tx.toAccount?.name ?? '?')}`;
	if (tx.category) return iconed(tx.category);
	return '❓ <i>без категорії</i>';
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
			? `${mark} <b>${signed(tx.type, tx.amount)}</b> · <i>без категорії</i>`
			: `${mark} <b>${signed(tx.type, tx.amount)}</b> · ${txLabel(tx)}`;

	const lines = [head, `${iconed(tx.account)} · ${formatWhen(tx.occurredAt, tz)}`];
	if (tx.note) lines.push(`📝 ${esc(tx.note)}`);

	const category = tx.category;
	if (category && tx.type === 'EXPENSE' && extra.spent !== undefined && extra.monthKey) {
		const budget = category.monthlyBudget;
		lines.push(
			'',
			`📊 У ${monthLoc(extra.monthKey)} на «${esc(category.name)}»: <b>${formatMoney(extra.spent)}</b>${budget ? ` з ${formatMoney(budget)}` : ''}`
		);
		if (budget) {
			lines.push(budgetBar(extra.spent, budget));
			if (extra.spent > budget)
				lines.push(`⚠️ Ліміт перевищено на ${formatMoney(extra.spent - budget)}`);
		}
	}

	if (extra.ask) {
		const { hint, change } = extra.ask;
		lines.push(
			'',
			change
				? '👇 Обери нову категорію'
				: `👇 Обери категорію${hint ? ` — і я запам'ятаю слово «${esc(hint)}»` : ''}`
		);
	}
	return lines.join('\n');
}

export function deletedText(tx: Tx): string {
	return `❌ Видалено: <s>${signed(tx.type, tx.amount)}</s> · ${txLabel(tx)}${tx.note ? ` · ${esc(tx.note)}` : ''}`;
}

// ── Ввод кнопками ───────────────────────────────────────────────────────

export function askCategoryText(kind: 'EXPENSE' | 'INCOME'): string {
	return kind === 'EXPENSE'
		? '🔴 <b>Витрата</b> — на що?\nОбери категорію або одразу напиши: <code>250 продукти</code>'
		: '🟢 <b>Дохід</b> — звідки?\nОбери категорію або одразу напиши: <code>+30000 зарплата</code>';
}

export function askAmountText(category: Category): string {
	const sample = category.kind === 'INCOME' ? '30000 аванс' : '250 хліб, молоко';
	return `${iconed(category)} — <b>скільки?</b>\nНадішли суму, можна з коментарем: <code>${sample}</code>`;
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

/** «Сьогодні, 3 листопада» / «Вчора, 2 листопада» / «Неділя, 1 листопада» */
export function dayTitle(key: string, tz: string): string {
	const heading = dayHeading(key, tz);
	if (heading !== 'Сьогодні' && heading !== 'Вчора') return heading;
	return `${heading}, ${formatDay(dayRange(key, tz).start, tz)}`;
}

export function dayText(key: string, tz: string, txs: Tx[]): string {
	const lines = [`📊 <b>${dayTitle(key, tz)}</b>`, ''];
	if (txs.length === 0) {
		lines.push(
			key === dayKeyOf(new Date(), tz)
				? 'Операцій поки немає. Напиши, наприклад: <code>250 продукти</code>'
				: 'Цього дня операцій не було.'
		);
		return lines.join('\n');
	}
	for (const t of txs) lines.push(txLine(t, formatTime(t.occurredAt, tz)));
	const { expense, income } = sums(txs);
	lines.push('', `🔴 Витрати: <b>${formatMoney(expense)}</b>`);
	if (income) lines.push(`🟢 Доходи: <b>${formatMoney(income)}</b>`);
	return clip(lines.join('\n'));
}

export type MonthData = {
	key: string;
	/** месяц ещё идёт — считаем «1–N листопада» и сравниваем с тем же периодом */
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
		`📅 <b>${monthTitle(m.key)}</b>${m.current ? ` · 1–${m.day} ${monthGen(m.key)}` : ''}`,
		'',
		`🟢 Доходи: <b>${formatMoney(m.totals.income)}</b>`,
		`🔴 Витрати: <b>${formatMoney(m.totals.expense)}</b>`,
		`💰 Підсумок: <b>${formatMoney(net, { sign: true })}</b>`
	];

	const byId = new Map(m.categories.map((c) => [c.id, c]));
	const ranked = [...m.byCategory.entries()].filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);

	if (ranked.length) {
		lines.push('', '<b>Куди пішли гроші</b>');
		for (const [id, sum] of ranked.slice(0, 10)) {
			const c = id ? byId.get(id) : null;
			const share = m.totals.expense ? Math.round((sum / m.totals.expense) * 100) : 0;
			lines.push(`${c ? iconed(c) : '❓ Без категорії'} — ${formatMoney(sum)} · ${share}%`);
		}
		if (ranked.length > 10) lines.push(`…і ще ${ranked.length - 10}`);
	} else if (!m.totals.income) {
		lines.push('', 'Операцій за цей місяць немає.');
	}

	const over = ranked
		.map(([id, sum]) => ({ c: id ? byId.get(id) : undefined, sum }))
		.filter(
			(x): x is { c: Category; sum: number } => !!x.c?.monthlyBudget && x.sum > x.c.monthlyBudget
		);
	if (over.length) {
		lines.push('', '⚠️ <b>Перевищено ліміти</b>');
		for (const { c, sum } of over)
			lines.push(`${iconed(c)}: ${formatMoney(sum)} з ${formatMoney(c.monthlyBudget!)}`);
	}

	const change = percentChange(m.totals.expense, m.prevExpense);
	if (change !== null) {
		const pct = Math.abs(Math.round(change));
		const word = change > 0 ? 'більше' : 'менше';
		const prevKey = shiftMonth(m.key, -1);
		// тот же период прошлого месяца: 30 березня → «за 1–28 лютого»
		const prev = m.current
			? `За 1–${Math.min(m.day, daysInMonth(prevKey))} ${monthGen(prevKey)}`
			: `У ${monthLoc(prevKey)}`;
		const now = m.current ? 'зараз' : `у ${monthLoc(m.key)}`;
		lines.push(
			'',
			pct === 0
				? `${prev} пішло стільки ж — ${formatMoney(m.prevExpense)}.`
				: `${prev} пішло ${formatMoney(m.prevExpense)} — ${now} на ${pct}% ${word}.`
		);
	}
	return clip(lines.join('\n'));
}

export function balanceText(accounts: Account[], balances: Map<string, number>): string {
	if (accounts.length === 0) return '💳 Активних рахунків немає — створи рахунок у Monio → Счета.';
	const total = accounts.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
	const lines = ['💳 <b>Рахунки</b>', ''];
	for (const a of accounts)
		lines.push(`${iconed(a)} — <b>${formatMoney(balances.get(a.id) ?? 0)}</b>`);
	lines.push('', `💰 Усього: <b>${formatMoney(total)}</b>`);

	const main = accounts.find((a) => a.isDefault) ?? accounts[0];
	if (accounts.length > 1)
		lines.push(
			'',
			`Записи з чату йдуть на «${esc(main.name)}» — змінити можна кнопкою нижче.`,
			`Разово — словом у повідомленні: <code>250 кава готівка</code>`
		);
	return lines.join('\n');
}

export const HISTORY_PAGE = 10;

export function historyText(txs: Tx[], skip: number, tz: string): string {
	if (txs.length === 0)
		return skip
			? '🧾 Далі операцій немає.'
			: '🧾 Операцій поки немає. Напиши, наприклад: <code>250 продукти</code>';
	const title = skip
		? `🧾 <b>Операції ${skip + 1}–${skip + txs.length}</b>`
		: '🧾 <b>Останні операції</b>';
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
			'🏷 <b>Категорії</b>',
			'',
			'<b>Витрати</b>',
			block('EXPENSE'),
			'',
			'<b>Доходи</b>',
			block('INCOME'),
			'',
			"Слова-підказки можна змінити в Monio → Категории. А якщо я не впізнав слово — обери категорію кнопкою, і я сам його запам'ятаю."
		].join('\n')
	);
}

const { expense, income, commands } = ACTIONS;

export const HELP = [
	'<b>Як записувати</b>',
	'Пиши суму й на що — категорію я впізнаю сам:',
	'<code>250 продукти</code>',
	'<code>кава 65</code>',
	'<code>вчора таксі 180</code>',
	'<code>+30000 зарплата</code> — плюс перед сумою = дохід',
	'<code>250 обід готівка</code> — слово рахунку («готівка», «картка») = з цього рахунку',
	'',
	"Тільки сума — <code>250</code> — і категорію обереш кнопкою. Не впізнав слово — обери категорію, і я його запам'ятаю.",
	'Можна писати українською або російською.',
	'',
	'<b>Кнопки внизу</b>',
	`«${expense.label}» / «${income.label}» — обрати категорію й написати суму.`,
	`«${commands.label}» — усе інше: історія, скасування, категорії.`,
	'',
	'Під кожним записом: змінити категорію чи рахунок, перенести на день раніше, видалити.'
].join('\n');

export function commandsText(): string {
	return [
		'📋 <b>Усі команди</b>',
		'Тисни кнопку внизу або пиши команду просто в тексті:',
		'',
		...COMMAND_ORDER.map((id) => `/${ACTIONS[id].command} — ${ACTIONS[id].description}`)
	].join('\n');
}

export const MAIN_TEXT = '👌 Головні кнопки — внизу. Або просто напиши: <code>250 продукти</code>';

export const NOT_LINKED = [
	'👋 Привіт! Це <b>Monio</b> — облік доходів і витрат.',
	'',
	"Щоб записувати витрати, прив'яжи акаунт: відкрий Monio → <b>Настройки</b> → <b>Telegram-бот</b> → «Подключить Telegram» і перейди за посиланням."
].join('\n');

export const LINKED = `✅ <b>Готово, акаунт прив'язано!</b>\n\n${HELP}`;

export const WELCOME_BACK = `👋 З поверненням!\n\n${HELP}`;

/** Предупреждение остальным привязанным Telegram о новом входе. */
export function newLinkAlert(who: { firstName: string | null; username: string | null }): string {
	const name = [who.firstName && esc(who.firstName), who.username && `@${esc(who.username)}`]
		.filter(Boolean)
		.join(' ');
	return [
		"🔐 <b>До твого Monio під'єднали ще один Telegram</b>",
		name ? `Хто: ${name}` : '',
		'',
		"Якщо це не ти — відкрий Monio → Настройки → Telegram-бот, відв'яжи його й зміни пароль у розділі «Вход и безопасность»."
	]
		.filter((l, i) => l || i === 2)
		.join('\n');
}

export const LINK_EXPIRED =
	'⛔ Посилання застаріло або вже використане. Отримай нове: Monio → Настройки → Telegram-бот.';

export const NO_AMOUNT = `🤔 Не знайшов суму. Напиши, наприклад: <code>250 продукти</code> або <code>+30000 зарплата</code>.\nУсі команди — кнопка «${commands.label}».`;

export const NO_ACCOUNTS = '💳 Немає жодного активного рахунку — створи його в Monio → Счета.';

export const ONLY_TEXT =
	'Я розумію тільки текст: напиши суму й на що, наприклад <code>250 продукти</code>';

export const UNKNOWN_COMMAND = `🤔 Не знаю такої команди. Усі команди — кнопка «${commands.label}».`;

export const FAILED = '⚠️ Щось пішло не так — спробуй ще раз за кілька секунд.';

/** Короткие надписи и ответы на нажатия (bot.ts). */
export const T = {
	keyboardUpdated: '✨ Оновив кнопки внизу.',
	cancel: '✕ Скасувати',
	cancelled: 'Скасовано',
	otherCategory: '‹ Інша категорія',
	back: '‹ Назад',
	remove: '✕ Видалити',
	dayEarlier: '⏪ −1 день',
	toIncome: '↔️ Це дохід',
	toExpense: '↔️ Це витрата',
	category: '🏷 Категорія',
	account: '💳 Рахунок',
	nowIncome: 'Тепер це дохід',
	nowExpense: 'Тепер це витрата',
	movedEarlier: 'Переніс на день раніше',
	deleted: 'Видалено',
	alreadyDeleted: 'Уже видалено',
	categoryGone: 'Категорію не знайдено — обери заново',
	txGone: 'Операцію не знайдено — можливо, її видалили',
	txOrCategoryGone: 'Операцію або категорію не знайдено',
	txOrAccountGone: 'Операцію або рахунок не знайдено',
	accountGone: 'Рахунок не знайдено',
	nothingToUndo: 'Видаляти нічого — операцій поки немає.',
	askUndo: '↩️ <b>Видалити останній запис?</b>',
	yesDelete: '✕ Так, видалити',
	keep: 'Залишити',
	nextToday: 'Сьогодні ›',
	futureDay: 'Цей день ще не настав',
	futureMonth: 'Цей місяць ще не настав',
	newer: '‹ Новіші',
	older: 'Старіші ›',
	staleButton: 'Кнопка застаріла — відкрий розділ заново',
	learned: (word: string, category: string) => `Запам'ятав: «${word}» → ${category}`,
	nowRecording: (account: string) => `Тепер записую на «${account}»`
} as const;
