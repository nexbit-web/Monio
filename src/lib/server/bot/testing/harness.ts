/**
 * Стенд для тестов бота: настоящий createBot, хранилище в памяти и
 * поддельный Telegram вместо сети. Поддельный Telegram записывает каждый
 * вызов и проверяет его по правилам настоящего:
 *   - текст 1…4096 символов, HTML только из разрешённых тегов и закрыт;
 *   - callback_data 1…64 байта, у кнопок есть надпись;
 *   - всплывающий ответ на нажатие не длиннее 200 символов;
 *   - нет тусклых эмодзи (DIM_EMOJI) — значки контрастны на любой теме.
 * Нарушения копятся в problems — тест проверяет, что их нет.
 */
import type { Transformer } from 'grammy';
import type { Update, UserFromGetMe } from 'grammy/types';
import { createBot } from '../bot.ts';
import { DIM_EMOJI } from '../ui.ts';
import { memoryStore } from './memory-store.ts';

export const TG_ID = 4242;

export const BOT_INFO = {
	id: 1,
	is_bot: true,
	first_name: 'Monio',
	username: 'Monio1_bot',
	can_join_groups: false,
	can_read_all_group_messages: false,
	supports_inline_queries: false,
	can_connect_to_business: false,
	has_main_web_app: false
} as UserFromGetMe;

const ALLOWED_TAGS = new Set([
	'b',
	'strong',
	'i',
	'em',
	'u',
	'ins',
	's',
	'strike',
	'del',
	'code',
	'pre',
	'a',
	'tg-spoiler',
	'blockquote'
]);

