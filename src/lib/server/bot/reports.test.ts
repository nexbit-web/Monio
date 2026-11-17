/**
 * Наставник в боте: «🐷 Відкласти», «📈 Тиждень», «💡 Поради» и рассылка
 * отчётов по расписанию. Настоящий бот, хранилище в памяти, поддельный
 * Telegram (как в bot.test.ts). Курс «НБУ» в тестах — 40 ₴: $100 = 4 000 ₴.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTIONS } from './ui.ts';
import { dueMonth, dueWeek, sendDueReports, T_REPORTS } from './reports.ts';
import { TG_ID, buttons, callbacks, setup } from './testing/harness.ts';
import { T } from './render.ts';
import { formatMoney } from '../../money.ts';

const TZ = 'Europe/Kyiv';
/** Воскресенье 22 ноября 2026, 19:30 по Киеву (UTC+2) — время рассылки. */
const SUNDAY = new Date('2026-11-22T17:30:00Z');
const uah = (n: number) => n * 100;
/** «40 000 ₴» — с неразрывным пробелом, как в сообщениях */
const m = (n: number, sign = false) => formatMoney(uah(n), { sign });

let t: ReturnType<typeof setup>;

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'], now: SUNDAY });
	vi.spyOn(console, 'error').mockImplementation(() => {});
	t = setup();
});

