import { describe, expect, it } from 'vitest';
import {
	KNOWN_PASSWORDS,
	MIN_PASSWORD,
	checkPassword,
	hashPassword,
	passwordProblem,
	verifyPassword
} from './password';

describe('хэш пароля', () => {
	it('свой пароль подходит, чужой — нет', async () => {
		const hash = await hashPassword('правильный-пароль');
		expect(await verifyPassword(hash, 'правильный-пароль')).toBe(true);
		expect(await verifyPassword(hash, 'правильный-парол')).toBe(false);
		expect(await verifyPassword(hash, '')).toBe(false);
	});

	it('пароль не хранится открыто, соль каждый раз новая', async () => {
		const a = await hashPassword('одинаковый пароль');
		const b = await hashPassword('одинаковый пароль');
		expect(a).not.toContain('одинаковый');
		expect(a).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
		expect(a).not.toBe(b);
	});

	it('одинаковые на вид символы в разной записи Unicode — один пароль', async () => {
		const hash = await hashPassword('ﬁle-пароль'); // лигатура «ﬁ»
		expect(await verifyPassword(hash, 'file-пароль')).toBe(true);
	});

	it('испорченный хэш не пускает', async () => {
		for (const bad of ['', 'plain', 'scrypt$', 'bcrypt$aa$bb', 'scrypt$00$00'])
			expect(await verifyPassword(bad, 'x')).toBe(false);
	});
});

describe('checkPassword — без подсказок по времени', () => {
	it('нет пользователя — false, но scrypt всё равно выполняется', async () => {
		const hash = await hashPassword('secret-secret');
		const t0 = performance.now();
		expect(await checkPassword(null, 'secret-secret')).toBe(false);
		const missing = performance.now() - t0;
		const t1 = performance.now();
		expect(await checkPassword(hash, 'wrong-wrong')).toBe(false);
		const wrong = performance.now() - t1;
		// оба пути считают scrypt: разница не в разы
		expect(missing).toBeGreaterThan(wrong / 5);
	});

	it('есть пользователь — обычная проверка', async () => {
		const hash = await hashPassword('secret-secret');
		expect(await checkPassword(hash, 'secret-secret')).toBe(true);
	});
});

describe('passwordProblem — требования к паролю', () => {
	it('короткий', () => {
		expect(passwordProblem('a'.repeat(MIN_PASSWORD - 1))).toContain(`${MIN_PASSWORD}`);
	});

	it('известные пароли, в том числе демо из кода', () => {
		expect(KNOWN_PASSWORDS).toContain('demo12345');
		expect(passwordProblem('1234567890')).toContain('известный');
		expect(passwordProblem('Password1'.padEnd(9))).not.toBeNull();
	});

	it('один символ много раз и совпадение с почтой', () => {
		expect(passwordProblem('aaaaaaaaaaaa')).toContain('повторяющегося');
		expect(passwordProblem('me@mail.com', 'me@mail.com')).toContain('почтой');
	});

	it('нормальный пароль проходит', () => {
		expect(passwordProblem('синий-кит-летит-2026')).toBeNull();
		expect(passwordProblem('x'.repeat(201))).toContain('длинный');
	});
});
