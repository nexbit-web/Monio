import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatMoney } from '../../money.ts';
import {
	HELP,
	LINKED,
	MAIN_TEXT,
	NOT_LINKED,
	NO_AMOUNT,
	T,
	askAmountText,
	askCategoryText,
	balanceText,
	budgetBar,
	cardText,
	categoriesText,
	clip,
	commandsText,
	dayText,
	dayTitle,
	deletedText,
	esc,
	historyText,
	monthText,
	signed,
	type MonthData
} from './render.ts';
import { ACTIONS, COMMAND_ORDER } from './ui.ts';
import { htmlProblems } from './testing/harness.ts';
import type { Account, Category, Tx } from './store.ts';

const TZ = 'Europe/Kyiv';
const NOW = new Date('2026-11-03T12:00:00Z');

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: NOW }));
afterEach(() => vi.useRealTimers());

const groceries: Category = {
	id: 'g',
	kind: 'EXPENSE',
	name: 'Продукты',
	icon: 'groceries',
	keywords: ['продукт', 'атб'],
	monthlyBudget: null
};
const salary: Category = {
	...groceries,
	id: 's',
	kind: 'INCOME',
	name: 'Зарплата',
	icon: 'salary'
};
const card: Account = { id: 'a', name: 'Карта', icon: 'card', type: 'CARD', isDefault: true };
const cash: Account = { id: 'b', name: 'Наличные', icon: '💵', type: 'CASH', isDefault: false };

function tx(over: Partial<Tx> = {}): Tx {
	return {
		id: 't',
		type: 'EXPENSE',
		amount: 25000,
		occurredAt: NOW,
		note: null,
		category: groceries,
		account: card,
		toAccount: null,
		...over
	};
}

describe('мелочи', () => {
	it('esc экранирует HTML', () => {
		expect(esc('<b>a & b</b>')).toBe('&lt;b&gt;a &amp; b&lt;/b&gt;');
	});

	it('signed: минус у расхода, плюс у дохода, без знака у перевода', () => {
		expect(signed('EXPENSE', 25000)).toBe(`−${formatMoney(25000)}`);
		expect(signed('INCOME', 25000)).toBe(`+${formatMoney(25000)}`);
		expect(signed('TRANSFER', 25000)).toBe(formatMoney(25000));
	});

	it.each([
		[0, 100, '▱▱▱▱▱▱▱▱▱▱ 0%'],
		[69, 100, '▰▰▰▰▰▰▰▱▱▱ 69%'],
		[100, 100, '▰▰▰▰▰▰▰▰▰▰ 100%'],
		[250, 100, '▰▰▰▰▰▰▰▰▰▰ 250%'],
		[5, 0, '▱▱▱▱▱▱▱▱▱▱ 0%']
	])('budgetBar(%i, %i) = %s', (spent, budget, bar) => {
		expect(budgetBar(spent, budget)).toBe(bar);
	});

	it('clip режет по строке и ставит многоточие', () => {
		expect(clip('коротко')).toBe('коротко');
		const long = Array.from({ length: 50 }, (_, i) => `строка ${i}`).join('\n');
		const cut = clip(long, 100);
		expect(cut.length).toBeLessThanOrEqual(100);
		expect(cut.endsWith('\n…')).toBe(true);
		expect(
			cut
				.split('\n')
				.slice(0, -1)
				.every((l) => /^строка \d+$/.test(l))
		).toBe(true);
	});
});

describe('карточка операции', () => {
	it('расход с категорией, счётом, временем и комментарием', () => {
		const text = cardText(tx({ note: 'хлеб <свежий>' }), TZ);
		expect(text).toBe(
			[
				`✅ <b>−${formatMoney(25000)}</b> · 🍏 Продукты`,
				'💳 Карта · сьогодні, 14:00',
				'📝 хлеб &lt;свежий&gt;'
			].join('\n')
		);
	});

	it('траты категории за месяц и лимит', () => {
		const text = cardText(tx({ category: { ...groceries, monthlyBudget: 100000 } }), TZ, {
			spent: 120000,
			monthKey: '2026-11'
		});
		expect(text).toContain(
			`📊 У листопаді на «Продукты»: <b>${formatMoney(120000)}</b> з ${formatMoney(100000)}`
		);
		expect(text).toContain('▰▰▰▰▰▰▰▰▰▰ 120%');
		expect(text).toContain(`⚠️ Ліміт перевищено на ${formatMoney(20000)}`);
	});

	it('без лимита — только сумма за месяц, без полоски', () => {
		const text = cardText(tx(), TZ, { spent: 50000, monthKey: '2026-11' });
		expect(text).toContain(`на «Продукты»: <b>${formatMoney(50000)}</b>`);
		expect(text).not.toContain('▰');
	});

	it('без категории — знак вопроса и просьба выбрать', () => {
		const text = cardText(tx({ category: null, note: 'чебуреки' }), TZ, {
			ask: { hint: 'чебуреки', change: false }
		});
		expect(text.split('\n')[0]).toBe(`❓ <b>−${formatMoney(25000)}</b> · <i>без категорії</i>`);
		expect(text).toContain("👇 Обери категорію — і я запам'ятаю слово «чебуреки»");
	});

	it('смена категории — другая подсказка', () => {
		expect(cardText(tx(), TZ, { ask: { hint: null, change: true } })).toContain(
			'👇 Обери нову категорію'
		);
	});

	it('перевод', () => {
		const text = cardText(tx({ type: 'TRANSFER', category: null, toAccount: cash }), TZ);
		expect(text.split('\n')[0]).toBe(`✅ <b>${formatMoney(25000)}</b> · 🔄 Переказ → Наличные`);
	});

	it('доход и старое эмодзи счёта из базы', () => {
		const text = cardText(tx({ type: 'INCOME', category: salary, account: cash }), TZ);
		expect(text).toContain(`<b>+${formatMoney(25000)}</b> · 💼 Зарплата`);
		expect(text).toContain('💵 Наличные');
	});

	it('удалено — зачёркнутая сумма', () => {
		expect(deletedText(tx({ note: 'хлеб' }))).toBe(
			`❌ Видалено: <s>−${formatMoney(25000)}</s> · 🍏 Продукты · хлеб`
		);
	});
});

