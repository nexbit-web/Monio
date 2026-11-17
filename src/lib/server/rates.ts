/**
 * Курс доллара — официальный, Национального банка Украины (bank.gov.ua,
 * открытый API без ключа). Одним запросом — курсы по дням за полгода:
 * последний — для цели этого месяца, на конец каждого прошлого месяца — для
 * итогов («цель $100 в октябре — это 4 553 ₴ по курсу на 31 октября»).
 *
 * Ответ держим в памяти на 3 часа: НБУ меняет курс раз в день. НБУ не
 * ответил — отдаём прошлый ответ, а если его нет — примерный курс (date: null),
 * и страница честно пишет «примерно».
 */
import { dayKeyOf, monthKeyOf, monthRange, shiftMonth } from '../date.ts';
import { HISTORY_MONTHS, type UsdRates } from '../advisor.ts';

const API = 'https://bank.gov.ua/NBU_Exchange/exchange_site';
const TZ = 'Europe/Kyiv';
const TTL = 3 * 3_600_000;
/** НБУ не отвечает — не ждём его на каждой странице, пробуем снова через 10 минут */
const RETRY = 10 * 60_000;
const TIMEOUT = 4_000;
/** Если НБУ недоступен, а прошлого ответа нет. Ноябрь 2026 — ≈ 45 ₴. */
export const FALLBACK_RATE = 45;

let cache: { until: number; rates: UsdRates } | null = null;

export async function usdRates(now = new Date(), fetchFn: typeof fetch = fetch): Promise<UsdRates> {
	if (cache && now.getTime() < cache.until) return cache.rates;
	try {
		const rates = await fetchRates(now, fetchFn);
		cache = { until: now.getTime() + TTL, rates };
		return rates;
	} catch (err) {
		console.error('[rates] НБУ не ответил:', err);
		const rates = cache?.rates ?? { current: FALLBACK_RATE, date: null, monthEnd: {} };
		cache = { until: now.getTime() + RETRY, rates };
		return rates;
	}
}

/** Для тестов: забыть прошлый ответ. */
export function resetRatesCache() {
	cache = null;
}

const compact = (dayKey: string) => dayKey.replaceAll('-', '');

async function fetchRates(now: Date, fetchFn: typeof fetch): Promise<UsdRates> {
	const start = monthRange(shiftMonth(monthKeyOf(now, TZ), -HISTORY_MONTHS), TZ).start;
	const url =
		`${API}?valcode=usd&sort=exchangedate&order=asc&json` +
		`&start=${compact(dayKeyOf(start, TZ))}&end=${compact(dayKeyOf(now, TZ))}`;
	const res = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT) });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return parseRates(await res.json());
}

/** Ответ НБУ: [{ exchangedate: "17.11.2026", rate: 45.3918 }, …] → курсы. */
export function parseRates(body: unknown): UsdRates {
	if (!Array.isArray(body)) throw new Error('ответ не список');
	const days: [string, number][] = [];
	for (const row of body) {
		const date = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(row?.exchangedate ?? ''));
		const rate = Number(row?.rate);
		// разумные границы — на случай мусора в ответе
		if (!date || !Number.isFinite(rate) || rate < 1 || rate > 1_000) continue;
		days.push([`${date[3]}-${date[2]}-${date[1]}`, rate]);
	}
	if (!days.length) throw new Error('в ответе нет курсов');
	days.sort((a, b) => (a[0] < b[0] ? -1 : 1));

	const monthEnd: Record<string, number> = {};
	for (const [day, rate] of days) monthEnd[day.slice(0, 7)] = rate; // последний день месяца побеждает
	const [date, current] = days[days.length - 1];
	return { current, date, monthEnd };
}
