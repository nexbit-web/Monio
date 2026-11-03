import { error } from '@sveltejs/kit';
import { webhookCallback } from 'grammy';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { createBot } from '$lib/server/bot/bot';
import type { RequestHandler } from './$types';

// Один бот на процесс (не на пользователя) — его состояние общее и не содержит данных пользователей.
let handle: ((event: { request: Request }) => Promise<unknown>) | null = null;

/**
 * Вебхук Telegram. Секрет проверяет сам grammY по заголовку
 * X-Telegram-Bot-Api-Secret-Token; без настроенного секрета эндпоинт выключен.
 */
export const POST: RequestHandler = async ({ request }) => {
	const token = env.TELEGRAM_BOT_TOKEN;
	const secretToken = env.TELEGRAM_WEBHOOK_SECRET;
	if (!token || !secretToken) error(404, 'Not found');

	handle ??= webhookCallback(createBot(token, db), 'sveltekit', { secretToken });
	// адаптер 'sveltekit' всегда отдаёт Response, но в типах grammY это unknown
	return (await handle({ request })) as Response;
};