describe('ввод кнопками', () => {
	it('вопросы про категорию и сумму', () => {
		expect(askCategoryText('EXPENSE')).toContain('<b>Витрата</b> — на що?');
		expect(askCategoryText('INCOME')).toContain('<b>Дохід</b> — звідки?');
		expect(askAmountText(groceries)).toContain('🍏 Продукты — <b>скільки?</b>');
		expect(askAmountText(salary)).toContain('30000 аванс');
	});
});

describe('день', () => {
	it.each([
		['2026-11-03', 'Сьогодні, 3 листопада'],
		['2026-11-02', 'Вчора, 2 листопада'],
		['2026-11-01', 'Неділя, 1 листопада'],
		['2026-10-30', "П'ятниця, 30 жовтня"],
		['2025-12-31', 'Середа, 31 грудня 2025']
	])('dayTitle(%s) = %s', (key, title) => {
		expect(dayTitle(key, TZ)).toBe(title);
	});

	it('операции, расходы и доходы', () => {
		const text = dayText('2026-11-03', TZ, [
			tx({ note: 'хлеб' }),
			tx({ type: 'INCOME', category: salary, amount: 3000000 })
		]);
		expect(text).toContain(`14:00 · 🍏 Продукты — <b>−${formatMoney(25000)}</b> · хлеб`);
		expect(text).toContain(`🔴 Витрати: <b>${formatMoney(25000)}</b>`);
		expect(text).toContain(`🟢 Доходи: <b>${formatMoney(3000000)}</b>`);
	});

	it('без доходов строки доходов нет', () => {
		expect(dayText('2026-11-03', TZ, [tx()])).not.toContain('Доходи');
	});

	it('пустой сегодняшний и пустой прошлый день — разные подсказки', () => {
		expect(dayText('2026-11-03', TZ, [])).toContain('Операцій поки немає');
		expect(dayText('2026-11-01', TZ, [])).toContain('Цього дня операцій не було');
	});
});

describe('месяц', () => {
	const base: MonthData = {
		key: '2026-11',
		current: true,
		day: 3,
		totals: { income: 3000000, expense: 400000 },
		prevExpense: 0,
		byCategory: new Map([
			['g', 300000],
			[null, 100000]
		]),
		categories: [groceries]
	};

	it('без категории — отдельной строкой', () => {
		expect(monthText(base)).toContain(`❓ Без категорії — ${formatMoney(100000)} · 25%`);
	});

	it('текущий месяц — с периодом «1–3 листопада»', () => {
		expect(monthText(base)).toContain('📅 <b>Листопад 2026</b> · 1–3 листопада\n');
	});

	it('не с чем сравнить — без строки сравнения', () => {
		expect(monthText(base)).not.toContain('пішло');
	});

	it('текущий месяц — сравнение с тем же периодом прошлого', () => {
		expect(monthText({ ...base, prevExpense: 200000 })).toContain(
			`За 1–3 жовтня пішло ${formatMoney(200000)} — зараз на 100% більше.`
		);
	});

	it('прошлый месяц короче — период не выходит за его конец', () => {
		const text = monthText({ ...base, key: '2026-03', day: 30, prevExpense: 200000 });
		expect(text).toContain('📅 <b>Березень 2026</b> · 1–30 березня');
		expect(text).toContain('За 1–28 лютого пішло');
	});

	it('прошлый месяц — сравнение с предыдущим целиком', () => {
		const text = monthText({ ...base, key: '2026-10', current: false, prevExpense: 800000 });
		expect(text).toContain('📅 <b>Жовтень 2026</b>\n');
		expect(text).toContain(`У вересні пішло ${formatMoney(800000)} — у жовтні на 50% менше.`);
	});

	it('столько же, сколько в прошлом', () => {
		expect(monthText({ ...base, prevExpense: 400000 })).toContain('пішло стільки ж');
	});

	it('больше 10 категорий — «…и ещё»', () => {
		const many = Array.from({ length: 13 }, (_, i) => ({
			...groceries,
			id: `c${i}`,
			name: `К${i}`
		}));
		const text = monthText({
			...base,
			byCategory: new Map(many.map((c, i) => [c.id, (i + 1) * 1000])),
			categories: many
		});
		expect(text).toContain('…і ще 3');
	});

	it('пустой месяц', () => {
		expect(
			monthText({ ...base, totals: { income: 0, expense: 0 }, byCategory: new Map() })
		).toContain('Операцій за цей місяць немає');
	});
});

