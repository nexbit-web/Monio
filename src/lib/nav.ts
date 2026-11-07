/**
 * Разделы приложения — общий список для сайдбара и нижней панели на телефоне.
 *
 * `short` — подпись под иконкой, по-английски: колонка узкая, как в ClickUp, а
 * английские слова короче. `label` — полное название в подсказке сбоку.
 */

export type NavGlyph =
	'overview' | 'transactions' | 'stats' | 'categories' | 'accounts' | 'help' | 'settings';

export type NavItem = {
	href: string;
	label: string;
	short: string;
	glyph: NavGlyph;
	/** служебное — прижато к низу колонки */
	system?: boolean;
};

export const NAV: NavItem[] = [
	{ href: '/', label: 'Обзор', short: 'Home', glyph: 'overview' },
	{ href: '/transactions', label: 'Операции', short: 'Activity', glyph: 'transactions' },
	{ href: '/reports', label: 'Аналитика', short: 'Stats', glyph: 'stats' },
	{ href: '/categories', label: 'Категории', short: 'Tags', glyph: 'categories' },
	{ href: '/accounts', label: 'Счета', short: 'Wallets', glyph: 'accounts' },
	// Как пользоваться: CRM, бот и как он выбирает категорию — на трёх языках.
	{ href: '/help', label: 'Как пользоваться', short: 'Help', glyph: 'help', system: true },
	// Шапки нет: профиль, тема, Telegram-бот, выход и экспорт — в настройках.
	{ href: '/settings', label: 'Настройки', short: 'Settings', glyph: 'settings', system: true }
];

export function isActive(pathname: string, href: string): boolean {
	if (href === '/') return pathname === '/';
	return pathname === href || pathname.startsWith(`${href}/`);
}
