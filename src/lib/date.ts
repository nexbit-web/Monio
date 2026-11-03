/** Все даты дневника — «календарный день» без времени. Работаем в UTC, чтобы не поймать сдвиг на час. */

export const DAY_MS = 86_400_000;

export function toISODate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export function fromISODate(s: string): Date {
	return new Date(`${s}T00:00:00.000Z`);
}

/** Сегодняшняя дата в локальной зоне пользователя, приведённая к UTC-полуночи. */
export function todayISO(): string {
	const now = new Date();
	return toISODate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function addDays(d: Date, days: number): Date {
	return new Date(d.getTime() + days * DAY_MS);
}

export function diffDays(a: Date, b: Date): number {
	return Math.round((a.getTime() - b.getTime()) / DAY_MS);
}

/** Понедельник недели, к которой относится дата (ISO-неделя). */
export function weekStart(d: Date): Date {
	const day = d.getUTCDay(); // 0 = вс
	const shift = day === 0 ? 6 : day - 1;
	return new Date(d.getTime() - shift * DAY_MS);
}

const MONTHS = [
	'янв',
	'фев',
	'мар',
	'апр',
	'мая',
	'июн',
	'июл',
	'авг',
	'сен',
	'окт',
	'ноя',
	'дек'
];

export function formatShort(d: Date): string {
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function formatLong(d: Date): string {
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

export function weekdayName(d: Date): string {
	return WEEKDAYS[d.getUTCDay()];
}
