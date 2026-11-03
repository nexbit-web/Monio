import { describe, expect, it, vi } from 'vitest';
import { DESCRIPTION, SHORT_DESCRIPTION, syncProfile } from './profile.ts';
import { COMMANDS, DIM_EMOJI } from './ui.ts';

/** Telegram с заданным текущим профилем; set* записываются. */
function api(current: {
	commands?: { command: string; description: string }[];
	description?: string;
	short?: string;
	menu?: string;
}) {
	return {
		getMyCommands: vi.fn(async () => current.commands ?? []),
		setMyCommands: vi.fn(async () => true as const),
		getMyDescription: vi.fn(async () => ({ description: current.description ?? '' })),
		setMyDescription: vi.fn(async () => true as const),
		getMyShortDescription: vi.fn(async () => ({ short_description: current.short ?? '' })),
		setMyShortDescription: vi.fn(async () => true as const),
		getChatMenuButton: vi.fn(async () => ({ type: current.menu ?? 'default' })),
		setChatMenuButton: vi.fn(async () => true as const)
	};
}

describe('syncProfile', () => {
	it('новый бот — ставит команды, описания и кнопку «Меню»', async () => {
		const a = api({});
		const changed = await syncProfile(a as never);
		expect(changed).toEqual(['команды', 'описание', 'короткое описание', 'кнопка «Меню»']);
		expect(a.setMyCommands).toHaveBeenCalledWith(COMMANDS);
		expect(a.setMyDescription).toHaveBeenCalledWith(DESCRIPTION);
		expect(a.setMyShortDescription).toHaveBeenCalledWith(SHORT_DESCRIPTION);
		expect(a.setChatMenuButton).toHaveBeenCalledWith({ menu_button: { type: 'commands' } });
	});

	it('всё уже как надо — ничего не трогает (лимиты Telegram целы)', async () => {
		const a = api({
			commands: COMMANDS.map((c) => ({ ...c })),
			description: DESCRIPTION,
			short: SHORT_DESCRIPTION,
			menu: 'commands'
		});
		expect(await syncProfile(a as never)).toEqual([]);
		expect(a.setMyCommands).not.toHaveBeenCalled();
		expect(a.setMyDescription).not.toHaveBeenCalled();
		expect(a.setMyShortDescription).not.toHaveBeenCalled();
		expect(a.setChatMenuButton).not.toHaveBeenCalled();
	});

	it('старый набор команд (прошлая версия) — обновляет только команды', async () => {
		const a = api({
			commands: [{ command: 'today', description: 'Операции за сегодня' }],
			description: DESCRIPTION,
			short: SHORT_DESCRIPTION,
			menu: 'commands'
		});
		expect(await syncProfile(a as never)).toEqual(['команды']);
	});

	it('та же команда с другим описанием — тоже обновляет', async () => {
		const a = api({
			commands: COMMANDS.map((c, i) => (i === 0 ? { ...c, description: 'другое' } : c)),
			description: DESCRIPTION,
			short: SHORT_DESCRIPTION,
			menu: 'commands'
		});
		expect(await syncProfile(a as never)).toEqual(['команды']);
	});
});

describe('описания бота', () => {
	it('в пределах Telegram: 512 и 120 символов', () => {
		expect(DESCRIPTION.length).toBeLessThanOrEqual(512);
		expect(SHORT_DESCRIPTION.length).toBeLessThanOrEqual(120);
	});

	it('объясняют, как начать, и без тусклых значков', () => {
		expect(DESCRIPTION).toContain('250 продукты');
		expect(DESCRIPTION).toContain('Настройки → Telegram-бот');
		for (const e of DIM_EMOJI) {
			expect(DESCRIPTION).not.toContain(e);
			expect(SHORT_DESCRIPTION).not.toContain(e);
		}
	});
});
