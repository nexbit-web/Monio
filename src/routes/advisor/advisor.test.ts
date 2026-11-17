/**
 * Страница «Наставник» рендерится на сервере во всех режимах и говорит
 * главное текстом: цель $100, сколько отложено, хватает ли на цель, итоги.
 */
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';
import { analyze, type AdvisorInput, type MonthCell } from '$lib/advisor';
import { formatMoney } from '$lib/money';

const NOW = new Date('2026-11-17T12:00:00Z');
const TZ = 'Europe/Kyiv';
const uah = (n: number) => n * 100;
const m = (n: number) => formatMoney(uah(n));

const categories = [
	{ id: 'sal', kind: 'INCOME' as const, name: 'Зарплата', icon: 'salary' },
	{ id: 'home', kind: 'EXPENSE' as const, name: 'Жильё', icon: 'home' },
	{ id: 'cafe', kind: 'EXPENSE' as const, name: 'Кафе', icon: 'cafe' }
];

function month(key: string, cafe = 6_000): MonthCell[] {
	return [
		{ month: key, type: 'INCOME', categoryId: 'sal', total: uah(40_000) },
		{ month: key, type: 'EXPENSE', categoryId: 'home', total: uah(15_000) },
		{ month: key, type: 'EXPENSE', categoryId: 'cafe', total: uah(cafe) }
	];
}

function page(
	over: Partial<AdvisorInput> = {},
	reports = { telegram: true, weekly: true, monthly: true }
) {
	const input: AdvisorInput = {
		now: NOW,
		tz: TZ,
		cells: [...month('2026-08'), ...month('2026-09'), ...month('2026-10')],
		saved: new Map([
			['2026-10', uah(5_000)],
			['2026-11', uah(1_000)]
		]),
		categories,
		firstTxAt: new Date('2026-07-01T09:00:00Z'),
		goalUsd: 100,
		rates: { current: 45.39, date: '2026-11-17', monthEnd: { '2026-10': 45.53 } },
		...over
	};
	return render(Page, { props: { data: { advice: analyze(input), reports } } as never }).body;
}

describe('страница «Наставник»', () => {
	it('цель $100 в гривнах по курсу НБУ', () => {
		const body = page();
		expect(body).toContain('Цель — откладывать $100 в месяц');
		expect(body).toContain(m(4_539));
		expect(body).toContain('по курсу НБУ на 17 ноября');
		expect(body).toContain('45,39');
		expect(body).toContain('«нз 1000»');
	});

	it('этот месяц: сколько отложено вручную и сколько можно тратить', () => {
		const body = page();
		expect(body).toContain('$22');
		expect(body).toContain('из $100 отложено');
		expect(body).toContain('Осталось отложить');
		expect(body).toContain('в день');
	});

	it('хватает ли на цель — без сумм по категориям', () => {
		const body = page();
		expect(body).toContain('В среднем за месяц ты зарабатываешь');
		expect(body).toContain('На цель хватает');
		expect(body).not.toContain('Кафе');
		expect(body).not.toContain('Жильё');
		expect(body).not.toContain('50/30/20');
		expect(body).not.toContain('Подушка');
	});

	it('итоги: выполнено — и сколько сверху', () => {
		expect(page()).toContain('цель выполнена');
	});

	it('итоги: не выполнено — с причиной', () => {
		const body = page({ saved: new Map() });
		expect(body).toContain('Октябрь');
		expect(body).toContain('ничего не отложено');
		expect(body).toContain('Деньги были');
	});

	it('первый месяц учёта — когда будет первый итог', () => {
		const body = page({
			cells: month('2026-11'),
			saved: new Map(),
			firstTxAt: new Date('2026-11-03T09:00:00Z')
		});
		expect(body).toContain('оценка по 15 дн. учёта');
		expect(body).toContain('Первый итог — 1-го числа');
	});

	it('без Telegram — зовёт подключить', () => {
		expect(page({}, { telegram: false, weekly: true, monthly: true })).toContain(
			'Подключи Telegram'
		);
	});

	it('данных нет — пустое состояние', () => {
		const body = page({ cells: [], saved: new Map(), firstTxAt: null });
		expect(body).toContain('Наставнику нужны данные');
	});
});
