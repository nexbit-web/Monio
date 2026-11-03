import { describe, expect, it } from 'vitest';
import {
	dayKeyOf,
	dayRange,
	fromLocalInput,
	monthKeyOf,
	monthRange,
	monthsBetween,
	shiftMonth,
	toLocalInput,
	zonedToUtc
} from './date';

const KYIV = 'Europe/Kyiv';

describe('часовой пояс', () => {
	it('покупка в 01:00 по Киеву — это уже новый день, хотя в UTC ещё вчера', () => {
		const at = new Date('2026-11-02T23:30:00Z'); // 01:30 3 ноября в Киеве (UTC+2)
		expect(dayKeyOf(at, KYIV)).toBe('2026-11-03');
		expect(dayKeyOf(at, 'UTC')).toBe('2026-11-02');
	});

	it('границы месяца учитывают летнее и зимнее время', () => {
		// 1 июля — летнее время UTC+3, 1 ноября — зимнее UTC+2
		expect(monthRange('2026-07', KYIV).start.toISOString()).toBe('2026-06-30T21:00:00.000Z');
		expect(monthRange('2026-11', KYIV).start.toISOString()).toBe('2026-10-31T22:00:00.000Z');
		// октябрь длиннее на час: в ночь на 25.10 часы перевели назад
		const oct = monthRange('2026-10', KYIV);
		expect(oct.end.getTime() - oct.start.getTime()).toBe((31 * 24 + 1) * 3600_000);
	});

	it('день перехода на зимнее время длится 25 часов', () => {
		const r = dayRange('2026-10-25', KYIV);
		expect(r.end.getTime() - r.start.getTime()).toBe(25 * 3600_000);
	});

	it('datetime-local туда и обратно', () => {
		const at = zonedToUtc(2026, 11, 3, 14, 32, KYIV);
		expect(at.toISOString()).toBe('2026-11-03T12:32:00.000Z');
		expect(toLocalInput(at, KYIV)).toBe('2026-11-03T14:32');
		expect(fromLocalInput('2026-11-03T14:32', KYIV)?.getTime()).toBe(at.getTime());
		expect(fromLocalInput('мусор', KYIV)).toBeNull();
	});

	it('ключи месяцев', () => {
		expect(shiftMonth('2026-01', -1)).toBe('2025-12');
		expect(shiftMonth('2026-11', 2)).toBe('2027-01');
		expect(monthsBetween('2026-10', '2027-01')).toEqual([
			'2026-10',
			'2026-11',
			'2026-12',
			'2027-01'
		]);
		expect(monthKeyOf(new Date('2026-10-31T22:30:00Z'), KYIV)).toBe('2026-11');
	});
});
