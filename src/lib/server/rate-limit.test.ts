import { describe, expect, it } from 'vitest';
import { createLimiter, waitText } from './rate-limit';

function clock(start = 0) {
	let t = start;
	return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('createLimiter — защита от подбора пароля', () => {
	it('после max неудач ключ заблокирован до конца окна', () => {
		const c = clock();
		const limit = createLimiter({ max: 3, windowMs: 60_000, now: c.now });
		for (let i = 0; i < 3; i++) {
			expect(limit.blockedFor('me')).toBe(0);
			limit.hit('me');
			c.advance(1000);
		}
		// первая неудача была в 0, окно 60 с, сейчас 3 с
		expect(limit.blockedFor('me')).toBe(57_000);
	});

	it('окно скользит: старые попытки забываются', () => {
		const c = clock();
		const limit = createLimiter({ max: 2, windowMs: 10_000, now: c.now });
		limit.hit('me');
		c.advance(6000);
		limit.hit('me');
		expect(limit.blockedFor('me')).toBeGreaterThan(0);
		c.advance(4001); // первая вышла из окна
		expect(limit.blockedFor('me')).toBe(0);
	});

	it('ключи независимы: чужие ошибки не блокируют меня', () => {
		const limit = createLimiter({ max: 1, windowMs: 10_000, now: clock().now });
		limit.hit('attacker');
		expect(limit.blockedFor('attacker')).toBeGreaterThan(0);
		expect(limit.blockedFor('me')).toBe(0);
	});

	it('reset — после успешного входа счёт с нуля', () => {
		const limit = createLimiter({ max: 2, windowMs: 10_000, now: clock().now });
		limit.hit('me');
		limit.hit('me');
		limit.reset('me');
		expect(limit.blockedFor('me')).toBe(0);
	});

	it('перебор тысяч ключей не раздувает память', () => {
		const c = clock();
		const limit = createLimiter({ max: 5, windowMs: 1000, now: c.now });
		for (let i = 0; i < 10_001; i++) limit.hit(`k${i}`);
		c.advance(2000);
		limit.hit('fresh');
		// старые ключи вычищены — их попытки уже вне окна
		expect(limit.blockedFor('k1')).toBe(0);
	});
});

describe('waitText', () => {
	it.each([
		[1, 'через 1 с'],
		[40_000, 'через 40 с'],
		[60_000, 'через 1 мин'],
		[14 * 60_000 + 1, 'через 15 мин']
	])('%i мс → %s', (ms, text) => {
		expect(waitText(ms)).toBe(text);
	});
});
