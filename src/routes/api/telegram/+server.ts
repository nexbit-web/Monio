import { timingSafeEqual } from 'node:crypto';
import { error } from '@sveltejs/kit';
import type { Config } from '@sveltejs/adapter-vercel';
import { webhookCallback } from 'grammy';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { createBot } from '$lib/server/bot/bot';
import { prismaStore } from '$lib/server/bot/store';
import type { RequestHandler } from './$types';

/**
 * Вебхук Telegram — так бот работает на Vercel (постоянного процесса для
 * long polling там нет). Подключить: npm run bot:webhook -- https://твой-домен
 */

/** До 30 с на сообщение: запас на «просыпание» Neon после простоя. */
export const config: Config = { maxDuration: 30 };

// Один бот на экземпляр функции — его состояние общее и не содержит данных пользователей.
let handle: ((event: { request: Request }) => Promise<unknown>) | null = null;

/**
 * update_id, которые этот экземпляр уже принял. Telegram повторяет вебхук,
 * если ответ задержался, — без этой памяти трата записалась бы дважды.
 */
const seen = new Set<number>();
const SEEN_LIMIT = 1000;

function firstTime(updateId: number): boolean {
	if (seen.has(updateId)) return false;
	seen.add(updateId);
	if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value!);
	return true;
}

/** Сравнение секрета за постоянное время — по задержке ответа его не подобрать. */
function sameSecret(given: string, expected: string): boolean {
	const a = Buffer.from(given);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

export const POST: RequestHandler = async ({ request }) => {
	const token = env.TELEGRAM_BOT_TOKEN;
	const secretToken = env.TELEGRAM_WEBHOOK_SECRET;
	// без секрета вебхук выключен: принимать обновления от кого угодно нельзя
	if (!token || !secretToken) error(404, 'Not found');

	if (!sameSecret(request.headers.get('x-telegram-bot-api-secret-token') ?? '', secretToken))
		error(401, 'Unauthorized');

	const update = (await request
		.clone()
		.json()
		.catch(() => null)) as { update_id?: unknown } | null;
	if (typeof update?.update_id !== 'number') error(400, 'Bad update');
	if (!firstTime(update.update_id)) return new Response('ok');

	handle ??= webhookCallback(createBot(token, prismaStore(db)), 'sveltekit', {
		secretToken,
		timeoutMilliseconds: 25_000
	});
	// адаптер 'sveltekit' всегда отдаёт Response, но в типах grammY это unknown
	return (await handle({ request })) as Response;
};
