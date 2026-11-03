import { describe, expect, it } from 'vitest';
import {
	ACTIONS,
	COMMANDS,
	COMMAND_ORDER,
	COMMAND_ROWS,
	DIM_EMOJI,
	INPUT_PLACEHOLDER,
	MAIN_ROWS,
	btn,
	commandsKeyboard,
	grid,
	inline,
	mainKeyboard,
	matchButton,
	type ActionId
} from './ui.ts';

const ids = Object.keys(ACTIONS) as ActionId[];
const emoji = /\p{Extended_Pictographic}/u;

describe('команды для меню Telegram', () => {
	it('имена и описания по правилам Telegram', () => {
		expect(COMMANDS.length).toBeLessThanOrEqual(100);
		for (const { command, description } of COMMANDS) {
			expect(command).toMatch(/^[a-z0-9_]{1,32}$/);
			expect(description.length).toBeGreaterThan(0);
			expect(description.length).toBeLessThanOrEqual(256);
		}
	});

	it('без повторов, и в меню есть каждое действие', () => {
		const names = COMMANDS.map((c) => c.command);
		expect(new Set(names).size).toBe(names.length);
		expect([...COMMAND_ORDER].sort()).toEqual([...ids].sort());
	});

	it('/start не занят: он для привязки', () => {
		expect(COMMANDS.map((c) => c.command)).not.toContain('start');
	});
});

describe('клавиатура внизу', () => {
	it('главный экран: расход и доход первыми, «Команды» — вход в остальное', () => {
		expect(MAIN_ROWS[0]).toEqual(['expense', 'income']);
		expect(MAIN_ROWS.flat()).toContain('commands');
		expect(MAIN_ROWS.every((row) => row.length <= 3)).toBe(true);
	});

	it('экран «Команды»: все команды кнопками и путь назад', () => {
		const shown = new Set(COMMAND_ROWS.flat());
		for (const id of ids.filter((id) => id !== 'commands')) expect(shown, id).toContain(id);
		expect(COMMAND_ROWS.at(-1)).toContain('main');
	});

	it('расход — красная кнопка, доход — зелёная, назад — синяя', () => {
		const first = mainKeyboard.keyboard[0];
		expect(first).toEqual([
			{ text: '− Расход', style: 'danger' },
			{ text: '+ Доход', style: 'success' }
		]);
		expect(commandsKeyboard.keyboard.flat()).toContainEqual({ text: '‹ Назад', style: 'primary' });
	});

	it('клавиатура всегда под рукой, компактная, с подсказкой в поле ввода', () => {
		for (const kb of [mainKeyboard, commandsKeyboard]) {
			expect(kb.is_persistent).toBe(true);
			expect(kb.resize_keyboard).toBe(true);
			expect(kb.input_field_placeholder).toBe(INPUT_PLACEHOLDER);
		}
		expect(INPUT_PLACEHOLDER.length).toBeLessThanOrEqual(64);
	});

	it('на цветных кнопках — простые знаки, без эмодзи: они белые на любом цвете', () => {
		for (const id of ids) {
			const { label, style } = ACTIONS[id];
			if (style) expect(label, label).not.toMatch(emoji);
		}
	});

	it('на обычных кнопках — яркий значок в начале, без тусклых', () => {
		for (const id of ids) {
			const { label, style } = ACTIONS[id];
			if (!style) expect(label, label).toMatch(/^\p{Extended_Pictographic}/u);
			for (const dim of DIM_EMOJI) expect(label).not.toContain(dim);
		}
	});

	it('надписи кнопок не повторяются', () => {
		const labels = ids.map((id) => ACTIONS[id].label);
		expect(new Set(labels).size).toBe(labels.length);
	});
});

describe('matchButton — какую кнопку нажали', () => {
	it.each(ids)('надпись кнопки «%s» узнаётся', (id) => {
		expect(matchButton(ACTIONS[id].label)).toBe(id);
	});

	it.each([
		['➖ Расход', 'expense'],
		['➕ Доход', 'income'],
		['💰 Баланс', 'balance'],
		['🕘 Последние', 'last'],
		['месяц', 'month'],
		['МЕСЯЦ', 'month'],
		['  Сегодня  ', 'today'],
		['сьогодні', 'today'],
		['счета', 'balance'],
		['меню', 'main'],
		['назад', 'main'],
		['ещё', 'commands'],
		['еще', 'commands'],
		['help', 'help']
	] as const)('«%s» → %s', (text, id) => {
		expect(matchButton(text)).toBe(id);
	});

	it.each(['сегодня 250 кофе', '250', 'кофе', 'привет', '', 'месяц '.repeat(10)])(
		'«%s» — не кнопка',
		(text) => {
			expect(matchButton(text)).toBeNull();
		}
	);
});

describe('кнопки под сообщениями', () => {
	it('btn: стиль только если задан', () => {
		expect(btn('Да', 'x')).toEqual({ text: 'Да', callback_data: 'x' });
		expect(btn('Нет', 'y', 'danger')).toEqual({ text: 'Нет', callback_data: 'y', style: 'danger' });
	});

	it('grid раскладывает по рядам', () => {
		const b = [1, 2, 3, 4, 5].map((n) => btn(String(n), String(n)));
		expect(grid(b).map((r) => r.length)).toEqual([2, 2, 1]);
		expect(grid(b, 3).map((r) => r.length)).toEqual([3, 2]);
		expect(grid([])).toEqual([]);
	});

	it('inline выбрасывает пустые ряды', () => {
		expect(inline([[], [btn('a', 'a')], []])).toEqual({
			inline_keyboard: [[{ text: 'a', callback_data: 'a' }]]
		});
	});
});