describe('счета, история, категории, команды', () => {
	it('один счёт — без подсказки про смену', () => {
		const text = balanceText([card], new Map([['a', 100000]]));
		expect(text).toContain(`💳 Карта — <b>${formatMoney(100000)}</b>`);
		expect(text).not.toContain('змінити');
	});

	it('несколько — основной счёт и как записать разово на другой', () => {
		const text = balanceText([card, cash], new Map());
		expect(text).toContain('Записи з чату йдуть на «Карта»');
		expect(text).toContain('<code>250 кава готівка</code>');
	});

	it('нет счетов', () => {
		expect(balanceText([], new Map())).toContain('Активних рахунків немає');
	});

	it('история: первая страница, следующая, пустая', () => {
		expect(historyText([tx()], 0, TZ)).toContain('Останні операції');
		expect(historyText([tx()], 10, TZ)).toContain('Операції 11–11');
		expect(historyText([], 10, TZ)).toContain('Далі операцій немає');
	});

	it('категории со словами-подсказками', () => {
		const text = categoriesText([groceries, salary]);
		expect(text).toContain('🍏 <b>Продукты</b> — продукт, атб');
		expect(text).toContain('💼 <b>Зарплата</b>');
	});

	it('«Усі команди» — каждая команда с описанием', () => {
		const text = commandsText();
		for (const id of COMMAND_ORDER)
			expect(text).toContain(`/${ACTIONS[id].command} — ${ACTIONS[id].description}`);
	});

	it('подсказки называют кнопки так, как они подписаны', () => {
		expect(HELP).toContain(`«${ACTIONS.expense.label}» / «${ACTIONS.income.label}»`);
		expect(NO_AMOUNT).toContain(`«${ACTIONS.commands.label}»`);
	});
});

describe('тексты — по-украински', () => {
	// ы, э, ъ, ё есть только в русском; названия из базы («Продукты») сюда не попадают
	const russian = /[ыэъё]/i;
	const all = {
		HELP,
		LINKED,
		MAIN_TEXT,
		NOT_LINKED,
		NO_AMOUNT,
		commands: commandsText(),
		askExpense: askCategoryText('EXPENSE'),
		askIncome: askCategoryText('INCOME'),
		emptyDay: dayText('2026-11-01', TZ, []),
		emptyHistory: historyText([], 0, TZ),
		...Object.fromEntries(Object.entries(T).filter(([, v]) => typeof v === 'string'))
	};

	it.each(Object.entries(all))('%s', (_name, text) => {
		expect(text).not.toMatch(russian);
	});
});

describe('разметка всех текстов корректна для Telegram', () => {
	const texts = {
		HELP,
		LINKED,
		MAIN_TEXT,
		NOT_LINKED,
		NO_AMOUNT,
		commands: commandsText(),
		card: cardText(tx({ note: '<&>' }), TZ, { ask: { hint: '<x>', change: false } }),
		day: dayText('2026-11-03', TZ, [tx({ note: 'a&b' })]),
		month: monthText({
			key: '2026-11',
			current: true,
			day: 3,
			totals: { income: 1, expense: 2 },
			prevExpense: 1,
			byCategory: new Map([['g', 2]]),
			categories: [{ ...groceries, name: '<Еда>', monthlyBudget: 1 }]
		}),
		categories: categoriesText([{ ...groceries, keywords: ['<b>'] }])
	};

	it.each(Object.entries(texts))('%s', (_name, text) => {
		expect(htmlProblems(text)).toEqual([]);
	});

	it('проверка разметки сама ловит ошибки', () => {
		expect(htmlProblems('<b>жирный')).not.toEqual([]);
		expect(htmlProblems('<div>x</div>')).not.toEqual([]);
		expect(htmlProblems('a < b')).not.toEqual([]);
		expect(htmlProblems('a & b')).not.toEqual([]);
		expect(htmlProblems('<b>a</b> &amp; <i>b</i>')).toEqual([]);
	});
});
