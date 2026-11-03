import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	dayHeading,
	formatDay,
	formatDayShort,
	formatWhen,
	monthGen,
	monthLoc,
	monthName,
	monthTitle
} from './dates.ts';

const TZ = 'Europe/Kyiv';

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-03T12:00:00Z') }));
afterEach(() => vi.useRealTimers());

describe('украинские подписи дат', () => {
	it('месяцы во всех формах', () => {
		expect(monthTitle('2026-11')).toBe('Листопад 2026');
		expect(monthName('2026-01')).toBe('Січень');
		expect(monthGen('2026-02')).toBe('лютого');
		expect(monthLoc('2026-12')).toBe('грудні');
		for (let m = 1; m <= 12; m++) {
			const key = `2026-${String(m).padStart(2, '0')}`;
			for (const f of [monthName, monthGen, monthLoc]) expect(f(key), key).toBeTruthy();
		}
	});

	it('день: сьогодні, вчора, день тижня, інший рік', () => {
		expect(dayHeading('2026-11-03', TZ)).toBe('Сьогодні');
		expect(dayHeading('2026-11-02', TZ)).toBe('Вчора');
		expect(dayHeading('2026-11-01', TZ)).toBe('Неділя, 1 листопада');
		expect(dayHeading('2025-12-31', TZ)).toBe('Середа, 31 грудня 2025');
	});

	it('время операции', () => {
		expect(formatWhen(new Date('2026-11-03T07:05:00Z'), TZ)).toBe('сьогодні, 09:05');
		expect(formatWhen(new Date('2026-11-02T20:00:00Z'), TZ)).toBe('вчора, 22:00');
		expect(formatWhen(new Date('2026-10-30T16:00:00Z'), TZ)).toBe('30 жовт (пт), 18:00');
	});

	it('короткая и полная дата', () => {
		const d = new Date('2026-09-15T10:00:00Z');
		expect(formatDayShort(d, TZ)).toBe('15 вер');
		expect(formatDay(d, TZ)).toBe('15 вересня');
		expect(formatDay(new Date('2025-09-15T10:00:00Z'), TZ)).toBe('15 вересня 2025');
	});

	it('полночь по Киеву — уже следующий день', () => {
		// 22:30 UTC 2 ноября = 00:30 3 ноября в Киеве
		expect(formatWhen(new Date('2026-11-02T22:30:00Z'), TZ)).toBe('сьогодні, 00:30');
	});
});
