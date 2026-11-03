/**
 * Бот целиком: настоящие обработчики, хранилище в памяти, поддельный Telegram.
 * Каждый тест — то, что человек делает в чате. После каждого теста проверяем,
 * что все ответы бота прошли правила Telegram и контрастности (tg.problems).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatMoney } from '../../money.ts';
import { FAILED, HELP, NOT_LINKED, NO_AMOUNT, ONLY_TEXT, UNKNOWN_COMMAND } from './render.ts';
import { ACTIONS, COMMAND_ORDER, COMMAND_ROWS, MAIN_ROWS } from './ui.ts';
import { PENDING_TTL_MS } from './bot.ts';
import {
	TG_ID,
	buttons,
	callbacks,
	keyboardRows,
	setup,
	stickerUpdate
} from './testing/harness.ts';

/** 3 ноября 2026, 14:00 по Киеву (UTC+2). */
const NOW = new Date('2026-11-03T12:00:00Z');
const at = (iso: string) => new Date(iso);
const labels = (rows: (keyof typeof ACTIONS)[][]) =>
	rows.map((r) => r.map((id) => ACTIONS[id].label));

let t: ReturnType<typeof setup>;

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'], now: NOW });
	vi.spyOn(console, 'error').mockImplementation(() => {});
	t = setup();
});

