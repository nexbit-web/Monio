/**
 * Кнопки, команды и значки бота — в одном месте, чтобы меню Telegram,
 * клавиатура внизу чата и список «Все команды» не расходились.
 *
 * Клавиатура внизу (иконка с четырьмя точками в поле ввода) — главный пульт.
 * У неё два экрана с переходами между ними:
 *   главный  — самое частое: расход, доход, сегодня, месяц, счета, «Команды»;
 *   команды  — все команды бота кнопками и «‹ Назад».
 *
 * Значки. В Telegram эмодзи рисуются одинаково на светлой и тёмной теме,
 * поэтому серые и чёрные (➕ ➖ 🗑 ⚙️ 🎮 …) на тёмной почти не видны. Правило:
 * на цветных кнопках (style) — простые знаки «−», «+», «✕», «‹», они белые
 * на красном/зелёном/синем; на обычных — только яркие цветные эмодзи.
 * Список запрещённых тусклых — DIM_EMOJI, тесты проверяют каждое сообщение.
 */
import type {
	InlineKeyboardButton,
	InlineKeyboardMarkup,
	KeyboardButton,
	ReplyKeyboardMarkup
} from 'grammy/types';

export type ButtonStyle = 'danger' | 'success' | 'primary';

export type ActionId =
	| 'expense'
	| 'income'
	| 'today'
	| 'month'
	| 'balance'
	| 'last'
	| 'undo'
	| 'categories'
	| 'help'
	| 'commands'
	| 'main';

type Action = {
	/** надпись на кнопке клавиатуры */
	label: string;
	style?: ButtonStyle;
	/** команда в меню Telegram */
	command: string;
	/** подпись команды в меню (до 256 символов) */
	description: string;
	/** старые надписи кнопок и слова, которые тоже понимаем */
	aliases?: string[];
};

export const ACTIONS: Record<ActionId, Action> = {
	expense: {
		label: '− Расход',
		style: 'danger',
		command: 'expense',
		description: 'Записать расход — выбрать категорию',
		aliases: ['➖ Расход', 'расходы', 'витрата', 'витрати']
	},
	income: {
		label: '+ Доход',
		style: 'success',
		command: 'income',
		description: 'Записать доход — выбрать категорию',
		aliases: ['➕ Доход', 'доходы', 'дохід', 'доходи']
	},
	today: {
		label: '📊 Сегодня',
		command: 'today',
		description: 'Операции за день',
		aliases: ['сьогодні', 'за сегодня']
	},
	month: {
		label: '📅 Месяц',
		command: 'month',
		description: 'Итоги месяца',
		aliases: ['місяць', 'за месяц']
	},
	balance: {
		label: '💳 Счета',
		command: 'balance',
		description: 'Остатки по счетам и счёт для записей',
		aliases: ['💰 Баланс', 'баланс', 'рахунки', 'остатки']
	},
	last: {
		label: '🧾 История',
		command: 'last',
		description: 'Последние операции',
		aliases: ['🕘 Последние', 'последние', 'історія']
	},
	undo: {
		label: '↩️ Отменить',
		command: 'undo',
		description: 'Удалить последнюю запись',
		aliases: ['скасувати']
	},
	categories: {
		label: '🏷 Категории',
		command: 'categories',
		description: 'Категории и слова, по которым я их узнаю',
		aliases: ['категорії']
	},
	help: {
		label: '❓ Помощь',
		command: 'help',
		description: 'Как пользоваться',
		aliases: ['допомога', 'help']
	},
	commands: {
		label: '📋 Команды',
		command: 'commands',
		description: 'Все команды кнопками',
		aliases: ['все команды', 'команди', 'ещё']
	},
	main: {
		label: '‹ Назад',
		style: 'primary',
		command: 'menu',
		description: 'Вернуть кнопки внизу чата',
		aliases: ['меню', 'главное меню', 'головне меню']
	}
};

