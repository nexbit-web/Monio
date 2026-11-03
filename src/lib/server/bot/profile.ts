/**
 * Профиль бота в Telegram: описания (их видно в пустом чате до /start и в
 * профиле бота) и кнопка «Меню» слева от поля ввода.
 *
 * Кнопки «Меню» нет: Telegram показывает её, пока у бота есть список команд.
 * Поэтому список удаляем, а все команды — на экране «📋 Команди» клавиатуры.
 * Сами команды (/today, /month…) по-прежнему работают, если их написать.
 *
 * syncProfile меняет только то, что отличается, — частые перезапуски не
 * упираются в лимиты Telegram на эти методы.
 */
import type { Api } from 'grammy';

/** Видно в пустом чате до /start (до 512 символов). */
export const DESCRIPTION = [
	'Monio — облік доходів і витрат просто в чаті.',
	'',
	'Пиши як у нотатках: «250 продукти», «кава 65», «+30000 зарплата» — я сам розкладу по категоріях і порахую місяць. Можна українською або російською.',
	'',
	"Щоб почати, прив'яжи акаунт: Monio → Настройки → Telegram-бот."
].join('\n');

/** В профиле бота и в превью ссылки (до 120 символов). */
export const SHORT_DESCRIPTION = 'Облік витрат і доходів: напиши «250 продукти» — і готово.';

type ProfileApi = Pick<
	Api,
	| 'getMyCommands'
	| 'deleteMyCommands'
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

	if (commands.length > 0) {
		changed.push('убран список команд');
		tasks.push(api.deleteMyCommands());
	}
	// Без своей кнопки Telegram отвечает «commands» (или «default») и при пустом
	// списке команд «Меню» не рисует. Мешает только кнопка мини-приложения.
	if (menu.type === 'web_app') {
		changed.push('убрана кнопка «Меню»');
		tasks.push(api.setChatMenuButton({ menu_button: { type: 'default' } }));
	}
	if (description.description !== DESCRIPTION) {
		changed.push('описание');
		tasks.push(api.setMyDescription(DESCRIPTION));
	}
	if (short.short_description !== SHORT_DESCRIPTION) {
		changed.push('короткое описание');
		tasks.push(api.setMyShortDescription(SHORT_DESCRIPTION));
	}

	await Promise.all(tasks);
	return changed;
}
