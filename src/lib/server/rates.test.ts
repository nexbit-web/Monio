/** Курс доллара НБУ: разбор ответа, кэш и запасной курс, если НБУ не ответил. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FALLBACK_RATE, parseRates, resetRatesCache, usdRates } from './rates.ts';

const NOW = new Date('2026-11-17T12:00:00Z');

const BODY = [
	{ exchangedate: '30.10.2026', rate: 45.61 },
	{ exchangedate: '31.10.2026', rate: 45.5293 },
	{ exchangedate: '01.11.2026', rate: 45.5 },
	{ exchangedate: '17.11.2026', rate: 45.3918 }
];

const ok = (body: unknown) =>
	vi.fn(
		async (_url: string | URL | Request) => new Response(JSON.stringify(body), { status: 200 })
	);

beforeEach(() => {
	resetRatesCache();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('parseRates', () => {
	it('последний курс и курс на конец каждого месяца', () => {
		expect(parseRates([...BODY].reverse())).toEqual({
			current: 45.3918,
			date: '2026-11-17',
			monthEnd: { '2026-10': 45.5293, '2026-11': 45.3918 }
		});
	});

	it('мусор пропускает, пустой ответ — ошибка', () => {
		expect(parseRates([{ exchangedate: 'вчера', rate: 1 }, ...BODY.slice(3)]).current).toBe(
			45.3918
		);
		expect(() => parseRates([])).toThrow();
		expect(() => parseRates({ error: 'x' })).toThrow();
	});
});

describe('usdRates', () => {
	it('один запрос за полгода, дальше — из памяти', async () => {
		const fetchFn = ok(BODY);
		const rates = await usdRates(NOW, fetchFn as never);
		expect(rates.current).toBe(45.3918);
		const url = String(fetchFn.mock.calls[0][0]);
		expect(url).toContain('bank.gov.ua');
		expect(url).toContain('valcode=usd');
		expect(url).toContain('start=20260501');
		expect(url).toContain('end=20261117');

		await usdRates(new Date(NOW.getTime() + 3_600_000), fetchFn as never);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it('НБУ не ответил и прошлого ответа нет — примерный курс', async () => {
		const fetchFn = vi.fn(async () => new Response('', { status: 503 }));
		expect(await usdRates(NOW, fetchFn as never)).toEqual({
			current: FALLBACK_RATE,
			date: null,
			monthEnd: {}
		});
	});

	it('НБУ не ответил — прошлый ответ лучше примерного', async () => {
		await usdRates(NOW, ok(BODY) as never);
		const later = new Date(NOW.getTime() + 4 * 3_600_000);
		const down = vi.fn(async () => {
			throw new Error('timeout');
		});
		expect((await usdRates(later, down as never)).current).toBe(45.3918);
	});
});
