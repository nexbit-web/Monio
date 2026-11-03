/**
 * Иконки категорий и счетов. В базе хранится ключ («groceries»), а рисует его
 * fin-icon.svelte — SVG в одном стиле с иконками сайдбара. Записи со старыми
 * эмодзи тоже понимаем: iconKey() переводит их в ключ. В Telegram SVG не
 * показать — там ключ превращается обратно в эмодзи (iconEmoji).
 *
 * Модуль без Svelte-импортов: его читает и бот, который запускается в Node.
 */

/** Оттенок плитки под иконкой — как цветные иконки списков в ClickUp. */
export type IconTone =
	'green' | 'orange' | 'blue' | 'violet' | 'pink' | 'red' | 'amber' | 'teal' | 'gray';

type IconMeta = { label: string; emoji: string; tone: IconTone };

export const ICON_META = {
	groceries: { label: 'Продукты', emoji: '🛒', tone: 'green' },
	cafe: { label: 'Кафе', emoji: '🍽', tone: 'orange' },
	coffee: { label: 'Кофе', emoji: '☕', tone: 'amber' },
	drinks: { label: 'Напитки', emoji: '🍺', tone: 'amber' },
	transport: { label: 'Транспорт', emoji: '🚌', tone: 'blue' },
	taxi: { label: 'Такси', emoji: '🚕', tone: 'amber' },
	car: { label: 'Авто', emoji: '🚗', tone: 'blue' },
	fuel: { label: 'Топливо', emoji: '⛽', tone: 'red' },
	travel: { label: 'Путешествия', emoji: '✈️', tone: 'blue' },
	home: { label: 'Жильё', emoji: '🏠', tone: 'violet' },
	utilities: { label: 'Коммуналка', emoji: '💡', tone: 'amber' },
	mobile: { label: 'Связь', emoji: '📱', tone: 'teal' },
	internet: { label: 'Интернет', emoji: '🌐', tone: 'teal' },
	subscriptions: { label: 'Подписки', emoji: '🔁', tone: 'violet' },
	health: { label: 'Здоровье', emoji: '💊', tone: 'red' },
	sport: { label: 'Спорт', emoji: '🏋️', tone: 'green' },
	beauty: { label: 'Красота', emoji: '💇', tone: 'pink' },
	clothes: { label: 'Одежда', emoji: '👕', tone: 'pink' },
	fun: { label: 'Развлечения', emoji: '🎬', tone: 'violet' },
	games: { label: 'Игры', emoji: '🎮', tone: 'violet' },
	gifts: { label: 'Подарки', emoji: '🎁', tone: 'pink' },
	education: { label: 'Учёба', emoji: '📚', tone: 'blue' },
	kids: { label: 'Дети', emoji: '👶', tone: 'pink' },
	pets: { label: 'Питомцы', emoji: '🐾', tone: 'orange' },
	tech: { label: 'Техника', emoji: '🖥', tone: 'gray' },
	household: { label: 'Дом и быт', emoji: '🧺', tone: 'teal' },
	smoking: { label: 'Сигареты', emoji: '🚬', tone: 'gray' },
	bank: { label: 'Банк', emoji: '🏦', tone: 'gray' },
	salary: { label: 'Зарплата', emoji: '💼', tone: 'green' },
	freelance: { label: 'Фриланс', emoji: '💻', tone: 'blue' },
	sidejob: { label: 'Подработка', emoji: '🛠', tone: 'orange' },
	party: { label: 'Праздник', emoji: '🎉', tone: 'pink' },
	cashback: { label: 'Кешбэк', emoji: '💸', tone: 'teal' },
	growth: { label: 'Рост', emoji: '📈', tone: 'green' },
	refund: { label: 'Возврат', emoji: '↩️', tone: 'teal' },
	sale: { label: 'Продажа', emoji: '🏷', tone: 'amber' },
	other: { label: 'Другое', emoji: '📦', tone: 'gray' },
	card: { label: 'Карта', emoji: '💳', tone: 'blue' },
	cash: { label: 'Наличные', emoji: '💵', tone: 'green' },
	savings: { label: 'Копилка', emoji: '🐷', tone: 'pink' },
	moneybag: { label: 'Сбережения', emoji: '💰', tone: 'amber' },
	coins: { label: 'Монеты', emoji: '🪙', tone: 'amber' },
	wallet: { label: 'Кошелёк', emoji: '👛', tone: 'violet' },
	euro: { label: 'Евро', emoji: '💶', tone: 'teal' },
	dollar: { label: 'Доллар', emoji: '💲', tone: 'green' }
} as const satisfies Record<string, IconMeta>;

export type IconKey = keyof typeof ICON_META;

/** Выбор иконки категории — в этом порядке. */
export const CATEGORY_ICONS: IconKey[] = [
	'groceries',
	'cafe',
	'coffee',
	'drinks',
	'transport',
	'taxi',
	'car',
	'fuel',
	'travel',
	'home',
	'utilities',
	'mobile',
	'internet',
	'subscriptions',
	'health',
	'sport',
	'beauty',
	'clothes',
	'fun',
	'games',
	'gifts',
	'education',
	'kids',
	'pets',
	'tech',
	'household',
	'smoking',
	'bank',
	'salary',
	'freelance',
	'sidejob',
	'party',
	'cashback',
	'growth',
	'refund',
	'sale',
	'other'
];

/** Выбор иконки счёта. */
export const ACCOUNT_ICONS: IconKey[] = [
	'card',
	'cash',
	'bank',
	'savings',
	'moneybag',
	'coins',
	'growth',
	'wallet',
	'euro',
	'dollar'
];

export function isIconKey(value: unknown): value is IconKey {
	return typeof value === 'string' && Object.hasOwn(ICON_META, value);
}

/** Эмодзи без «вариант-селектора» U+FE0F: «🏋️» и «🏋» — одна иконка. */
const bare = (s: string) => s.replace(/️/g, '');

const BY_EMOJI = new Map<string, IconKey>(
	(Object.entries(ICON_META) as [IconKey, IconMeta][]).map(([key, meta]) => [bare(meta.emoji), key])
);
// Эмодзи, которыми были подписаны стартовые категории до перехода на SVG.
BY_EMOJI.set('🚕', 'taxi');
BY_EMOJI.set('🖥', 'tech');

/** Ключ иконки для значения из базы: ключ как есть, старое эмодзи — по таблице. */
export function iconKey(value: string | null | undefined, fallback: IconKey = 'other'): IconKey {
	if (!value) return fallback;
	if (isIconKey(value)) return value;
	return BY_EMOJI.get(bare(value.trim())) ?? fallback;
}

/** Эмодзи для Telegram: SVG там не показать. */
export function iconEmoji(value: string | null | undefined): string {
	if (!value) return '❓';
	if (isIconKey(value)) return ICON_META[value].emoji;
	return value;
}
