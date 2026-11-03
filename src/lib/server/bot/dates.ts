/**
 * Подписи дат для бота — по-украински. Сами расчёты (часовой пояс, границы
 * дня и месяца) общие с CRM и живут в date.ts; CRM остаётся на русском.
 */
import { addDaysToKey, dayKeyOf, formatTime, zonedParts } from '../../date.ts';

const MONTHS = [
	'Січень',
	'Лютий',
	'Березень',
	'Квітень',
	'Травень',
	'Червень',
	'Липень',
	'Серпень',
	'Вересень',
	'Жовтень',
	'Листопад',
	'Грудень'
];
/** «3 листопада» */
const MONTHS_GEN = [
	'січня',
	'лютого',
	'березня',
	'квітня',
	'травня',
	'червня',
	'липня',
	'серпня',
	'вересня',
	'жовтня',
	'листопада',
	'грудня'
];
/** «у листопаді» */
const MONTHS_LOC = [
	'січні',
	'лютому',
	'березні',
	'квітні',
	'травні',
	'червні',
	'липні',
	'серпні',
	'вересні',
	'жовтні',
	'листопаді',
	'грудні'
];
const MONTHS_SHORT = [
	'січ',
	'лют',
	'бер',
	'квіт',
	'трав',
	'черв',
	'лип',
	'серп',
	'вер',
	'жовт',
	'лист',
	'груд'
];
const WEEKDAYS = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота'];
const WEEKDAYS_SHORT = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

const monthIndex = (key: string) => Number(key.slice(5, 7)) - 1;

/** «Листопад 2026» */
export const monthTitle = (key: string) => `${MONTHS[monthIndex(key)]} ${key.slice(0, 4)}`;

/** «Листопад» */
export const monthName = (key: string) => MONTHS[monthIndex(key)];

/** «листопада» — для «1–3 листопада» */
export const monthGen = (key: string) => MONTHS_GEN[monthIndex(key)];

/** «листопаді» — для «у листопаді» */
export const monthLoc = (key: string) => MONTHS_LOC[monthIndex(key)];

/** «3 листопада» (+ рік, якщо не поточний) */
export function formatDay(date: Date, tz: string): string {
	const p = zonedParts(date, tz);
	const nowYear = zonedParts(new Date(), tz).year;
	return `${p.day} ${MONTHS_GEN[p.month - 1]}${p.year !== nowYear ? ` ${p.year}` : ''}`;
}

/** «3 лист» */
export function formatDayShort(date: Date, tz: string): string {
	const p = zonedParts(date, tz);
	return `${p.day} ${MONTHS_SHORT[p.month - 1]}`;
}

/** «Сьогодні» / «Вчора» / «Понеділок, 2 листопада» */
export function dayHeading(key: string, tz: string): string {
	const today = dayKeyOf(new Date(), tz);
	if (key === today) return 'Сьогодні';
	if (key === addDaysToKey(today, -1)) return 'Вчора';
	const [y, m, d] = key.split('-').map(Number);
	const name = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
	const year = y !== Number(today.slice(0, 4)) ? ` ${y}` : '';
	return `${name[0].toUpperCase()}${name.slice(1)}, ${d} ${MONTHS_GEN[m - 1]}${year}`;
}

/** «сьогодні, 14:32» / «вчора, 09:10» / «3 лист (пн), 18:00» */
export function formatWhen(date: Date, tz: string): string {
	const key = dayKeyOf(date, tz);
	const today = dayKeyOf(new Date(), tz);
	const time = formatTime(date, tz);
	if (key === today) return `сьогодні, ${time}`;
	if (key === addDaysToKey(today, -1)) return `вчора, ${time}`;
	return `${formatDayShort(date, tz)} (${WEEKDAYS_SHORT[zonedParts(date, tz).weekday]}), ${time}`;
}
