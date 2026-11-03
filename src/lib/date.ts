/**
 * Момент операции храним в UTC, а дни и месяцы считаем в часовом поясе пользователя
 * (по умолчанию Киев) — иначе покупка в 01:00 ночи уедет во вчерашний день.
 *
 * MonthKey — «2026-11», DayKey — «2026-11-03».
 */

export const DEFAULT_TZ = 'Europe/Kyiv';
export const DAY_MS = 86_400_000;

export const TIMEZONES = [
	{ id: 'Europe/Kyiv', label: 'Киев (UTC+2/+3)' },
	{ id: 'Europe/Warsaw', label: 'Варшава (UTC+1/+2)' },
	{ id: 'Europe/Berlin', label: 'Берлин (UTC+1/+2)' },
	{ id: 'Europe/London', label: 'Лондон (UTC+0/+1)' },
	{ id: 'Europe/Moscow', label: 'Москва (UTC+3)' },
	{ id: 'Asia/Tbilisi', label: 'Тбилиси (UTC+4)' },
	{ id: 'America/New_York', label: 'Нью-Йорк (UTC−5/−4)' }
] as const;

export function isTimezone(tz: string): boolean {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

type Parts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	weekday: number;
};

const formatters = new Map<string, Intl.DateTimeFormat>();
const WEEKDAY_INDEX: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6
};

/** Календарные части момента date так, как их видят на часах в зоне tz. */
export function zonedParts(date: Date, tz: string): Parts {
	let f = formatters.get(tz);
	if (!f) {
		f = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			weekday: 'short'
		});
		formatters.set(tz, f);
	}
	const out: Parts = { year: 0, month: 0, day: 0, hour: 0, minute: 0, weekday: 0 };
	for (const p of f.formatToParts(date)) {
		if (p.type === 'weekday') out.weekday = WEEKDAY_INDEX[p.value] ?? 0;
		else if (p.type in out) out[p.type as Exclude<keyof Parts, 'weekday'>] = Number(p.value);
	}
	return out;
}

function offsetMs(date: Date, tz: string): number {
	const p = zonedParts(date, tz);
	const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
	return asUtc - Math.floor(date.getTime() / 60_000) * 60_000;
}

/** Время на часах в зоне tz → момент UTC. */
export function zonedToUtc(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	tz: string
): Date {
	const guess = Date.UTC(year, month - 1, day, hour, minute);
	const first = guess - offsetMs(new Date(guess), tz);
	// В ночь перевода часов смещение у guess и у результата может отличаться — уточняем.
	return new Date(guess - offsetMs(new Date(first), tz));
}

const pad = (n: number) => String(n).padStart(2, '0');

// ── Месяцы ──────────────────────────────────────────────────────────────

