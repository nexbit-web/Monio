/**
 * Подключает бота к задеплоенной CRM через вебхук:
 *   npm run bot:webhook -- https://monio.example.com
 * Telegram будет слать обновления на <url>/api/telegram с секретом из TELEGRAM_WEBHOOK_SECRET.
 */
import 'dotenv/config';
import { Api } from 'grammy';
import { syncProfile } from '../src/lib/server/bot/profile.ts';

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = process.argv[2]?.replace(/\/+$/, '');

if (!token || !secret) {
	console.error('Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_WEBHOOK_SECRET в .env');
	process.exit(1);
}
if (!/^[A-Za-z0-9_-]{32,256}$/.test(secret)) {
	console.error(
		'TELEGRAM_WEBHOOK_SECRET слишком простой: нужно 32–256 символов A-Z a-z 0-9 _ -.\n' +
			`Сгенерировать: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
	);
	process.exit(1);
}
if (!base || !base.startsWith('https://')) {
	console.error('Укажи публичный https-адрес CRM: npm run bot:webhook -- https://твой-домен');
	process.exit(1);
}

const api = new Api(token);
await api.setWebhook(`${base}/api/telegram`, {
	secret_token: secret,
	allowed_updates: ['message', 'callback_query']
});
const changed = await syncProfile(api);
if (changed.length) console.log(`Профиль бота обновлён: ${changed.join(', ')}.`);

const info = await api.getWebhookInfo();
console.log(`✅ Вебхук: ${info.url}`);
if (info.last_error_message) console.log(`Последняя ошибка Telegram: ${info.last_error_message}`);
