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
	| 'green'
	| 'teal'
	| 'sky'
	| 'blue'
	| 'violet'
	| 'purple'
	| 'pink'
	| 'coral'
	| 'red'
	| 'orange'
	| 'amber'
	| 'gray';

type IconMeta = { label: string; emoji: string; tone: IconTone };

export const ICON_META = {
	groceries: { label: 'Продукты', emoji: '🍏', tone: 'green' },
	cafe: { label: 'Кафе', emoji: '🍔', tone: 'orange' },
	coffee: { label: 'Кофе', emoji: '☕', tone: 'coral' },
	drinks: { label: 'Напитки', emoji: '🍺', tone: 'amber' },
	transport: { label: 'Транспорт', emoji: '🚌', tone: 'blue' },
	taxi: { label: 'Такси', emoji: '🚕', tone: 'amber' },
	car: { label: 'Авто', emoji: '🚗', tone: 'sky' },
	fuel: { label: 'Топливо', emoji: '⛽', tone: 'red' },
	travel: { label: 'Путешествия', emoji: '🏝️', tone: 'sky' },
	home: { label: 'Жильё', emoji: '🏠', tone: 'violet' },
	utilities: { label: 'Коммуналка', emoji: '💡', tone: 'amber' },
	mobile: { label: 'Связь', emoji: '📱', tone: 'teal' },
	internet: { label: 'Интернет', emoji: '🌐', tone: 'sky' },
	subscriptions: { label: 'Подписки', emoji: '🔁', tone: 'purple' },
	health: { label: 'Здоровье', emoji: '💊', tone: 'red' },
	sport: { label: 'Спорт', emoji: '💪', tone: 'green' },
	beauty: { label: 'Красота', emoji: '💅', tone: 'pink' },
	clothes: { label: 'Одежда', emoji: '👕', tone: 'violet' },
	fun: { label: 'Развлечения', emoji: '🍿', tone: 'purple' },
	games: { label: 'Игры', emoji: '👾', tone: 'violet' },
	gifts: { label: 'Подарки', emoji: '🎁', tone: 'pink' },
	education: { label: 'Учёба', emoji: '📚', tone: 'blue' },
	kids: { label: 'Дети', emoji: '👶', tone: 'coral' },
	pets: { label: 'Питомцы', emoji: '🐶', tone: 'orange' },
	tech: { label: 'Техника', emoji: '💻', tone: 'blue' },
	household: { label: 'Дом и быт', emoji: '🧺', tone: 'teal' },
	smoking: { label: 'Сигареты', emoji: '🚬', tone: 'gray' },
	bank: { label: 'Банк', emoji: '🏦', tone: 'blue' },
	salary: { label: 'Зарплата', emoji: '💼', tone: 'green' },
	freelance: { label: 'Фриланс', emoji: '🧑‍💻', tone: 'sky' },
	sidejob: { label: 'Подработка', emoji: '🧰', tone: 'orange' },
	party: { label: 'Праздник', emoji: '🎉', tone: 'pink' },
	cashback: { label: 'Кешбэк', emoji: '💸', tone: 'teal' },
	growth: { label: 'Рост', emoji: '📈', tone: 'green' },
	refund: { label: 'Возврат', emoji: '↩️', tone: 'sky' },
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

/**
 * Эмодзи, которые лежат в базе с тех времён, когда иконка была эмодзи. Таблица
 * заморожена: эмодзи для Telegram в ICON_META можно менять (например, на более
 * яркие), а старые записи всё равно узнаются. 💻 когда-то значил «Фриланс» —
 * поэтому он здесь, хотя теперь это эмодзи «Техники».
 */
const LEGACY_EMOJI: Record<string, IconKey> = {
	'🛒': 'groceries',
	'🍽': 'cafe',
	'☕': 'coffee',
	'🍺': 'drinks',
	'🚌': 'transport',
	'🚕': 'taxi',
	'🚗': 'car',
	'⛽': 'fuel',
	'✈': 'travel',
	'🏠': 'home',
	'💡': 'utilities',
	'📱': 'mobile',
	'🌐': 'internet',
	'🔁': 'subscriptions',
	'💊': 'health',
	'🏋': 'sport',
	'💇': 'beauty',
	'👕': 'clothes',
	'🎬': 'fun',
	'🎮': 'games',
	'🎁': 'gifts',
	'📚': 'education',
	'👶': 'kids',
	'🐾': 'pets',
	'🖥': 'tech',
	'🧺': 'household',
	'🚬': 'smoking',
	'🏦': 'bank',
	'💼': 'salary',
	'💻': 'freelance',
	'🛠': 'sidejob',
	'🎉': 'party',
	'💸': 'cashback',
	'📈': 'growth',
	'↩': 'refund',
	'🏷': 'sale',
	'📦': 'other',
	'💳': 'card',
	'💵': 'cash',
	'🐷': 'savings',
	'💰': 'moneybag',
	'🪙': 'coins',
	'👛': 'wallet',
	'💶': 'euro',
	'💲': 'dollar'
};

const BY_EMOJI = new Map<string, IconKey>([
	...(Object.entries(ICON_META) as [IconKey, IconMeta][]).map(
		([key, meta]) => [bare(meta.emoji), key] as const
	),
	// старые записи важнее: при совпадении (💻) побеждает прежнее значение
	...Object.entries(LEGACY_EMOJI).map(([emoji, key]) => [bare(emoji), key] as const)
]);

/** Ключ иконки для значения из базы: ключ как есть, старое эмодзи — по таблице. */
export function iconKey(value: string | null | undefined, fallback: IconKey = 'other'): IconKey {
	if (!value) return fallback;
	if (isIconKey(value)) return value;
	return BY_EMOJI.get(bare(value.trim())) ?? fallback;
}

/**
 * Эмодзи для Telegram: SVG там не показать. Старое эмодзи из базы тоже
 * переводим в нынешнее — бот везде показывает один набор ярких значков.
 * Незнакомое эмодзи (поставили руками) показываем как есть.
 */
export function iconEmoji(value: string | null | undefined): string {
	if (!value) return '❓';
	const key = isIconKey(value) ? value : BY_EMOJI.get(bare(value.trim()));
	return key ? ICON_META[key].emoji : value;
}