/** Порядок команд в меню Telegram и в «Все команды». */
export const COMMAND_ORDER: ActionId[] = [
	'expense',
	'income',
	'today',
	'month',
	'balance',
	'last',
	'undo',
	'categories',
	'commands',
	'main',
	'help'
];

/** Для setMyCommands. */
export const COMMANDS = COMMAND_ORDER.map((id) => ({
	command: ACTIONS[id].command,
	description: ACTIONS[id].description
}));

/** Главный экран клавиатуры: крупные кнопки самого частого. */
export const MAIN_ROWS: ActionId[][] = [
	['expense', 'income'],
	['today', 'month'],
	['balance', 'commands']
];

/** Экран «Команды»: всё, что умеет бот. */
export const COMMAND_ROWS: ActionId[][] = [
	['expense', 'income'],
	['today', 'month', 'balance'],
	['last', 'undo', 'categories'],
	['help', 'main']
];

export const INPUT_PLACEHOLDER = 'Сумма и на что: 250 продукты';

function keyButton(id: ActionId): KeyboardButton.CommonButton {
	const { label, style } = ACTIONS[id];
	return style ? { text: label, style } : { text: label };
}

function replyKeyboard(rows: ActionId[][]): ReplyKeyboardMarkup {
	return {
		keyboard: rows.map((row) => row.map(keyButton)),
		resize_keyboard: true,
		is_persistent: true,
		input_field_placeholder: INPUT_PLACEHOLDER
	};
}

export const mainKeyboard = replyKeyboard(MAIN_ROWS);
export const commandsKeyboard = replyKeyboard(COMMAND_ROWS);

/** «📊 Сегодня» → «сегодня»: без значков, знаков и лишних пробелов. */
function bareLabel(text: string): string {
	return text
		.toLowerCase()
		.replace(/ё/g, 'е')
		.replace(/[^\p{L}\s]/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

const BY_LABEL = new Map<string, ActionId>();
for (const [id, action] of Object.entries(ACTIONS) as [ActionId, Action][]) {
	for (const text of [action.label, action.command, ...(action.aliases ?? [])]) {
		const key = bareLabel(text);
		if (key && !BY_LABEL.has(key)) BY_LABEL.set(key, id);
	}
}

/**
 * Какую кнопку нажали. Сравниваем без значков, поэтому срабатывают и кнопки
 * старой клавиатуры («💰 Баланс»), и просто слово «месяц». Если в тексте есть
 * цифры — это запись операции, а не кнопка: «сегодня 250 кофе».
 */
export function matchButton(text: string): ActionId | null {
	if (/\d/.test(text) || text.length > 40) return null;
	return BY_LABEL.get(bareLabel(text)) ?? null;
}

// ── Кнопки под сообщениями ──────────────────────────────────────────────

export function btn(text: string, data: string, style?: ButtonStyle): InlineKeyboardButton {
	return style ? { text, callback_data: data, style } : { text, callback_data: data };
}

export function grid(buttons: InlineKeyboardButton[], cols = 2): InlineKeyboardButton[][] {
	const rows: InlineKeyboardButton[][] = [];
	for (let i = 0; i < buttons.length; i += cols) rows.push(buttons.slice(i, i + cols));
	return rows;
}

export const inline = (rows: InlineKeyboardButton[][]): InlineKeyboardMarkup => ({
	inline_keyboard: rows.filter((r) => r.length > 0)
});

/**
 * Тусклые эмодзи: серые, чёрные или почти белые — теряются на тёмной или
 * светлой теме. В текстах и кнопках бота их быть не должно (проверяют тесты).
 */
export const DIM_EMOJI = [
	'➕',
	'➖',
	'✖',
	'➗',
	'✔',
	'🗑',
	'⚙',
	'🔙',
	'🔚',
	'🔜',
	'🔝',
	'🎮',
	'🐾',
	'🛠',
	'🖥',
	'🔧',
	'🔩',
	'🔌',
	'⬛',
	'▪',
	'◾',
	'◼',
	'🖤',
	'🎬',
	'🏋',
	'🍽',
	'✈',
	'🛒',
	'🕘',
	'❔',
	'❕'
];