afterEach(() => {
	expect(t.tg.problems).toEqual([]);
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const link = () => t.mem.links.get(BigInt(TG_ID))!;

// ── Доступ и привязка ───────────────────────────────────────────────────

describe('доступ', () => {
	it('в группе бот молчит и ничего не записывает', async () => {
		await t.send('250 кофе', { group: true });
		expect(t.tg.calls).toEqual([]);
		expect(t.mem.txs).toHaveLength(0);
	});

	it('без привязки — объясняет, как привязать, и убирает клавиатуру', async () => {
		t = setup({ linked: false });
		await t.send('250 кофе');
		expect(t.tg.lastText()).toBe(NOT_LINKED);
		expect(t.tg.lastSent().reply_markup).toEqual({ remove_keyboard: true });
		expect(t.mem.txs).toHaveLength(0);
	});

	it('без привязки нажатие кнопки не висит: отвечаем на нажатие', async () => {
		t = setup({ linked: false });
		await t.tap('v:abc');
		expect(t.tg.answers()).toHaveLength(1);
		expect(t.tg.lastText()).toBe(NOT_LINKED);
	});

	it('/start с кодом из Monio привязывает, создаёт категории и даёт клавиатуру', async () => {
		t = setup({ linked: false });
		const fresh = t.mem.addUser({ initialized: false });
		t.mem.addCode('code123', fresh, new Date(Date.now() + 60_000));

		await t.send('/start code123');

		expect(link().userId).toBe(fresh);
		expect(t.mem.codes.size).toBe(0);
		expect(t.mem.categories.filter((c) => c.userId === fresh).length).toBeGreaterThan(10);
		expect(t.tg.lastText()).toContain("акаунт прив'язано");
		expect(keyboardRows(t.tg.lastSent())).toEqual(labels(MAIN_ROWS));
	});

	it('новый Telegram в аккаунте — уже привязанные получают предупреждение', async () => {
		const other = 5555;
		t.mem.addCode('code2', t.userId, new Date(Date.now() + 60_000));
		await t.send('/start code2', { from: other });

		expect(t.mem.links.get(BigInt(other))?.userId).toBe(t.userId);
		const alert = t.tg.sent().find((m) => m.chat_id === TG_ID);
		expect(alert?.text).toContain("під'єднали ще один Telegram");
		expect(alert?.text).toContain('Хто: Тест @tester');
		expect(alert?.text).toContain("відв'яжи його");
		const welcome = t.tg.sent().find((m) => m.chat_id === other);
		expect(welcome?.text).toContain("акаунт прив'язано");
	});

	it('первая привязка — предупреждать некого', async () => {
		t = setup({ linked: false });
		t.mem.addCode('code3', t.userId, new Date(Date.now() + 60_000));
		await t.send('/start code3');
		expect(t.tg.sent()).toHaveLength(1);
	});

	it('чужой Telegram без кода ничего не видит и не может записать', async () => {
		await t.send('250 кофе', { from: 9999 });
		await t.send('/balance', { from: 9999 });
		await t.send('/last', { from: 9999 });
		expect(t.mem.txs).toHaveLength(0);
		for (const m of t.tg.sent()) expect(m.text).toBe(NOT_LINKED);
	});

	it('код нельзя использовать дважды', async () => {
		t = setup({ linked: false });
		t.mem.addCode('once', t.userId, new Date(Date.now() + 60_000));
		await t.send('/start once');
		await t.send('/start once', { from: 7777 });
		expect(t.mem.links.has(7777n)).toBe(false);
		expect(t.tg.lastText()).toContain('Посилання застаріло');
	});

	it('/start с просроченным кодом — не привязывает', async () => {
		t = setup({ linked: false });
		t.mem.addCode('old', t.userId, new Date(Date.now() - 1));
		await t.send('/start old');
		expect(t.mem.links.size).toBe(0);
		expect(t.tg.lastText()).toContain('Посилання застаріло');
	});

	it('/start у привязанного — помощь и клавиатура', async () => {
		await t.send('/start');
		expect(t.tg.lastText()).toContain('З поверненням');
		expect(t.tg.lastText()).toContain(HELP);
		expect(keyboardRows(t.tg.lastSent())).toEqual(labels(MAIN_ROWS));
	});
});

// ── Запись текстом ──────────────────────────────────────────────────────

describe('запись одним сообщением', () => {
	it('«250 продукты» — расход в Продуктах с основного счёта', async () => {
		await t.send('250 продукты');

		const tx = t.lastTx();
		expect(tx).toMatchObject({
			type: 'EXPENSE',
			amount: 25000,
			categoryId: t.cat('Продукты').id,
			accountId: t.acc('Карта').id,
			note: 'продукты',
			source: 'TELEGRAM'
		});
		expect(tx.occurredAt.getTime()).toBe(NOW.getTime());

		const card = t.tg.lastSent();
		expect(card.text).toContain(`✅ <b>−${formatMoney(25000)}</b> · 🍏 Продукты`);
		expect(card.text).toContain('💳 Карта · сьогодні, 14:00');
		expect(card.text).toContain(`У листопаді на «Продукты»: <b>${formatMoney(25000)}</b>`);
		expect(callbacks(card)).toEqual([
			`cats:${tx.id}`,
			`accs:${tx.id}`,
			`back:${tx.id}`,
			`del:${tx.id}`
		]);
		expect(buttons(card).find((b) => b.callback_data === `del:${tx.id}`)?.style).toBe('danger');
	});

	it('отвечает быстро: пять обращений к базе, три из них параллельно, одно сообщение', async () => {
		t.mem.resetCalls();
		await t.send('250 продукты');
		expect(t.mem.calls).toEqual({
			link: 1,
			categories: 1,
			accounts: 1,
			spentByCategory: 1,
			createTx: 1
		});
		expect(t.tg.methods()).toEqual(['sendMessage']);
	});

	it('несколько записей подряд — привязку спрашиваем у базы раз в минуту', async () => {
		t.mem.resetCalls();
		await t.send('250 продукты');
		await t.send('65 кофе');
		await t.send('180 такси');
		expect(t.mem.calls.link).toBe(1);
		expect(t.mem.txs).toHaveLength(3);

		vi.setSystemTime(NOW.getTime() + 61_000);
		await t.send('40 вода');
		expect(t.mem.calls.link).toBe(2);
	});

	it('отвязку в Monio бот замечает не позже чем через минуту', async () => {
		await t.send('250 продукты');
		t.mem.links.clear();
		vi.setSystemTime(NOW.getTime() + 61_000);
		await t.send('65 кофе');
		expect(t.tg.lastText()).toBe(NOT_LINKED);
		expect(t.mem.txs).toHaveLength(1);
	});

	it('траты месяца в карточке — вместе с новой записью', async () => {
		t.mem.addTx(t.userId, {
			amount: 100000,
			occurredAt: at('2026-11-01T10:00:00Z'),
			categoryId: t.cat('Продукты').id
		});
		await t.send('250 атб');
		expect(t.tg.lastText()).toContain(`на «Продукты»: <b>${formatMoney(125000)}</b>`);
	});

	it('лимит категории: полоска и предупреждение о превышении', async () => {
		t.cat('Продукты').monthlyBudget = 100000;
		t.mem.addTx(t.userId, {
			amount: 90000,
			occurredAt: at('2026-11-02T10:00:00Z'),
			categoryId: t.cat('Продукты').id
		});
		await t.send('250 продукты');
		const text = t.tg.lastText();
		expect(text).toContain(`<b>${formatMoney(115000)}</b> з ${formatMoney(100000)}`);
		expect(text).toContain('▰▰▰▰▰▰▰▰▰▰ 115%');
		expect(text).toContain(`⚠️ Ліміт перевищено на ${formatMoney(15000)}`);
	});

	it('«+30000 зарплата» — доход', async () => {
		await t.send('+30000 зарплата');
		expect(t.lastTx()).toMatchObject({
			type: 'INCOME',
			amount: 3000000,
			categoryId: t.cat('Зарплата').id
		});
		expect(t.tg.lastText()).toContain(`<b>+${formatMoney(3000000)}</b> · 💼 Зарплата`);
		expect(t.tg.lastText()).not.toContain('У листопаді');
	});

	it('«зарплата 30000» без плюса — всё равно доход', async () => {
		await t.send('зарплата 30000');
		expect(t.lastTx()).toMatchObject({ type: 'INCOME', categoryId: t.cat('Зарплата').id });
	});

	it('«вчера такси 180» — на сутки раньше, Транспорт', async () => {
		await t.send('вчера такси 180');
		const tx = t.lastTx();
		expect(tx.occurredAt.toISOString()).toBe('2026-11-02T12:00:00.000Z');
		expect(tx).toMatchObject({ amount: 18000, categoryId: t.cat('Транспорт').id, note: 'такси' });
		expect(t.tg.lastText()).toContain('вчора, 14:00');
	});

	it('время берётся из сообщения: отправленное, пока бот был выключен, — не «сейчас»', async () => {
		const sentAt = Math.floor(at('2026-11-03T06:30:00Z').getTime() / 1000);
		await t.send('65 кофе', { date: sentAt });
		expect(t.lastTx().occurredAt.toISOString()).toBe('2026-11-03T06:30:00.000Z');
	});

	it('«250 кофе нал» — с наличных, слово счёта не попадает в комментарий', async () => {
		await t.send('250 кофе нал');
		expect(t.lastTx()).toMatchObject({
			accountId: t.acc('Наличные').id,
			categoryId: t.cat('Кафе и рестораны').id,
			note: 'кофе'
		});
		expect(t.tg.lastText()).toContain('💵 Наличные');
	});

	it('«250 грн кофе» — валюта не попадает в комментарий', async () => {
		await t.send('250 грн кофе');
		expect(t.lastTx()).toMatchObject({ amount: 25000, note: 'кофе' });
	});

	// примеры из подсказок бота — по-украински — и те же по-русски
	it.each([
		['250 продукти', 'Продукты', 'Карта', 0],
		['кава 65', 'Кафе и рестораны', 'Карта', 0],
		['вчора таксі 180', 'Транспорт', 'Карта', 1],
		['250 обід готівка', 'Кафе и рестораны', 'Наличные', 0],
		['250 кава картка', 'Кафе и рестораны', 'Карта', 0],
		['250 продукты', 'Продукты', 'Карта', 0],
		['позавчера обед 300 нал', 'Кафе и рестораны', 'Наличные', 2]
	])('«%s» → %s, счёт %s', async (text, category, account, daysAgo) => {
		await t.send(text);
		const tx = t.lastTx();
		expect(tx).toMatchObject({ categoryId: t.cat(category).id, accountId: t.acc(account).id });
		expect(tx.occurredAt.getTime()).toBe(NOW.getTime() - daysAgo * 86_400_000);
	});

	it('только сумма — без категории, категории кнопками сразу под записью', async () => {
		await t.send('250');
		const tx = t.lastTx();
		expect(tx.categoryId).toBeNull();

		const card = t.tg.lastSent();
		expect(card.text).toContain('❓ <b>−');
		expect(card.text).toContain('без категорії');
		expect(card.text).toContain('👇 Обери категорію');
		const expense = t.mem.categories.filter((c) => c.userId === t.userId && c.kind === 'EXPENSE');
		expect(callbacks(card)).toEqual([
			...expense.map((c) => `sc:${tx.id}:${c.id}`),
			`tt:${tx.id}`,
			`del:${tx.id}`
		]);
	});

	it('незнакомое слово — обещает запомнить его', async () => {
		await t.send('250 чебуреки');
		expect(t.lastTx().categoryId).toBeNull();
		expect(t.tg.lastText()).toContain("і я запам'ятаю слово «чебуреки»");
	});

	it('«сегодня 250 кофе» — запись, а не отчёт за сегодня', async () => {
		await t.send('сегодня 250 кофе');
		expect(t.mem.txs).toHaveLength(1);
	});

	it('без суммы — подсказка, ничего не записано', async () => {
		await t.send('привет');
		expect(t.tg.lastText()).toBe(NO_AMOUNT);
		expect(t.mem.txs).toHaveLength(0);
	});

	it('HTML в комментарии экранируется', async () => {
		await t.send('250 <b>торт</b> M&M');
		expect(t.tg.lastText()).toContain('📝 &lt;b&gt;торт&lt;/b&gt; M&amp;M');
	});

	it('нет ни одного счёта — просит создать', async () => {
		for (const a of t.mem.accounts) a.archived = true;
		await t.send('250 кофе');
		expect(t.tg.lastText()).toContain('Немає жодного активного рахунку');
		expect(t.mem.txs).toHaveLength(0);
	});
});

// ── Ввод кнопками ───────────────────────────────────────────────────────

describe('ввод кнопками «− Витрата» / «+ Дохід»', () => {
	it('«− Витрата» — категории расходов кнопками', async () => {
		await t.send('− Витрата');
		const msg = t.tg.lastSent();
		expect(msg.text).toContain('<b>Витрата</b>');
		const expense = t.mem.categories.filter((c) => c.userId === t.userId && c.kind === 'EXPENSE');
		expect(callbacks(msg)).toEqual([...expense.map((c) => `pick:${c.id}`), 'unpick']);
	});

	it('«+ Дохід» — категории доходов', async () => {
		await t.send('+ Дохід');
		const income = t.mem.categories.filter((c) => c.userId === t.userId && c.kind === 'INCOME');
		expect(callbacks(t.tg.lastSent())).toEqual([...income.map((c) => `pick:${c.id}`), 'unpick']);
	});

	it('категория → сумма → запись в эту категорию, даже если слова о другом', async () => {
		const cafe = t.cat('Кафе и рестораны');
		await t.tap(`pick:${cafe.id}`);
		expect(link().pendingCategoryId).toBe(cafe.id);
		expect(t.tg.lastEdit().text).toContain('скільки?');
		expect(callbacks(t.tg.lastEdit())).toEqual(['ask:E', 'unpick']);

		await t.send('320 такси');
		expect(t.lastTx()).toMatchObject({ categoryId: cafe.id, note: 'такси', amount: 32000 });
		expect(link().pendingCategoryId).toBeNull();
	});

	it('выбор категории забывается через 15 минут', async () => {
		await t.tap(`pick:${t.cat('Продукты').id}`);
		vi.setSystemTime(NOW.getTime() + PENDING_TTL_MS + 60_000);
		await t.send('100 такси');
		expect(t.lastTx().categoryId).toBe(t.cat('Транспорт').id);
	});

	it('«✕ Отмена» — сумму больше не ждём, сообщение убираем', async () => {
		await t.tap(`pick:${t.cat('Продукты').id}`);
		await t.tap('unpick');
		expect(link().pendingCategoryId).toBeNull();
		expect(t.tg.methods()).toContain('deleteMessage');
	});

	it('«‹ Другая категория» — снова список, прежний выбор сброшен', async () => {
		await t.tap(`pick:${t.cat('Продукты').id}`);
		await t.tap('ask:E');
		expect(link().pendingCategoryId).toBeNull();
		expect(callbacks(t.tg.lastEdit())[0]).toMatch(/^pick:/);
	});

	it('ушёл в другой раздел — выбор категории сброшен', async () => {
		await t.tap(`pick:${t.cat('Продукты').id}`);
		await t.send('📊 Сьогодні');
		expect(link().pendingCategoryId).toBeNull();
	});

	it('удалённая категория — просим выбрать заново', async () => {
		await t.tap('pick:c000000000000000000000000');
		expect(t.tg.lastAnswer().text).toContain('Категорію не знайдено');
	});
});

// ── Кнопки под записью ──────────────────────────────────────────────────

describe('кнопки под записью', () => {
	async function recorded(text: string) {
		await t.send(text);
		return t.lastTx();
	}

	it('выбор категории для новой записи — и бот запоминает слово', async () => {
		const tx = await recorded('250 чебуреки');
		const cafe = t.cat('Кафе и рестораны');
		await t.tap(`sc:${tx.id}:${cafe.id}`);

		expect(tx.categoryId).toBe(cafe.id);
		expect(cafe.keywords).toContain('чебуреки');
		expect(t.tg.lastAnswer().text).toBe("Запам'ятав: «чебуреки» → Кафе и рестораны");
		expect(t.tg.lastEdit().text).toContain('🍔 Кафе и рестораны');
		expect(callbacks(t.tg.lastEdit())[0]).toBe(`cats:${tx.id}`);

		// в следующий раз узнаёт сам
		await t.send('180 чебуреки');
		expect(t.lastTx().categoryId).toBe(cafe.id);
	});

	it('в «Другое» слово не запоминаем', async () => {
		const tx = await recorded('250 чебуреки');
		const other = t.cat('Другое', 'EXPENSE');
		await t.tap(`sc:${tx.id}:${other.id}`);
		expect(tx.categoryId).toBe(other.id);
		expect(other.keywords).toEqual([]);
	});

	it('исправление узнанной категории слово не запоминает', async () => {
		const tx = await recorded('250 атб');
		const cafe = t.cat('Кафе и рестораны');
		const before = [...cafe.keywords];
		await t.tap(`sc:${tx.id}:${cafe.id}`);
		expect(cafe.keywords).toEqual(before);
		expect(t.tg.lastAnswer().text).toBe('🍔 Кафе и рестораны');
	});

	it('«🏷 Категория» — список, текущая подсвечена; «‹ Назад» — карточка', async () => {
		const tx = await recorded('250 продукты');
		await t.tap(`cats:${tx.id}`);
		const edit = t.tg.lastEdit();
		expect(edit.text).toContain('Обери нову категорію');
		const current = buttons(edit).find((b) => b.callback_data === `sc:${tx.id}:${tx.categoryId}`);
		expect(current?.style).toBe('primary');
		expect(callbacks(edit)).toContain(`v:${tx.id}`);

		await t.tap(`v:${tx.id}`);
		expect(callbacks(t.tg.lastEdit())).toEqual([
			`cats:${tx.id}`,
			`accs:${tx.id}`,
			`back:${tx.id}`,
			`del:${tx.id}`
		]);
	});

	it('«↔️ Это доход» — расход становится доходом, предлагаем категории доходов', async () => {
		const tx = await recorded('250');
		await t.tap(`tt:${tx.id}`);
		expect(tx).toMatchObject({ type: 'INCOME', categoryId: null });
		expect(t.tg.lastAnswer().text).toBe('Тепер це дохід');
		const income = t.mem.categories.filter((c) => c.userId === t.userId && c.kind === 'INCOME');
		expect(callbacks(t.tg.lastEdit())).toEqual([
			...income.map((c) => `sc:${tx.id}:${c.id}`),
			`tt:${tx.id}`,
			`del:${tx.id}`
		]);
	});

	it('«💳 Счёт» — счета кнопками, выбор меняет счёт', async () => {
		const tx = await recorded('250 продукты');
		const cash = t.acc('Наличные');
		await t.tap(`accs:${tx.id}`);
		const markup = t.tg.calls.find((c) => c.method === 'editMessageReplyMarkup')!.payload;
		expect(callbacks(markup)).toEqual([
			`sa:${tx.id}:${t.acc('Карта').id}`,
			`sa:${tx.id}:${cash.id}`,
			`v:${tx.id}`
		]);

		await t.tap(`sa:${tx.id}:${cash.id}`);
		expect(tx.accountId).toBe(cash.id);
		expect(t.tg.lastAnswer().text).toBe('💵 Наличные');
		expect(t.tg.lastEdit().text).toContain('💵 Наличные');
	});

	it('«⏪ −1 день» — сдвигает на сутки', async () => {
		const tx = await recorded('250 продукты');
		await t.tap(`back:${tx.id}`);
		expect(tx.occurredAt.toISOString()).toBe('2026-11-02T12:00:00.000Z');
		expect(t.tg.lastEdit().text).toContain('вчора, 14:00');
	});

	it('«✕ Удалить» — удаляет; повторное нажатие — «уже удалено»', async () => {
		const tx = await recorded('250 продукты');
		await t.tap(`del:${tx.id}`);
		expect(t.mem.txs).toHaveLength(0);
		expect(t.tg.lastEdit().text).toContain(`❌ Видалено: <s>−${formatMoney(25000)}</s>`);
		expect(t.tg.lastEdit().reply_markup).toBeUndefined();

		await t.tap(`del:${tx.id}`);
		expect(t.tg.lastAnswer().text).toBe('Уже видалено');
	});

	it('перевод: только сдвиг и удаление', async () => {
		const tr = t.mem.addTx(t.userId, {
			type: 'TRANSFER',
			amount: 50000,
			occurredAt: NOW,
			toAccountId: t.acc('Наличные').id
		});
		await t.tap(`v:${tr.id}`);
		expect(t.tg.lastEdit().text).toContain('🔄 Переказ → Наличные');
		expect(callbacks(t.tg.lastEdit())).toEqual([`back:${tr.id}`, `del:${tr.id}`]);
	});

	it('сообщение уже нельзя изменить — карточка приходит новым сообщением', async () => {
		const tx = await recorded('250 продукты');
		t.tg.reset();
		t.tg.fail('editMessageText', "Bad Request: message can't be edited");
		await t.tap(`v:${tx.id}`);
		expect(t.tg.lastText()).toContain('🍏 Продукты');
	});

	it('«message is not modified» — не ошибка', async () => {
		const tx = await recorded('250 продукты');
		t.tg.reset();
		t.tg.fail('editMessageText', 'Bad Request: message is not modified');
		await t.tap(`v:${tx.id}`);
		expect(t.tg.sent()).toEqual([]);
	});

	it('устаревшая кнопка — честный ответ, а не вечная загрузка', async () => {
		await t.tap('something-old');
		expect(t.tg.lastAnswer().text).toContain('Кнопка застаріла');
	});
});

describe('чужие данные недоступны', () => {
	function stranger() {
		const other = t.mem.addUser();
		const tx = t.mem.addTx(other, { amount: 10000, occurredAt: NOW });
		return { other, tx };
	}

	it('чужую операцию нельзя удалить, открыть или изменить', async () => {
		const { tx } = stranger();
		await t.tap(`del:${tx.id}`);
		expect(t.mem.txs).toContainEqual(tx);
		expect(t.tg.lastAnswer().text).toBe('Уже видалено');

		await t.tap(`v:${tx.id}`);
		await t.tap(`sc:${tx.id}:${t.cat('Продукты').id}`);
		await t.tap(`back:${tx.id}`);
		expect(tx.categoryId).toBeNull();
		expect(tx.occurredAt.getTime()).toBe(NOW.getTime());
		expect(t.tg.edits()).toEqual([]);
	});

	it('к своей операции нельзя прицепить чужую категорию или счёт', async () => {
		const { other } = stranger();
		await t.send('250 продукты');
		const mine = t.lastTx();
		const theirCategory = t.mem.category(other, 'Кафе и рестораны');
		const theirAccount = t.mem.account(other, 'Наличные');

		await t.tap(`sc:${mine.id}:${theirCategory.id}`);
		await t.tap(`sa:${mine.id}:${theirAccount.id}`);
		expect(mine.categoryId).toBe(t.cat('Продукты').id);
		expect(mine.accountId).toBe(t.acc('Карта').id);
		expect(t.mem.calls.updateTx ?? 0).toBe(0);
	});

	it('чужой счёт нельзя сделать основным', async () => {
		const { other } = stranger();
		await t.tap(`da:${t.mem.account(other, 'Наличные').id}`);
		expect(t.tg.lastAnswer().text).toBe('Рахунок не знайдено');
		expect(t.acc('Карта').isDefault).toBe(true);
	});
});

// ── Отчёты ──────────────────────────────────────────────────────────────

describe('📊 Сьогодні', () => {
	it('операции за день и итоги, вчерашних нет', async () => {
		t.mem.addTx(t.userId, {
			amount: 25000,
			occurredAt: at('2026-11-03T07:12:00Z'),
			categoryId: t.cat('Продукты').id,
			note: 'хлеб'
		});
		t.mem.addTx(t.userId, {
			type: 'INCOME',
			amount: 3000000,
			occurredAt: at('2026-11-03T10:00:00Z'),
			categoryId: t.cat('Зарплата').id
		});
		t.mem.addTx(t.userId, { amount: 999900, occurredAt: at('2026-11-02T10:00:00Z') });

		await t.send('📊 Сьогодні');
		const msg = t.tg.lastSent();
		expect(msg.text).toContain('📊 <b>Сьогодні, 3 листопада</b>');
		expect(msg.text).toContain(`09:12 · 🍏 Продукты — <b>−${formatMoney(25000)}</b> · хлеб`);
		expect(msg.text).toContain(`12:00 · 💼 Зарплата — <b>+${formatMoney(3000000)}</b>`);
		expect(msg.text).not.toContain(formatMoney(999900));
		expect(msg.text).toContain(`🔴 Витрати: <b>${formatMoney(25000)}</b>`);
		expect(msg.text).toContain(`🟢 Доходи: <b>${formatMoney(3000000)}</b>`);
		expect(buttons(msg)).toEqual([{ text: '‹ 2 лист', callback_data: 'd:2026-11-02' }]);
	});

	it('пустой день — подсказка, как записать', async () => {
		await t.send('/today');
		expect(t.tg.lastText()).toContain('Операцій поки немає');
	});

	it('листаем на вчера и обратно на сегодня', async () => {
		await t.tap('d:2026-11-02');
		const edit = t.tg.lastEdit();
		expect(edit.text).toContain('Вчора, 2 листопада');
		expect(buttons(edit)).toEqual([
			{ text: '‹ 1 лист', callback_data: 'd:2026-11-01' },
			{ text: 'Сьогодні ›', callback_data: 'd:2026-11-03' }
		]);
		await t.tap('d:2026-11-01');
		expect(t.tg.lastEdit().text).toContain('Неділя, 1 листопада');
	});

	it('завтрашний день не открывается', async () => {
		await t.tap('d:2026-11-04');
		expect(t.tg.lastAnswer().text).toBe('Цей день ще не настав');
		expect(t.tg.edits()).toEqual([]);
	});
});

describe('📅 Місяць', () => {
	beforeEach(() => {
		const groceries = t.cat('Продукты');
		groceries.monthlyBudget = 200000;
		t.mem.addTx(t.userId, {
			amount: 300000,
			occurredAt: at('2026-11-02T10:00:00Z'),
			categoryId: groceries.id
		});
		t.mem.addTx(t.userId, {
			amount: 100000,
			occurredAt: at('2026-11-03T10:00:00Z'),
			categoryId: t.cat('Кафе и рестораны').id
		});
		t.mem.addTx(t.userId, {
			type: 'INCOME',
			amount: 3000000,
			occurredAt: at('2026-11-01T08:00:00Z'),
			categoryId: t.cat('Зарплата').id
		});
		// прошлый месяц: в те же 1–3 число — 2000 ₴, позже — ещё 5000 ₴
		t.mem.addTx(t.userId, {
			amount: 200000,
			occurredAt: at('2026-10-02T10:00:00Z'),
			categoryId: groceries.id
		});
		t.mem.addTx(t.userId, {
			amount: 500000,
			occurredAt: at('2026-10-20T10:00:00Z'),
			categoryId: groceries.id
		});
	});

	it('итоги, категории, лимиты и сравнение с тем же периодом', async () => {
		await t.send('📅 Місяць');
		const msg = t.tg.lastSent();
		const text = msg.text as string;
		expect(text).toContain('📅 <b>Листопад 2026</b> · 1–3 листопада');
		expect(text).toContain(`🟢 Доходи: <b>${formatMoney(3000000)}</b>`);
		expect(text).toContain(`🔴 Витрати: <b>${formatMoney(400000)}</b>`);
		expect(text).toContain(`💰 Підсумок: <b>+${formatMoney(2600000)}</b>`);
		expect(text.indexOf('🍏 Продукты')).toBeLessThan(text.indexOf('🍔 Кафе'));
		expect(text).toContain(`🍏 Продукты — ${formatMoney(300000)} · 75%`);
		expect(text).toContain(`🍏 Продукты: ${formatMoney(300000)} з ${formatMoney(200000)}`);
		expect(text).toContain(`пішло ${formatMoney(200000)} — зараз на 100% більше`);
		expect(buttons(msg)).toEqual([{ text: '‹ Жовтень', callback_data: 'm:2026-10' }]);
	});

	it('прошлый месяц кнопкой — целиком и со стрелкой вперёд', async () => {
		await t.tap('m:2026-10');
		const edit = t.tg.lastEdit();
		expect(edit.text).toContain('📅 <b>Жовтень 2026</b>');
		expect(edit.text).not.toContain(' · 1–');
		expect(edit.text).toContain(`🔴 Витрати: <b>${formatMoney(700000)}</b>`);
		expect(buttons(edit)).toEqual([
			{ text: '‹ Вересень', callback_data: 'm:2026-09' },
			{ text: 'Листопад ›', callback_data: 'm:2026-11' }
		]);
	});

	it('траты в архивной категории подписаны её именем', async () => {
		t.cat('Кафе и рестораны').archived = true;
		await t.send('/month');
		expect(t.tg.lastText()).toContain('🍔 Кафе и рестораны');
	});

	it('будущий месяц не открывается', async () => {
		await t.tap('m:2026-12');
		expect(t.tg.lastAnswer().text).toBe('Цей місяць ще не настав');
	});
});

describe('💳 Рахунки', () => {
	it('остатки с учётом переводов, всего, основной счёт отмечен', async () => {
		const card = t.acc('Карта');
		const cash = t.acc('Наличные');
		card.openingBalance = 100000;
		t.mem.addTx(t.userId, { amount: 25000, occurredAt: NOW, accountId: card.id });
		t.mem.addTx(t.userId, { type: 'INCOME', amount: 50000, occurredAt: NOW, accountId: cash.id });
		t.mem.addTx(t.userId, {
			type: 'TRANSFER',
			amount: 30000,
			occurredAt: NOW,
			accountId: card.id,
			toAccountId: cash.id
		});

		await t.send('💳 Рахунки');
		const msg = t.tg.lastSent();
		expect(msg.text).toContain(`💳 Карта — <b>${formatMoney(45000)}</b>`);
		expect(msg.text).toContain(`💵 Наличные — <b>${formatMoney(80000)}</b>`);
		expect(msg.text).toContain(`💰 Усього: <b>${formatMoney(125000)}</b>`);
		expect(buttons(msg)).toEqual([
			{ text: '✓ 💳 Карта', callback_data: `da:${card.id}`, style: 'primary' },
			{ text: '💵 Наличные', callback_data: `da:${cash.id}` }
		]);
	});

	it('сменить счёт для записей — и следующая запись идёт туда', async () => {
		const cash = t.acc('Наличные');
		await t.tap(`da:${cash.id}`);
		expect(cash.isDefault).toBe(true);
		expect(t.acc('Карта').isDefault).toBe(false);
		expect(t.tg.lastAnswer().text).toBe('Тепер записую на «Наличные»');
		expect(t.tg.lastEdit().text).toContain('Записи з чату йдуть на «Наличные»');

		await t.send('250 кофе');
		expect(t.lastTx().accountId).toBe(cash.id);
	});

	it('один счёт — без кнопок выбора', async () => {
		t.acc('Наличные').archived = true;
		await t.send('/balance');
		expect(buttons(t.tg.lastSent())).toEqual([]);
	});
});

describe('🧾 Історія і ↩️ Скасувати', () => {
	it('10 последних, листание страниц', async () => {
		for (let i = 0; i < 12; i++)
			t.mem.addTx(t.userId, {
				amount: (i + 1) * 100,
				occurredAt: new Date(NOW.getTime() - i * 3600_000)
			});

		await t.send('/last');
		const msg = t.tg.lastSent();
		expect(msg.text).toContain('🧾 <b>Останні операції</b>');
		expect((msg.text as string).split('\n').filter((l) => l.includes(' — '))).toHaveLength(10);
		expect(buttons(msg)).toEqual([{ text: 'Старіші ›', callback_data: 'h:10' }]);

		await t.tap('h:10');
		const edit = t.tg.lastEdit();
		expect(edit.text).toContain('Операції 11–12');
		expect(buttons(edit)).toEqual([{ text: '‹ Новіші', callback_data: 'h:0' }]);
	});

	it('пустая история', async () => {
		await t.send('🧾 Історія');
		expect(t.tg.lastText()).toContain('Операцій поки немає');
	});

	it('«↩️ Отменить» — спрашивает про последнюю запись, удаляет по кнопке', async () => {
		t.mem.addTx(t.userId, { amount: 5000, occurredAt: NOW });
		await t.send('250 продукты');
		const tx = t.lastTx();

		await t.send('↩️ Скасувати');
		const msg = t.tg.lastSent();
		expect(msg.text).toContain('Видалити останній запис?');
		expect(msg.text).toContain('🍏 Продукты');
		expect(buttons(msg)).toEqual([
			{ text: '✕ Так, видалити', callback_data: `del:${tx.id}`, style: 'danger' },
			{ text: 'Залишити', callback_data: `v:${tx.id}` }
		]);

		await t.tap(`del:${tx.id}`);
		expect(t.mem.txs.map((x) => x.id)).not.toContain(tx.id);
		expect(t.mem.txs).toHaveLength(1);
	});

	it('отменять нечего', async () => {
		await t.send('/undo');
		expect(t.tg.lastText()).toContain('Видаляти нічого');
	});
});

// ── Клавиатура и команды ────────────────────────────────────────────────

describe('клавиатура внизу и команды', () => {
	it('«📋 Команди» — экран со всеми командами; «‹ Назад» — главный', async () => {
		await t.send('📋 Команди');
		const msg = t.tg.lastSent();
		expect(keyboardRows(msg)).toEqual(labels(COMMAND_ROWS));
		for (const id of COMMAND_ORDER) expect(msg.text).toContain(`/${ACTIONS[id].command} — `);

		await t.send('‹ Назад');
		expect(keyboardRows(t.tg.lastSent())).toEqual(labels(MAIN_ROWS));
	});

	it('каждая кнопка клавиатуры что-то делает', async () => {
		const all = new Set([...MAIN_ROWS.flat(), ...COMMAND_ROWS.flat()]);
		for (const id of all) {
			t.tg.reset();
			await t.send(ACTIONS[id].label);
			expect(t.tg.sent().length, ACTIONS[id].label).toBeGreaterThan(0);
			expect(t.tg.lastText(), ACTIONS[id].label).not.toBe(UNKNOWN_COMMAND);
			expect(t.tg.lastText(), ACTIONS[id].label).not.toBe(NO_AMOUNT);
		}
		expect(t.mem.txs).toHaveLength(0);
	});

	it('каждая команда работает, в том числе с именем бота', async () => {
		for (const { command } of COMMAND_ORDER.map((id) => ACTIONS[id])) {
			for (const text of [`/${command}`, `/${command}@Monio1_bot`]) {
				t.tg.reset();
				await t.send(text);
				expect(t.tg.lastText(), text).not.toBe(UNKNOWN_COMMAND);
			}
		}
	});

	it.each([
		['місяць', '📅 <b>Листопад 2026</b>'],
		['месяц', '📅 <b>Листопад 2026</b>'],
		['рахунки', '💳 <b>Рахунки</b>'],
		['счета', '💳 <b>Рахунки</b>'],
		['сьогодні', '📊 <b>Сьогодні, 3 листопада</b>'],
		['сегодня', '📊 <b>Сьогодні, 3 листопада</b>'],
		['історія', 'Операцій поки немає'],
		['история', 'Операцій поки немає'],
		['команди', '📋 <b>Усі команди</b>'],
		['команды', '📋 <b>Усі команди</b>']
	])('слово без значка — по-украински и по-русски: «%s»', async (word, reply) => {
		await t.send(word);
		expect(t.tg.lastText()).toContain(reply);
		expect(t.mem.txs).toHaveLength(0);
	});

	it.each(['💰 Баланс', '💳 Счета'])(
		'кнопка старой клавиатуры «%s» работает и меняет клавиатуру на новую',
		async (label) => {
			await t.send(label);
			const [refresh, report] = t.tg.sent();
			expect(refresh.text).toContain('Оновив кнопки');
			expect(keyboardRows(refresh)).toEqual(labels(MAIN_ROWS));
			expect(report.text).toContain('💳 <b>Рахунки</b>');
		}
	);

	it('кнопка новой клавиатуры клавиатуру не пересылает', async () => {
		await t.send('💳 Рахунки');
		expect(t.tg.sent()).toHaveLength(1);
	});

	it('/help — помощь и главная клавиатура', async () => {
		await t.send('/help');
		expect(t.tg.lastText()).toBe(HELP);
		expect(keyboardRows(t.tg.lastSent())).toEqual(labels(MAIN_ROWS));
	});

	it('/categories — категории и слова-подсказки', async () => {
		await t.send('🏷 Категорії');
		expect(t.tg.lastText()).toContain('🍏 <b>Продукты</b> — продукт, еда');
	});

	it('незнакомая команда', async () => {
		await t.send('/foo');
		expect(t.tg.lastText()).toBe(UNKNOWN_COMMAND);
	});

	it('стикер или фото — просим текст', async () => {
		await t.bot.handleUpdate(stickerUpdate());
		expect(t.tg.lastText()).toBe(ONLY_TEXT);
	});
});

// ── Надёжность ──────────────────────────────────────────────────────────

describe('надёжность', () => {
	it('база упала — человек видит «попробуй ещё раз», следующая запись проходит', async () => {
		t.mem.failNext('createTx');
		await t.send('250 кофе');
		expect(t.tg.lastText()).toBe(FAILED);
		expect(t.mem.txs).toHaveLength(0);

		await t.send('250 кофе');
		expect(t.mem.txs).toHaveLength(1);
	});

	it('ошибка на нажатии — всплывающее окно, а не вечная загрузка', async () => {
		t.mem.failNext('tx');
		await t.tap('v:c000000000000000000000001');
		expect(t.tg.lastAnswer()).toMatchObject({ text: FAILED, show_alert: true });
	});

	it('даже если и Telegram не принял ответ — обработка не падает', async () => {
		t.mem.failNext('createTx');
		t.tg.fail('sendMessage', 'Internal Server Error', { code: 500, times: 5 });
		await expect(t.send('250 кофе')).resolves.toBeUndefined();
	});

	it('ошибка привязки (база) — тоже сообщение, а не тишина', async () => {
		t.mem.failNext('link');
		await t.send('250 кофе');
		expect(t.tg.lastText()).toBe(FAILED);
	});
});
