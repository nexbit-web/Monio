import { timingSafeEqual } from 'node:crypto';
import { error, json } from '@sveltejs/kit';
import type { Config } from '@sveltejs/adapter-vercel';
import { Api } from 'grammy';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { sendDueReports } from '$lib/server/bot/reports';
import { autoRetry } from '$lib/server/bot/retry';
import { prismaStore } from '$lib/server/bot/store';
import type { RequestHandler } from './$types';

/**
 * Отчёты бота по расписанию. Vercel Cron (vercel.json) зовёт этот адрес раз в
 * день вечером; что кому слать — отчёт за неделю в воскресенье, итоги месяца
 * 1-го числа — решает sendDueReports по часовому поясу пользователя.
 *
 * Vercel присылает заголовок «Authorization: Bearer <CRON_SECRET>». Без
 * CRON_SECRET адрес выключен — иначе любой мог бы засыпать чат отчётами.
 * Проверить вручную: curl -H "Authorization: Bearer $CRON_SECRET" https://<домен>/api/cron/reports
 */

export const config: Config = { maxDuration: 60 };

function sameSecret(given: string, expected: string): boolean {
	const a = Buffer.from(given);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

export const GET: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET;
	const token = env.TELEGRAM_BOT_TOKEN;
	if (!secret || !token) error(404, 'Not found');
	if (!sameSecret(request.headers.get('authorization') ?? '', `Bearer ${secret}`))
		error(401, 'Unauthorized');

	const api = new Api(token);
	api.config.use(autoRetry());
	const run = await sendDueReports(prismaStore(db), api);
	console.log('[reports]', JSON.stringify(run));
	return json(run, { headers: { 'cache-control': 'no-store' } });
};