export function isMonthKey(s: string | null | undefined): s is string {
	return !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function monthKeyOf(date: Date, tz: string): string {
	const p = zonedParts(date, tz);
	return `${p.year}-${pad(p.month)}`;
}

export function currentMonthKey(tz: string): string {
	return monthKeyOf(new Date(), tz);
}

function splitMonth(key: string): [number, number] {
	const [y, m] = key.split('-').map(Number);
	return [y, m];
}

export function shiftMonth(key: string, delta: number): string {
	const [y, m] = splitMonth(key);
	const idx = y * 12 + (m - 1) + delta;
	return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

/** Ключи месяцев от from до to включительно. */
export function monthsBetween(from: string, to: string): string[] {
	const out: string[] = [];
	for (let k = from; k <= to; k = shiftMonth(k, 1)) out.push(k);
	return out;
}

export function daysInMonth(key: string): number {
	const [y, m] = splitMonth(key);
	return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** [start, end) месяца в UTC-моментах. */
export function monthRange(key: string, tz: string): { start: Date; end: Date } {
	const [y, m] = splitMonth(key);
	const [ny, nm] = splitMonth(shiftMonth(key, 1));
	return { start: zonedToUtc(y, m, 1, 0, 0, tz), end: zonedToUtc(ny, nm, 1, 0, 0, tz) };
}

// ── Дни ─────────────────────────────────────────────────────────────────

export function isDayKey(s: string | null | undefined): s is string {
	return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function dayKeyOf(date: Date, tz: string): string {
	const p = zonedParts(date, tz);
	return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function addDaysToKey(key: string, days: number): string {
	const d = new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS);
	return d.toISOString().slice(0, 10);
}

/** [start, end) календарного дня в UTC-моментах. */
export function dayRange(key: string, tz: string): { start: Date; end: Date } {
	const [y, m, d] = key.split('-').map(Number);
	const next = addDaysToKey(key, 1).split('-').map(Number);
	return {
		start: zonedToUtc(y, m, d, 0, 0, tz),
		end: zonedToUtc(next[0], next[1], next[2], 0, 0, tz)
	};
}

// ── Поле <input type="datetime-local"> ───────────────────────────────────

export function toLocalInput(date: Date, tz: string): string {
	const p = zonedParts(date, tz);
	return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function fromLocalInput(s: string, tz: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
	if (!m) return null;
	const [, y, mo, d, h, mi] = m.map(Number);
	if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
	return zonedToUtc(y, mo, d, h, mi, tz);
}

// ── Подписи ─────────────────────────────────────────────────────────────

const MONTHS_NOM = [
	'Январь',
	'Февраль',
	'Март',
	'Апрель',
	'Май',
	'Июнь',
	'Июль',
	'Август',
	'Сентябрь',
	'Октябрь',
	'Ноябрь',
	'Декабрь'
];
const MONTHS_GEN = [
	'января',
	'февраля',
	'марта',
	'апреля',
	'мая',
	'июня',
	'июля',
	'августа',
	'сентября',
	'октября',
	'ноября',
	'декабря'
];
const MONTHS_PREP = [
	'январе',
	'феврале',
	'марте',
	'апреле',
	'мае',
	'июне',
	'июле',
	'августе',
	'сентябре',
	'октябре',
	'ноябре',
	'декабре'
];
const MONTHS_SHORT = [
	'янв',
	'фев',
	'мар',
	'апр',
	'май',
	'июн',
	'июл',
	'авг',
	'сен',
	'окт',
	'ноя',
	'дек'
];
const WEEKDAYS = [
	'воскресенье',
	'понедельник',
	'вторник',
	'среда',
	'четверг',
	'пятница',
	'суббота'
];
const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

/** «Ноябрь 2026» */
export function monthTitle(key: string): string {
	const [y, m] = splitMonth(key);
	return `${MONTHS_NOM[m - 1]} ${y}`;
}

/** «Ноябрь» */
export function monthName(key: string): string {
	return MONTHS_NOM[splitMonth(key)[1] - 1];
}

/** «ноября» — для «1–3 ноября» */
export function monthGen(key: string): string {
	return MONTHS_GEN[splitMonth(key)[1] - 1];
}

/** «ноябре» — для «в ноябре» */
export function monthPrep(key: string): string {
	return MONTHS_PREP[splitMonth(key)[1] - 1];
}

/** «ноя» или «ноя 25», если год не текущий */
export function monthShort(key: string, currentYear?: number): string {
	const [y, m] = splitMonth(key);
	return currentYear && y !== currentYear
		? `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`
		: MONTHS_SHORT[m - 1];
}

/** «3 ноября» (+ год, если не текущий) */
export function formatDay(date: Date, tz: string): string {
	const p = zonedParts(date, tz);
	const nowYear = zonedParts(new Date(), tz).year;
	return `${p.day} ${MONTHS_GEN[p.month - 1]}${p.year !== nowYear ? ` ${p.year}` : ''}`;
}

/** «3 ноя» */
export function formatDayShort(date: Date, tz: string): string {
	const p = zonedParts(date, tz);
	return `${p.day} ${MONTHS_SHORT[p.month - 1]}`;
}

export function formatTime(date: Date, tz: string): string {
	const p = zonedParts(date, tz);
	return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Заголовок дня в ленте: «Сегодня», «Вчера», «Понедельник, 3 ноября». */
export function dayHeading(key: string, tz: string): string {
	const today = dayKeyOf(new Date(), tz);
	if (key === today) return 'Сегодня';
	if (key === addDaysToKey(today, -1)) return 'Вчера';
	const [y, m, d] = key.split('-').map(Number);
	const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
	const nowYear = Number(today.slice(0, 4));
	const name = WEEKDAYS[wd];
	return `${name[0].toUpperCase()}${name.slice(1)}, ${d} ${MONTHS_GEN[m - 1]}${y !== nowYear ? ` ${y}` : ''}`;
}

/** «сегодня, 14:32» / «вчера, 09:10» / «3 ноя (пн), 18:00» */
export function formatWhen(date: Date, tz: string): string {
	const key = dayKeyOf(date, tz);
	const today = dayKeyOf(new Date(), tz);
	const time = formatTime(date, tz);
	if (key === today) return `сегодня, ${time}`;
	if (key === addDaysToKey(today, -1)) return `вчера, ${time}`;
	const p = zonedParts(date, tz);
	return `${formatDayShort(date, tz)} (${WEEKDAYS_SHORT[p.weekday]}), ${time}`;
}
