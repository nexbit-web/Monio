import { randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { db } from './db';

const CODE_TTL_MS = 15 * 60_000;

/** Одноразовый код для ссылки t.me/<бот>?start=<code>. 96 бит случайности, живёт 15 минут. */
export async function createLinkCode(userId: string): Promise<{ code: string; expiresAt: Date }> {
	const code = randomBytes(12).toString('base64url');
	const expiresAt = new Date(Date.now() + CODE_TTL_MS);
	await db.$transaction([
		db.telegramLinkCode.deleteMany({ where: { userId } }),
		db.telegramLinkCode.create({ data: { code, userId, expiresAt } })
	]);
	return { code, expiresAt };
}

let cachedUsername: string | null = null;

/** Имя бота для ссылки; null, если токен не настроен или Telegram недоступен. */
export async function botUsername(): Promise<string | null> {
	if (cachedUsername) return cachedUsername;
	const token = env.TELEGRAM_BOT_TOKEN;
	if (!token) return null;
	try {
		const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
			signal: AbortSignal.timeout(5000)
		});
		const body = (await res.json()) as { ok: boolean; result?: { username?: string } };
		cachedUsername = body.ok ? (body.result?.username ?? null) : null;
	} catch {
		return null;
	}
	return cachedUsername;
}

export const isBotConfigured = () => Boolean(env.TELEGRAM_BOT_TOKEN);
