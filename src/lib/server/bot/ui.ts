/**
 * Кнопки, команды и значки бота — в одном месте, чтобы клавиатура внизу чата
 * и список «📋 Команди» не расходились. Кнопки «Меню» слева от поля ввода нет:
 * все команды — на экране «Команди» (см. profile.ts).
 *
 * Клавиатура внизу (открывается значком с четырьмя точками, сворачивается стрелкой «⌄») — главный пульт.
 * У неё два экрана с переходами между ними:
 *   главный  — самое частое: витрата, дохід, сьогодні, місяць, рахунки, «Команди»;
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
	/** команда: /today и т.п. (латиница — так требует Telegram) */
	command: string;
	/** подпись команды в «📋 Команди» */
	description: string;
	/** слова, которые тоже понимаем, — по-русски и по-украински */
	aliases?: string[];
	/** надписи кнопок прошлых версий: нажали такую — пришлём новую клавиатуру */
	old?: string[];
};

/** Интерфейс бота — на украинском, а понимает он и русский, и украинский. */
export const ACTIONS: Record<ActionId, Action> = {
	expense: {
		label: '− Витрата',
		style: 'danger',
		command: 'expense',
		description: 'Записати витрату — обрати категорію',
		aliases: ['витрати', 'расход', 'расходы', 'трата'],
		old: ['➖ Расход', '− Расход']
	},
	income: {
		label: '+ Дохід',
		style: 'success',
		command: 'income',
		description: 'Записати дохід — обрати категорію',
		aliases: ['доходи', 'доход', 'доходы'],
		old: ['➕ Доход', '+ Доход']
	},
	today: {
		label: '📊 Сьогодні',
		command: 'today',
		description: 'Операції за день',
		aliases: ['за сьогодні', 'сегодня', 'за сегодня'],
		old: ['📊 Сегодня']
	},
	month: {
		label: '📅 Місяць',
		command: 'month',
		description: 'Підсумки місяця',
		aliases: ['за місяць', 'месяц', 'за месяц'],
		old: ['📅 Месяц']
	},
	balance: {
		label: '💳 Рахунки',
		command: 'balance',
		description: 'Залишки на рахунках і рахунок для записів',
		aliases: ['баланс', 'залишки', 'счета', 'остатки'],
		old: ['💰 Баланс', '💳 Счета']
	},
	last: {
		label: '🧾 Історія',
		command: 'last',
		description: 'Останні операції',
		aliases: ['останні', 'история', 'последние'],
		old: ['🕘 Последние', '🧾 История']
	},
	undo: {
		label: '↩️ Скасувати',
		command: 'undo',
		description: 'Видалити останній запис',
		aliases: ['отменить', 'отмена'],
		old: ['↩️ Отменить']
	},
	categories: {
		label: '🏷 Категорії',
		command: 'categories',
		description: 'Категорії та слова, за якими я їх упізнаю',
		aliases: ['категории'],
		old: ['🏷 Категории']
	},
	help: {
		label: '❓ Допомога',
		command: 'help',
		description: 'Як користуватися',
		aliases: ['помощь'],
		old: ['❓ Помощь']
	},
	commands: {
		label: '📋 Команди',
		command: 'commands',
		description: 'Усі команди кнопками',
		aliases: ['усі команди', 'всі команди', 'ще', 'команды', 'все команды', 'ещё'],
		old: ['📋 Команды']
	},
	main: {
		label: '‹ Назад',
		style: 'primary',
		command: 'menu',
		description: 'Повернути кнопки внизу чату',
		aliases: ['меню', 'головне меню', 'главное меню']
	}
};

/** Порядок команд в «📋 Команди». */
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

export const INPUT_PLACEHOLDER = 'Сума й на що: 250 продукти';

function keyButton(id: ActionId): KeyboardButton.CommonButton {
	const { label, style } = ACTIONS[id];
	return style ? { text: label, style } : { text: label };
}

/**
 * Клавиатуру можно свернуть: в поле ввода у Telegram появляется стрелка «⌄»,
 * а открыть обратно — значком с четырьмя точками. Постоянная клавиатура
 * (is_persistent) стрелку прячет — меню тогда не убрать с экрана.
 * После нажатия кнопки клавиатура не исчезает (one_time_keyboard выключен).
 */
function replyKeyboard(rows: ActionId[][]): ReplyKeyboardMarkup {
	return {
		keyboard: rows.map((row) => row.map(keyButton)),
		resize_keyboard: true,
		is_persistent: false,
		one_time_keyboard: false,
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
const OLD_LABELS = new Set<string>();
for (const [id, action] of Object.entries(ACTIONS) as [ActionId, Action][]) {
	const old = action.old ?? [];
	for (const text of [action.label, action.command, ...(action.aliases ?? []), ...old]) {
		const key = bareLabel(text);
		if (key && !BY_LABEL.has(key)) BY_LABEL.set(key, id);
	}
	for (const text of old) OLD_LABELS.add(text);
}

/** Нажата кнопка старой клавиатуры (русской или ещё более ранней) — её пора заменить. */
export const isOldLabel = (text: string) => OLD_LABELS.has(text.trim());

/**
 * Какую кнопку нажали. Сравниваем без значков, поэтому срабатывают и кнопки
 * старой клавиатуры («💳 Счета»), и просто слово — «місяць» или «месяц».
 * Если в тексте есть цифры — это запись операции, а не кнопка: «сьогодні 250 кава».
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
