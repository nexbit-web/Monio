/** Деньги храним в копейках (целое число), показываем в гривнах. */

export const CURRENCY_SIGN = '₴';

const whole = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('ru-RU', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

/** Максимум одной операции — чуть меньше предела Int в Postgres. */
export const MAX_AMOUNT = 2_000_000_000;

/**
 * 125050 → «1 250,50 ₴», 25000 → «250 ₴».
 * sign: показывать «+» у положительных (минус показывается всегда).
 */
export function formatMoney(
	kop: number,
	{ sign = false, currency = true }: { sign?: boolean; currency?: boolean } = {}
): string {
	const abs = Math.abs(kop);
	const body = abs % 100 === 0 ? whole.format(abs / 100) : cents.format(abs / 100);
	const prefix = kop < 0 ? '−' : sign && kop > 0 ? '+' : '';
	return `${prefix}${body}${currency ? ` ${CURRENCY_SIGN}` : ''}`;
}

/** Подписи осей: полностью до 10 000, дальше «12 тыс», «1,2 млн». */
export function formatCompact(kop: number): string {
	const v = kop / 100;
	const abs = Math.abs(v);
	if (abs >= 1_000_000)
		return `${(v / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн`;
	if (abs >= 10_000) return `${whole.format(Math.round(v / 1000))} тыс`;
	return whole.format(Math.round(v));
}

/** Для поля ввода: 125050 → «1250,50», 25000 → «250». */
export function toInputAmount(kop: number): string {
	return kop % 100 === 0 ? String(kop / 100) : (kop / 100).toFixed(2).replace('.', ',');
}

/**
 * Разбирает сумму, как её пишут руками:
 * «1 250,50», «1250.5», «250грн», «1,5к», «2к», «120+80».
 * Возвращает копейки или null, если это не сумма.
 */
export function parseAmount(input: string): number | null {
	const s = input
		.trim()
		.toLowerCase()
		.replace(/[\s  ]/g, '')
		.replace(/(грн|uah|₴)\.?$/, '');
	if (!s) return null;

	let total = 0;
	for (const part of s.split('+')) {
		const m = /^(\d+(?:[.,]\d{1,2})?)(к|k|тыс|тис)?$/.exec(part);
		if (!m) return null;
		let value = Number(m[1].replace(',', '.'));
		if (m[2]) value *= 1000;
		total += Math.round(value * 100);
	}

	return total > 0 && total < MAX_AMOUNT ? total : null;
}

/** Изменение в процентах; null, если сравнивать не с чем. */
export function percentChange(current: number, previous: number): number | null {
	if (previous === 0) return null;
	return ((current - previous) / previous) * 100;
}
