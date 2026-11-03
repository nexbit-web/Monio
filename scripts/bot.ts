/**
 * Telegram-бот в режиме long polling — для запуска на своём компьютере или VPS:
 *   npm run bot
 * На хостинге без постоянного процесса (Vercel и т.п.) вместо этого используй вебхук:
 *   npm run bot:webhook -- https://твой-домен
 *
 * Сообщения, отправленные, пока бот был выключен, не теряются: при запуске он
 * их обработает, а время операции возьмёт из самого сообщения.
 */
import 'dotenv/config';
import { GrammyError } from 'grammy';
import { createDb } from '../src/lib/server/db-client.ts';
import { createBot } from '../src/lib/server/bot/bot.ts';
import { syncProfile } from '../src/lib/server/bot/profile.ts';
import { prismaStore } from '../src/lib/server/bot/store.ts';

const token = process.env.TELEGRAM_BOT_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
if (!token) {
	console.error('TELEGRAM_BOT_TOKEN не задан. Создай бота у @BotFather и впиши токен в .env');
	process.exit(1);
}
if (!databaseUrl) {
	console.error('DATABASE_URL не задан. Скопируй .env.example в .env и вставь строку Neon.');
	process.exit(1);
}

const db = createDb(databaseUrl);
const bot = createBot(token, prismaStore(db));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Компьютер мог только что проснуться, и сети ещё нет, — ждём её, а не падаем.
for (let attempt = 1; ; attempt++) {
	try {
		await bot.init();
		break;
	} catch (err) {
		if (err instanceof GrammyError && err.error_code === 401) {
			console.error('Telegram не принял токен — проверь TELEGRAM_BOT_TOKEN в .env');
			process.exit(1);
		}
		const delay = Math.min(30, attempt * 5);
		console.warn(`Telegram недоступен (${(err as Error).message}). Повтор через ${delay} с…`);
		await sleep(delay * 1000);
	}
}

// Polling и вебхук взаимоисключающие. Если бот уже работает на Vercel через вебхук,
// локальный запуск снял бы его — и сообщения перестали бы доходить до сайта.
const hook = await bot.api.getWebhookInfo();
if (hook.url && !process.argv.includes('--force')) {
	console.error(
		[
			`Бот уже работает через вебхук: ${hook.url}`,
			'Локальный запуск отключил бы его. Если точно нужно: npm run bot -- --force',
			'(потом верни вебхук: npm run bot:webhook -- https://твой-домен).'
		].join('\n')
	);
	await db.$disconnect();
	process.exit(1);
}
await bot.api.deleteWebhook();
try {
	const changed = await syncProfile(bot.api);
	if (changed.length) console.log(`Профиль бота обновлён: ${changed.join(', ')}.`);
} catch (err) {
	// не мешает работе — попробуем при следующем запуске
	console.warn('Не удалось обновить меню и описание бота:', (err as Error).message);
}

const stop = async () => {
	await bot.stop();
	await db.$disconnect();
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

try {
	await bot.start({
		drop_pending_updates: false,
		allowed_updates: ['message', 'callback_query'],
		onStart: (me) => console.log(`🤖 @${me.username} запущен. Ctrl+C — остановить.`)
	});
} catch (err) {
	if (err instanceof GrammyError && err.error_code === 409) {
		console.error(
			'Этот бот уже запущен в другом окне или на сервере. Останови тот экземпляр — два сразу Telegram не разрешает.'
		);
	} else {
		console.error('Бот остановился с ошибкой:', err);
	}
	await db.$disconnect();
	process.exit(1);
}
