import { describe, expect, it, vi } from 'vitest';
import { DESCRIPTION, SHORT_DESCRIPTION, syncProfile } from './profile.ts';
import { DIM_EMOJI } from './ui.ts';

/** Telegram с заданным текущим профилем; изменения записываются. */
function api(current: {
	commands?: { command: string; description: string }[];
	description?: string;
	short?: string;
	menu?: string;
}) {
	return {
		getMyCommands: vi.fn(async () => current.commands ?? []),
		deleteMyCommands: vi.fn(async () => true as const),
		getMyDescription: vi.fn(async () => ({ description: current.description ?? '' })),
		setMyDescription: vi.fn(async () => true as const),
		getMyShortDescription: vi.fn(async () => ({ short_description: current.short ?? '' })),
		setMyShortDescription: vi.fn(async () => true as const),
		getChatMenuButton: vi.fn(async () => ({ type: current.menu ?? 'default' })),
		setChatMenuButton: vi.fn(async () => true as const)
	};
}

const ready = { description: DESCRIPTION, short: SHORT_DESCRIPTION, menu: 'default' };

describe('syncProfile', () => {
	it('прошлая версия (команды в «Меню») — убирает команды, ставит описания', async () => {
		const a = api({
			commands: [{ command: 'today', description: 'Операции за день' }],
			description: 'старое',
			short: 'старое',
			menu: 'commands'
		});
		const changed = await syncProfile(a as never);
		expect(changed).toEqual(['убран список команд', 'описание', 'короткое описание']);
		expect(a.deleteMyCommands).toHaveBeenCalledOnce();
		expect(a.setMyDescription).toHaveBeenCalledWith(DESCRIPTION);
		expect(a.setMyShortDescription).toHaveBeenCalledWith(SHORT_DESCRIPTION);
	});

	// так Telegram отвечает о кнопке без своих настроек — с пустым списком команд её не видно
	it.each(['commands', 'default'])(
		'всё уже как надо (кнопка «%s») — ничего не трогает, лимиты Telegram целы',
		async (menu) => {
			const a = api({ ...ready, menu });
			expect(await syncProfile(a as never)).toEqual([]);
			expect(a.deleteMyCommands).not.toHaveBeenCalled();
			expect(a.setMyDescription).not.toHaveBeenCalled();
			expect(a.setMyShortDescription).not.toHaveBeenCalled();
			expect(a.setChatMenuButton).not.toHaveBeenCalled();
		}
	);

	it('команды задали заново (например, в BotFather) — снова убирает', async () => {
		const a = api({ ...ready, commands: [{ command: 'start', description: 'Старт' }] });
		expect(await syncProfile(a as never)).toEqual(['убран список команд']);
	});

	it('на месте «Меню» поставили мини-приложение — возвращает обычную', async () => {
		const a = api({ ...ready, menu: 'web_app' });
		expect(await syncProfile(a as never)).toEqual(['убрана кнопка «Меню»']);
		expect(a.setChatMenuButton).toHaveBeenCalledWith({ menu_button: { type: 'default' } });
	});
});

describe('описания бота', () => {
	it('в пределах Telegram: 512 и 120 символов', () => {
		expect(DESCRIPTION.length).toBeLessThanOrEqual(512);
		expect(SHORT_DESCRIPTION.length).toBeLessThanOrEqual(120);
	});

	it('по-украински, объясняют, как начать, и без тусклых значков', () => {
		expect(DESCRIPTION).toContain('250 продукти');
		expect(DESCRIPTION).toContain('Настройки → Telegram-бот');
		expect(SHORT_DESCRIPTION).toContain('Облік витрат');
		for (const e of DIM_EMOJI) {
			expect(DESCRIPTION).not.toContain(e);
			expect(SHORT_DESCRIPTION).not.toContain(e);
		}
	});
});
