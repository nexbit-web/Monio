/**
 * Пароли: scrypt с солью, сравнение за постоянное время. Отдельно от auth.ts —
 * без базы, чтобы проверять тестами.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
	password: string,
	salt: Buffer,
	keylen: number
) => Promise<Buffer>;

export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 200;

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const key = await scrypt(password.normalize('NFKC'), salt, 64);
	return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
	const [scheme, saltHex, keyHex] = hash.split('$');
	if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;
	const key = await scrypt(password.normalize('NFKC'), Buffer.from(saltHex, 'hex'), 64);
	const expected = Buffer.from(keyHex, 'hex');
	if (expected.length !== key.length) return false;
	return timingSafeEqual(key, expected);
}

let dummy: Promise<string> | null = null;

/**
 * Проверка пароля, которая тратит одинаковое время, есть ли такой пользователь
 * или нет: иначе по скорости ответа можно узнать, какая почта зарегистрирована.
 */
export async function checkPassword(hash: string | null | undefined, password: string) {
	if (hash) return verifyPassword(hash, password);
	dummy ??= hashPassword(randomBytes(16).toString('hex'));
	await verifyPassword(await dummy, password);
	return false;
}

/** Пароль демо-аккаунта опубликован в коде — им входить нельзя. */
export const KNOWN_PASSWORDS = [
	'demo12345',
	'12345678',
	'123456789',
	'1234567890',
	'qwerty123',
	'qwertyuiop',
	'password',
	'password1',
	'11111111',
	'00000000'
];

/** Почему пароль не годится; null — годится. */
export function passwordProblem(password: string, email = ''): string | null {
	if (password.length < MIN_PASSWORD) return `Пароль — от ${MIN_PASSWORD} символов`;
	if (password.length > MAX_PASSWORD) return 'Слишком длинный пароль';
	const lower = password.toLowerCase();
	if (KNOWN_PASSWORDS.includes(lower)) return 'Этот пароль слишком известный — придумай другой';
	if (/^(.)\1+$/.test(password)) return 'Пароль из одного повторяющегося символа — слишком простой';
	if (email && lower === email.toLowerCase()) return 'Пароль не должен совпадать с почтой';
	return null;
}
