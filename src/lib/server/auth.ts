import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from './db';

const scrypt = promisify(scryptCb) as (
	password: string,
	salt: Buffer,
	keylen: number
) => Promise<Buffer>;

export const SESSION_COOKIE = 'moneta_session';
const SESSION_TTL_DAYS = 60;

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

function hashToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, event: RequestEvent) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 864e5);

	await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });

	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !import.meta.env.DEV,
		expires: expiresAt
	});
}

export async function destroySession(event: RequestEvent) {
	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		await db.session.deleteMany({ where: { id: hashToken(token) } });
	}
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function resolveUser(token: string | undefined) {
	if (!token) return null;

	const session = await db.session.findUnique({
		where: { id: hashToken(token) },
		include: { user: true }
	});

	if (!session) return null;

	if (session.expiresAt.getTime() < Date.now()) {
		await db.session.delete({ where: { id: session.id } }).catch(() => {});
		return null;
	}

	return session.user;
}
