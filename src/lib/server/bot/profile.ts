/**
 * Профиль бота в Telegram: меню команд, кнопка «Меню» слева от поля ввода и
 * описания (их видно в пустом чате до /start и в профиле бота).
 *
 * syncProfile меняет только то, что отличается, — частые перезапуски не
 * упираются в лимиты Telegram на эти методы.
 */
import type { Api } from 'grammy';
import { COMMANDS } from './ui.ts';

/** Видно в пустом чате до /start (до 512 символов). */
export const DESCRIPTION = [
	'Monio — учёт доходов и расходов прямо в чате.',
	'',
	'Пиши как в заметках: «250 продукты», «кофе 65», «+30000 зарплата» — я сам разложу по категориям и посчитаю месяц.',
	'',
	'Чтобы начать, привяжи аккаунт: Monio → Настройки → Telegram-бот.'
].join('\n');

/** В профиле бота и в превью ссылки (до 120 символов). */
export const SHORT_DESCRIPTION = 'Учёт расходов и доходов: напиши «250 продукты» — и готово.';

type ProfileApi = Pick<
	Api,
	| 'getMyCommands'
	| 'setMyCommands'
	| 'getMyDescription'
	| 'setMyDescription'
	| 'getMyShortDescription'
	| 'setMyShortDescription'
	| 'getChatMenuButton'
	| 'setChatMenuButton'
>;

/** Приводит профиль бота к нужному. Возвращает, что пришлось поменять. */
export async function syncProfile(api: ProfileApi): Promise<string[]> {
	const [commands, description, short, menu] = await Promise.all([
		api.getMyCommands(),
		api.getMyDescription(),
		api.getMyShortDescription(),
		api.getChatMenuButton()
	]);

	const changed: string[] = [];
	const tasks: Promise<unknown>[] = [];

	const sameCommands =
		commands.length === COMMANDS.length &&
		commands.every(
			(c, i) => c.command === COMMANDS[i].command && c.description === COMMANDS[i].description
		);
	if (!sameCommands) {
		changed.push('команды');
		tasks.push(api.setMyCommands(COMMANDS));
	}
	if (description.description !== DESCRIPTION) {
		changed.push('описание');
		tasks.push(api.setMyDescription(DESCRIPTION));
	}
	if (short.short_description !== SHORT_DESCRIPTION) {
		changed.push('короткое описание');
		tasks.push(api.setMyShortDescription(SHORT_DESCRIPTION));
	}
	if (menu.type !== 'commands') {
		changed.push('кнопка «Меню»');
		tasks.push(api.setChatMenuButton({ menu_button: { type: 'commands' } }));
	}

	await Promise.all(tasks);
	return changed;
}