/** Ошибки разметки HTML так, как их видит Telegram; пустой массив — всё хорошо. */
export function htmlProblems(text: string): string[] {
	const problems: string[] = [];
	const stack: string[] = [];
	const tag = /<(\/?)([a-z-]+)(?:\s[^<>]*)?>/g;
	let rest = '';
	let last = 0;
	for (let m = tag.exec(text); m; m = tag.exec(text)) {
		rest += text.slice(last, m.index);
		last = tag.lastIndex;
		const [, closing, name] = m;
		if (!ALLOWED_TAGS.has(name)) problems.push(`тег <${name}> не поддерживается`);
		if (!closing) stack.push(name);
		else if (stack.pop() !== name) problems.push(`тег </${name}> закрыт не по порядку`);
	}
	rest += text.slice(last);
	if (stack.length) problems.push(`не закрыты: ${stack.join(', ')}`);
	if (/[<>]/.test(rest)) problems.push('неэкранированный < или >');
	if (/&(?!(amp|lt|gt|quot|#\d+);)/.test(rest)) problems.push('неэкранированный &');
	return problems;
}

type Button = { text: string; callback_data?: string; style?: string };
type Markup = {
	inline_keyboard?: Button[][];
	keyboard?: (Button | string)[][];
	input_field_placeholder?: string;
};

export type Call = { method: string; payload: Record<string, unknown> };

export function fakeTelegram() {
	const calls: Call[] = [];
	const problems: string[] = [];
	const failures: { method: string; code: number; description: string; times: number }[] = [];
	let messageId = 1000;

	function checkText(where: string, text: unknown, max: number) {
		if (typeof text !== 'string' || text.length === 0) {
			problems.push(`${where}: пустой текст`);
			return;
		}
		if (text.length > max) problems.push(`${where}: ${text.length} символов, предел ${max}`);
		for (const e of DIM_EMOJI)
			if (text.includes(e)) problems.push(`${where}: тусклый значок ${e} в «${text.slice(0, 60)}»`);
	}

	function check(method: string, p: Record<string, unknown>) {
		if ('text' in p) {
			checkText(method, p.text, method === 'answerCallbackQuery' ? 200 : 4096);
			if (p.parse_mode === 'HTML')
				for (const x of htmlProblems(p.text as string)) problems.push(`${method}: ${x}`);
		}
		const markup = p.reply_markup as Markup | undefined;
		for (const row of markup?.inline_keyboard ?? [])
			for (const b of row) {
				checkText(`${method}/кнопка`, b.text, 128);
				const size = Buffer.byteLength(b.callback_data ?? '', 'utf8');
				if (size < 1 || size > 64)
					problems.push(`${method}: callback_data «${b.callback_data}» — ${size} байт`);
			}
		for (const row of markup?.keyboard ?? [])
			for (const b of row)
				checkText(`${method}/клавиатура`, typeof b === 'string' ? b : b.text, 128);
		if ((markup?.input_field_placeholder?.length ?? 0) > 64)
			problems.push(`${method}: подсказка в поле ввода длиннее 64`);
	}

	const transformer: Transformer = async (_prev, method, payload) => {
		const p = (payload ?? {}) as Record<string, unknown>;
		calls.push({ method, payload: p });
		check(method, p);

		const fail = failures.find((f) => f.method === method && f.times > 0);
		if (fail) {
			fail.times--;
			return { ok: false, error_code: fail.code, description: fail.description } as never;
		}

		const chat = { id: TG_ID, type: 'private', first_name: 'Тест' };
		const message = (id: number) => ({
			message_id: id,
			date: Math.floor(Date.now() / 1000),
			chat,
			text: p.text
		});
		let result: unknown = true;
		if (method === 'sendMessage') result = message(++messageId);
		if (method === 'editMessageText' || method === 'editMessageReplyMarkup')
			result = message(Number(p.message_id ?? 0));
		return { ok: true, result } as never;
	};

	const of = (method: string) => calls.filter((c) => c.method === method).map((c) => c.payload);
	const lastOf = (method: string) => {
		const list = of(method);
		if (!list.length) throw new Error(`${method} не вызывался`);
		return list[list.length - 1];
	};

	return {
		transformer,
		calls,
		problems,
		/** следующие times вызовов method вернут ошибку Telegram */
		fail(method: string, description: string, { code = 400, times = 1 } = {}) {
			failures.push({ method, code, description, times });
		},
		reset() {
			calls.length = 0;
		},
		sent: () => of('sendMessage'),
		lastSent: () => lastOf('sendMessage'),
		lastText: () => lastOf('sendMessage').text as string,
		edits: () => of('editMessageText'),
		lastEdit: () => lastOf('editMessageText'),
		answers: () => of('answerCallbackQuery'),
		lastAnswer: () => lastOf('answerCallbackQuery'),
		methods: () => calls.map((c) => c.method)
	};
}

/** Все кнопки под сообщением одним списком. */
export function buttons(payload: Record<string, unknown>): Button[] {
	const markup = payload.reply_markup as Markup | undefined;
	return (markup?.inline_keyboard ?? []).flat();
}

export const callbacks = (payload: Record<string, unknown>) =>
	buttons(payload).map((b) => b.callback_data!);

/** Надписи клавиатуры внизу чата по рядам. */
export function keyboardRows(payload: Record<string, unknown>): string[][] {
	const markup = payload.reply_markup as Markup | undefined;
	return (markup?.keyboard ?? []).map((row) =>
		row.map((b) => (typeof b === 'string' ? b : b.text))
	);
}

// ── Обновления от «пользователя» ────────────────────────────────────────

let updateId = 0;
const nowSec = () => Math.floor(Date.now() / 1000);
const person = (id: number) => ({ id, is_bot: false, first_name: 'Тест', username: 'tester' });
const privateChat = (id: number) => ({ id, type: 'private' as const, first_name: 'Тест' });

export function textUpdate(
	text: string,
	{ from = TG_ID, date = nowSec(), group = false } = {}
): Update {
	const command = /^\/\S+/.exec(text)?.[0];
	return {
		update_id: ++updateId,
		message: {
			message_id: ++updateId,
			date,
			chat: group ? { id: -100, type: 'group', title: 'Группа' } : privateChat(from),
			from: person(from),
			text,
			...(command && { entities: [{ type: 'bot_command', offset: 0, length: command.length }] })
		}
	} as Update;
}

export function tapUpdate(data: string, { from = TG_ID, messageId = 777 } = {}): Update {
	return {
		update_id: ++updateId,
		callback_query: {
			id: `cb${++updateId}`,
			from: person(from),
			chat_instance: 'ci',
			data,
			message: { message_id: messageId, date: nowSec(), chat: privateChat(from), text: '…' }
		}
	} as Update;
}

export function stickerUpdate({ from = TG_ID } = {}): Update {
	return {
		update_id: ++updateId,
		message: {
			message_id: ++updateId,
			date: nowSec(),
			chat: privateChat(from),
			from: person(from),
			sticker: {
				file_id: 'f',
				file_unique_id: 'u',
				type: 'regular',
				width: 512,
				height: 512,
				is_animated: false,
				is_video: false
			}
		}
	} as Update;
}

/**
 * Бот с привязанным пользователем (стартовые категории и счета: Карта —
 * основной, Наличные) и поддельным Telegram.
 */
export function setup({ linked = true } = {}) {
	const mem = memoryStore();
	const userId = mem.addUser();
	if (linked) mem.linkTelegram(userId, BigInt(TG_ID));

	const bot = createBot('123:TEST', mem.store, { botInfo: BOT_INFO });
	const tg = fakeTelegram();
	bot.api.config.use(tg.transformer);

	return {
		mem,
		bot,
		tg,
		userId,
		send: (text: string, opts?: Parameters<typeof textUpdate>[1]) =>
			bot.handleUpdate(textUpdate(text, opts)),
		tap: (data: string, opts?: Parameters<typeof tapUpdate>[1]) =>
			bot.handleUpdate(tapUpdate(data, opts)),
		cat: (name: string, kind?: 'EXPENSE' | 'INCOME') => mem.category(userId, name, kind),
		acc: (name: string) => mem.account(userId, name),
		/** последняя записанная операция */
		lastTx: () => mem.txs[mem.txs.length - 1]
	};
}
