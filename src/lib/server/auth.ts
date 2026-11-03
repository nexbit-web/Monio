import { randomBytes, createHash } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from './db';
import { createLimiter } from './rate-limit';

export { checkPassword, hashPassword, passwordProblem, verifyPassword } from './password';

export const SESSION_COOKIE = 'monio_session';
const SESSION_TTL_DAYS = 60;

/**
 * Против подбора пароля: 5 неудач по одной почте за 15 минут — и вход по ней
 * закрыт до конца окна; 30 неудач с одного адреса — закрыт для всех почт.
 */
export const loginLimits = {
	email: createLimiter({ max: 5, windowMs: 15 * 60_000 }),
	ip: createLimiter({ max: 30, windowMs: 15 * 60_000 })
};

/** В базе лежит только хэш токена: утечка базы не даёт войти по чужой сессии. */
function hashToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, event: RequestEvent) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 864e5);

	await db.$transaction([
		db.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } }),
		db.session.create({ data: { id: hashToken(token), userId, expiresAt } })
	]);

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

/** Выйти на всех устройствах, кроме этого. Возвращает, скольких выкинули. */
export async function revokeOtherSessions(userId: string, event: RequestEvent): Promise<number> {
	const token = event.cookies.get(SESSION_COOKIE);
	const { count } = await db.session.deleteMany({
		where: { userId, ...(token && { NOT: { id: hashToken(token) } }) }
	});
	return count;
}

/** Сколько устройств сейчас в аккаунте. */
export function activeSessions(userId: string): Promise<number> {
	return db.session.count({ where: { userId, expiresAt: { gt: new Date() } } });
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
