/**
 * Telegram-бот в режиме long polling — для запуска на своём компьютере или VPS:
 *   npm run bot
 * На хостинге без постоянного процесса (Vercel и т.п.) вместо этого используй вебхук:
 *   npm run bot:webhook -- https://твой-домен
 */
import 'dotenv/config';
import { createDb } from '../src/lib/server/db-client.ts';
import { COMMANDS, createBot } from '../src/lib/server/bot/bot.ts';

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
const bot = createBot(token, db);

// Polling и вебхук взаимоисключающие — снимаем вебхук, если он был установлен.
await bot.api.deleteWebhook();
await bot.api.setMyCommands(COMMANDS);

const stop = async () => {
	await bot.stop();
	await db.$disconnect();
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

await bot.start({
	drop_pending_updates: false,
	onStart: (me) => console.log(`🤖 @${me.username} запущен. Ctrl+C — остановить.`)
});