afterEach(() => {
	expect(t.tg.problems).toEqual([]);
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const user = () => t.mem.users.get(t.userId)!;
const at = (iso: string) => new Date(iso);
const transfers = () => t.mem.txs.filter((x) => x.type === 'TRANSFER');
const savingsAccounts = () =>
	t.mem.accounts.filter((a) => a.userId === t.userId && a.type === 'SAVINGS');

/** Три месяца истории (август–октябрь) и эта неделя. */
function seedHistory() {
	const { userId } = t;
	const id = (name: string, kind?: 'EXPENSE' | 'INCOME') => t.cat(name, kind).id;
	for (const mm of ['08', '09', '10']) {
		t.mem.addTx(userId, {
			type: 'INCOME',
			amount: uah(40_000),
			occurredAt: at(`2026-${mm}-01T09:00:00Z`),
			categoryId: id('Зарплата')
		});
		t.mem.addTx(userId, {
			amount: uah(10_000),
			occurredAt: at(`2026-${mm}-06T09:00:00Z`),
			categoryId: id('Жильё')
		});
		t.mem.addTx(userId, {
			amount: uah(8_000),
			occurredAt: at(`2026-${mm}-10T09:00:00Z`),
			categoryId: id('Продукты')
		});
		t.mem.addTx(userId, {
			amount: uah(6_000),
			occurredAt: at(`2026-${mm}-12T09:00:00Z`),
			categoryId: id('Кафе и рестораны')
		});
		t.mem.addTx(userId, {
			amount: uah(4_000),
			occurredAt: at(`2026-${mm}-15T09:00:00Z`),
			categoryId: id('Развлечения')
		});
	}
	// эта неделя (16–22 ноября)
	t.mem.addTx(userId, {
		type: 'INCOME',
		amount: uah(40_000),
		occurredAt: at('2026-11-16T09:00:00Z'),
		categoryId: id('Зарплата')
	});
	t.mem.addTx(userId, {
		amount: uah(1_500),
		occurredAt: at('2026-11-17T09:00:00Z'),
		categoryId: id('Продукты'),
		note: 'атб'
	});
	t.mem.addTx(userId, {
		amount: uah(700),
		occurredAt: at('2026-11-21T09:00:00Z'),
		categoryId: id('Кафе и рестораны')
	});
}

/** Отложить в истории: перевод с карты на «Накопления». */
function saved(amount: number, iso: string) {
	const to =
		savingsAccounts()[0] ??
		t.mem.addAccount(t.userId, 'Накопления', { type: 'SAVINGS', icon: 'savings' });
	t.mem.addTx(t.userId, {
		type: 'TRANSFER',
		amount: uah(amount),
		occurredAt: at(iso),
		accountId: t.acc('Карта').id,
		toAccountId: to.id
	});
}

// ── Отложить ────────────────────────────────────────────────────────────

describe('«🐷 Відкласти»', () => {
	it('«нз 1000» — перевод с основного счёта на новый счёт «Накопления»', async () => {
		await t.send('нз 1000');
		expect(savingsAccounts()).toHaveLength(1);
		const [tx] = transfers();
		expect(tx).toMatchObject({
			amount: uah(1_000),
			accountId: t.acc('Карта').id,
			toAccountId: savingsAccounts()[0].id,
			categoryId: null,
			note: null
		});
		const text = t.tg.lastText();
		expect(text).toContain(`✅ <b>${m(1_000)}</b> · 🐷 Відкладено → Накопления`);
		expect(text).toContain(`🎯 Листопад: відкладено <b>$25 з $100</b> — ще ${m(3_000)}`);
		// трата не записана — это не расход
		expect(t.mem.txs.filter((x) => x.type === 'EXPENSE')).toHaveLength(0);
	});

	it('понимает по-разному: «відклав», «отложил», «в накопления», счёт словом', async () => {
		await t.send('відклав 500 готівкою');
		await t.send('отложил 2000 на машину');
		await t.send('1000 в накопления');
		const [cash, car, plain] = transfers();
		expect(cash.accountId).toBe(t.acc('Наличные').id);
		expect(car).toMatchObject({ amount: uah(2_000), note: 'на машину' });
		expect(plain).toMatchObject({ amount: uah(1_000), note: null });
		// счёт «Накопления» один — второй не заводит
		expect(savingsAccounts()).toHaveLength(1);
		expect(t.tg.lastText()).toContain('відкладено <b>$87 з $100</b>');
	});

	it('кнопка: сколько отложено и «отложить остаток» одним нажатием', async () => {
		saved(1_000, '2026-11-20T09:00:00Z');
		await t.send(ACTIONS.save.label);
		const msg = t.tg.lastSent();
		expect(msg.text).toContain('🐷 <b>Відкласти</b>');
		expect(msg.text).toContain(`відкладено <b>$25 з $100</b> — ще ${m(3_000)}`);
		expect(msg.text).toContain('перекажу з «Карта» на «Накопления»');
		expect(callbacks(msg)).toEqual([`sv:${uah(3_000)}`]);
		expect(buttons(msg)[0].text).toBe(`🐷 Відкласти ${m(3_000)} — до $100`);

		await t.tap(`sv:${uah(3_000)}`);
		expect(transfers()).toHaveLength(2);
		expect(t.tg.lastText()).toContain('✅ Листопад: відкладено $100 — ціль $100 виконано!');

		// цель выполнена — кнопки «отложить остаток» больше нет
		await t.send('нз');
		expect(callbacks(t.tg.lastSent())).toEqual([]);
	});

	it('кнопку «отложить остаток» нажали дважды — отложит один раз', async () => {
		await t.send(ACTIONS.save.label);
		await t.tap(`sv:${uah(4_000)}`);
		// второй раз Telegram отвечает: кнопки уже нет
		t.tg.fail('editMessageReplyMarkup', 'Bad Request: message is not modified');
		await t.tap(`sv:${uah(4_000)}`);
		expect(transfers()).toHaveLength(1);
		expect(t.tg.lastAnswer().text).toBe(T.staleButton);
	});

	it('сумма в кнопке больше допустимой — ничего не записывает', async () => {
		await t.tap('sv:9999999999');
		expect(transfers()).toHaveLength(0);
	});

	it('не посчитали «сколько отложено» — перевод записан, ответ без ошибки', async () => {
		t.mem.failNext('savedByMonth');
		await t.send('нз 1000');
		expect(transfers()).toHaveLength(1);
		const text = t.tg.lastText();
		expect(text).toContain('🐷 Відкладено → Накопления');
		expect(text).not.toContain('🎯');
	});

	it('«накопитель», «накопичувач» — покупка, а не отложенное', async () => {
		await t.send('ssd накопитель 2500');
		await t.send('накопичувач 1800');
		expect(transfers()).toHaveLength(0);
		expect(t.mem.txs.filter((x) => x.type === 'EXPENSE')).toHaveLength(2);
	});

	it('отложенное видно в отчёте за неделю', async () => {
		await t.send('нз 1000');
		await t.send('/week');
		expect(t.tg.lastText()).toContain(`🐷 Відкладено: <b>${m(1_000)}</b>`);
	});
});

// ── Экраны ──────────────────────────────────────────────────────────────

describe('«📈 Тиждень»', () => {
	it('кнопка присылает отчёт за текущую неделю с целью месяца', async () => {
		seedHistory();
		await t.send(ACTIONS.week.label);
		const msg = t.tg.lastSent();
		const text = msg.text as string;
		expect(text).toContain('📈 <b>Тиждень 16–22 листопада</b>');
		expect(text).toContain(`🟢 Доходи: <b>${m(40_000)}</b>`);
		expect(text).toContain(`🔴 Витрати: <b>${m(2_200)}</b>`);
		expect(text).toContain(`Продукты — ${m(1_500)}`);
		expect(text).toContain('🎯 Ціль — <b>$100 на місяць</b>');
		expect(text).toContain('📅 <b>Листопад</b>');
		expect(text).toContain('відкладено <b>$0 з $100</b>');
		expect(callbacks(msg)).toEqual(['w:2026-11-09', 'adv', 'wr:0:2026-11-16']);
		expect(buttons(msg).map((b) => b.text)).toContain(T_REPORTS.weeklyOff);
	});

	it('прошлая неделя — на месте, с кнопкой вперёд и без цели месяца', async () => {
		seedHistory();
		await t.tap('w:2026-11-09');
		const edit = t.tg.lastEdit();
		expect(edit.text).toContain('Тиждень 9–15 листопада');
		expect(edit.text).not.toContain('Ціль');
		expect(callbacks(edit)).toContain('w:2026-11-16');
	});

	it('будущую неделю не открывает', async () => {
		await t.tap('w:2026-11-23');
		expect(t.tg.lastAnswer().text).toBe('Цей тиждень ще не настав');
	});

	it('пустая неделя — мягкое напоминание записывать', async () => {
		await t.send('/week');
		expect(t.tg.lastText()).toContain('Записів за цей тиждень немає');
	});

	it('выключатель отчёта по воскресеньям', async () => {
		await t.tap('wr:0:2026-11-16');
		expect(user().weeklyReport).toBe(false);
		expect(t.tg.lastAnswer().text).toBe(T_REPORTS.nowOff);
		expect(callbacks(t.tg.lastEdit())).toContain('wr:1:2026-11-16');

		await t.tap('wr:1:2026-11-16');
		expect(user().weeklyReport).toBe(true);
		expect(t.tg.lastAnswer().text).toBe(T_REPORTS.nowOn);
	});
});

describe('«💡 Поради»', () => {
	it('цель, как идёт месяц, хватает ли доходов и итог прошлого месяца', async () => {
		seedHistory();
		await t.send(ACTIONS.advice.label);
		const text = t.tg.lastText();
		expect(text).toContain('💡 <b>Фінансовий наставник</b>');
		expect(text).toContain(`🎯 Ціль — <b>$100 на місяць</b>: ${m(4_000)} за курсом НБУ 40,00 ₴`);
		expect(text).toContain(`📅 <b>Листопад</b>: зароблено ${m(40_000)}, витрачено ${m(2_200)}`);
		expect(text).toContain(`відкладено <b>$0 з $100</b> — ще ${m(4_000)}`);
		// свободных денег хватает — подсказывает отложить сразу
		expect(text).toContain('<code>нз 4000</code>');
		expect(text).toContain(
			`📊 У середньому за місяць: дохід <b>${m(40_000)}</b>, витрати <b>${m(28_000)}</b>`
		);
		expect(text).toContain('✅ На ціль вистачає');
		// октябрь: ничего не отложено, хотя деньги были
		expect(text).toContain('❌ <b>Жовтень: нічого не відкладено.</b>');
		expect(text).toContain(
			`Причина: гроші були — наприкінці місяця лишилося вільних <b>${m(12_000)}</b>`
		);
		// без сумм по категориям
		expect(text).not.toContain('Кафе');
		expect(callbacks(t.tg.lastSent())).toEqual(['w:2026-11-16', 'm:2026-11']);
	});

	it('понимает слова: «советы», «наставник», «накопления»', async () => {
		for (const word of ['советы', 'наставник', 'накопления']) {
			await t.send(word);
			expect(t.tg.lastText()).toContain('Фінансовий наставник');
		}
		expect(t.mem.txs).toHaveLength(0);
	});

	it('первые дни — честно говорит, что данных мало', async () => {
		t.mem.addTx(t.userId, { amount: uah(250), occurredAt: at('2026-11-21T10:00:00Z') });
		await t.send('/advice');
		expect(t.tg.lastText()).toContain('Обліку поки 2 дн.');
	});

	it('кнопка под отчётом открывает советы новым сообщением', async () => {
		await t.tap('adv');
		expect(t.tg.lastText()).toContain('Фінансовий наставник');
	});
});

// ── Рассылка ────────────────────────────────────────────────────────────

describe('когда что слать', () => {
	it.each([
		['2026-11-22T17:30:00Z', '2026-11-16'], // воскресенье вечер
		['2026-11-22T08:00:00Z', null], // воскресенье утро — рано
		['2026-11-23T17:30:00Z', '2026-11-16'], // понедельник — догоняем пропущенное
		['2026-11-24T17:30:00Z', null] // вторник
	])('неделя: %s → %s', (iso, key) => expect(dueWeek(new Date(iso), TZ)).toBe(key));

	it.each([
		['2026-12-01T17:30:00Z', '2026-11'],
		['2026-12-02T17:30:00Z', '2026-11'],
		['2026-12-03T17:30:00Z', null]
	])('месяц: %s → %s', (iso, key) => expect(dueMonth(new Date(iso), TZ)).toBe(key));
});

describe('рассылка по расписанию', () => {
	const run = (now = SUNDAY) => sendDueReports(t.mem.store, t.bot.api, now);

	it('в воскресенье вечером присылает отчёт за неделю — один раз', async () => {
		seedHistory();
		expect(await run()).toEqual({ weekly: 1, monthly: 0, skipped: 0, failed: 0 });
		const msg = t.tg.lastSent();
		expect(msg.chat_id).toBe(TG_ID);
		expect(msg.text).toContain('Тиждень 16–22 листопада');
		expect(msg.text).toContain('🎯 Ціль');
		expect(user().lastWeeklyReport).toBe('2026-11-16');

		// повторный запуск и понедельник — уже отправлено
		t.tg.reset();
		expect(await run()).toEqual({ weekly: 0, monthly: 0, skipped: 1, failed: 0 });
		await run(at('2026-11-23T17:30:00Z'));
		expect(t.tg.sent()).toHaveLength(0);
	});

	it('воскресный запуск пропал — пришлёт в понедельник за прошлую неделю', async () => {
		seedHistory();
		vi.setSystemTime(at('2026-11-23T17:30:00Z'));
		expect((await run(at('2026-11-23T17:30:00Z'))).weekly).toBe(1);
		expect(t.tg.lastText()).toContain('Тиждень 16–22 листопада');
	});

	it('выключен — не шлёт', async () => {
		seedHistory();
		user().weeklyReport = false;
		expect(await run()).toEqual({ weekly: 0, monthly: 0, skipped: 0, failed: 0 });
		expect(t.tg.sent()).toHaveLength(0);
	});

	it('месяц ничего не записывает — не надоедает пустыми отчётами', async () => {
		expect((await run()).skipped).toBe(1);
		expect(t.tg.sent()).toHaveLength(0);
	});

	it('Telegram не принял — отметку снимаем, следующий запуск пробует снова', async () => {
		seedHistory();
		t.tg.fail('sendMessage', 'Bad Request: chat not found');
		expect((await run()).failed).toBe(1);
		expect(user().lastWeeklyReport).toBeNull();

		expect((await run()).weekly).toBe(1);
		expect(user().lastWeeklyReport).toBe('2026-11-16');
	});

	it('в будни ничего не шлёт', async () => {
		seedHistory();
		expect(await run(at('2026-11-18T17:30:00Z'))).toEqual({
			weekly: 0,
			monthly: 0,
			skipped: 0,
			failed: 0
		});
	});

	it('1-го числа — цель месяца выполнена и на сколько', async () => {
		seedHistory();
		saved(5_000, '2026-11-20T09:00:00Z');
		const dec1 = at('2026-12-01T17:30:00Z');
		vi.setSystemTime(dec1);
		expect(await run(dec1)).toEqual({ weekly: 0, monthly: 1, skipped: 0, failed: 0 });
		const text = t.tg.lastText();
		expect(
			text.startsWith(`🗓 <b>Підсумки листопада</b>

🟢 Доходи: <b>${m(40_000)}</b>`)
		).toBe(true);
		expect(text).toContain(
			`✅ <b>Листопад: ціль виконано</b> — відкладено $125 (${m(5_000)}), на $25 більше.`
		);
		expect(text).toContain('💡 <b>На новий місяць</b>');
		expect(user().lastMonthlyReport).toBe('2026-11');
		expect(callbacks(t.tg.lastSent())).toEqual(['adv', 'm:2026-11']);
	});

	it('1-го числа — не выполнена: почему', async () => {
		seedHistory();
		saved(1_000, '2026-11-20T09:00:00Z');
		const dec1 = at('2026-12-01T17:30:00Z');
		vi.setSystemTime(dec1);
		await run(dec1);
		const text = t.tg.lastText();
		expect(text).toContain(
			`❌ <b>Листопад: ціль не виконано</b> — відкладено $25 (${m(1_000)}), до $100 забракло $75.`
		);
		// 40 000 − 2 200 − 1 000 отложенных
		expect(text).toContain(
			`Причина: гроші були — наприкінці місяця лишилося вільних <b>${m(36_800)}</b>`
		);
	});
});
