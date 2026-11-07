/**
 * Страница «Как пользоваться» — на трёх языках. Здесь общее для всех трёх:
 * языки, подписи страницы и разделы. Сам текст — ru.svelte, uk.svelte,
 * en.svelte; заголовки разделов в них берутся отсюда (section.svelte), поэтому
 * навигация и текст не расходятся.
 */

export const LANGS = ['ru', 'uk', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const isLang = (value: unknown): value is Lang =>
	typeof value === 'string' && (LANGS as readonly string[]).includes(value);

/** Выбранный язык помним в cookie — следующий раз страница откроется на нём. */
export const LANG_COOKIE = 'monio_help_lang';

/** Ключ контекста: язык страницы для блоков справки (кнопка «скопировать» и таблицы). */
export const HELP_LANG = Symbol('help-lang');

/** Разделы в порядке страницы. Id — якоря ссылок, одни для всех языков. */
export const SECTIONS = [
	'start',
	'features',
	'bot-write',
	'bot-card',
	'bot-keys',
	'categorize',
	'site',
	'limits',
	'accounts',
	'safety',
	'faq'
] as const;
export type SectionId = (typeof SECTIONS)[number];

type Ui = {
	/** название языка в переключателе — на нём самом */
	name: string;
	title: string;
	lead: string;
	jump: string;
	switcher: string;
	/** надпись над заголовком */
	eyebrow: string;
	copy: string;
	copied: string;
	/** заголовки таблиц: пишешь / что будет, команда / кнопка / что делает */
	th: {
		say: string;
		get: string;
		cmd: string;
		key: string;
		does: string;
		part: string;
		inside: string;
	};
	/** заголовки разделов */
	sections: Record<SectionId, string>;
	/** короткие подписи разделов — для кнопок-переходов под шапкой */
	short: Record<SectionId, string>;
};

export const UI: Record<Lang, Ui> = {
	ru: {
		name: 'Русский',
		title: 'Как пользоваться Monio',
		lead: 'Записывай траты одним сообщением в Telegram, а сайт сам разложит их по категориям и покажет, куда уходят деньги.',
		jump: 'Содержание',
		switcher: 'Язык',
		eyebrow: 'Справка',
		copy: 'Скопировать',
		copied: 'Скопировано',
		th: {
			say: 'Пишешь боту',
			get: 'Что будет',
			cmd: 'Команда',
			key: 'Кнопка',
			does: 'Что делает',
			part: 'Раздел',
			inside: 'Что там'
		},
		sections: {
			start: 'Начать за минуту',
			features: 'Что умеет Monio',
			'bot-write': 'Запиши трату одним сообщением',
			'bot-card': 'Исправить или удалить запись',
			'bot-keys': 'Кнопки и команды бота',
			categorize: 'Как бот узнаёт категорию',
			site: 'Сайт: что где лежит',
			limits: 'Лимиты на месяц',
			accounts: 'Счета, остатки и переводы',
			safety: 'Безопасность и доступ',
			faq: 'Частые вопросы'
		},
		short: {
			start: 'Старт',
			features: 'Возможности',
			'bot-write': 'Запись',
			'bot-card': 'Исправить',
			'bot-keys': 'Кнопки',
			categorize: 'Категории',
			site: 'Сайт',
			limits: 'Лимиты',
			accounts: 'Счета',
			safety: 'Безопасность',
			faq: 'Вопросы'
		}
	},
	uk: {
		name: 'Українська',
		title: 'Як користуватися Monio',
		lead: 'Записуй витрати одним повідомленням у Telegram, а сайт сам розкладе їх за категоріями й покаже, куди йдуть гроші.',
		jump: 'Зміст',
		switcher: 'Мова',
		eyebrow: 'Довідка',
		copy: 'Скопіювати',
		copied: 'Скопійовано',
		th: {
			say: 'Пишеш боту',
			get: 'Що буде',
			cmd: 'Команда',
			key: 'Кнопка',
			does: 'Що робить',
			part: 'Розділ',
			inside: 'Що там'
		},
		sections: {
			start: 'Почати за хвилину',
			features: 'Що вміє Monio',
			'bot-write': 'Запиши витрату одним повідомленням',
			'bot-card': 'Виправити або видалити запис',
			'bot-keys': 'Кнопки й команди бота',
			categorize: 'Як бот упізнає категорію',
			site: 'Сайт: що де лежить',
			limits: 'Ліміти на місяць',
			accounts: 'Рахунки, залишки й перекази',
			safety: 'Безпека й доступ',
			faq: 'Часті питання'
		},
		short: {
			start: 'Старт',
			features: 'Можливості',
			'bot-write': 'Запис',
			'bot-card': 'Виправити',
			'bot-keys': 'Кнопки',
			categorize: 'Категорії',
			site: 'Сайт',
			limits: 'Ліміти',
			accounts: 'Рахунки',
			safety: 'Безпека',
			faq: 'Питання'
		}
	},
	en: {
		name: 'English',
		title: 'How to use Monio',
		lead: 'Record spending with one Telegram message, and the website sorts it into categories and shows where your money goes.',
		jump: 'Contents',
		switcher: 'Language',
		eyebrow: 'Help',
		copy: 'Copy',
		copied: 'Copied',
		th: {
			say: 'You send',
			get: 'What happens',
			cmd: 'Command',
			key: 'Button',
			does: 'What it does',
			part: 'Section',
			inside: "What's there"
		},
		sections: {
			start: 'Get started in a minute',
			features: 'What Monio can do',
			'bot-write': 'Record spending in one message',
			'bot-card': 'Fix or delete a record',
			'bot-keys': 'Bot buttons and commands',
			categorize: 'How the bot finds the category',
			site: 'The website: what is where',
			limits: 'Monthly limits',
			accounts: 'Accounts, balances and transfers',
			safety: 'Security and access',
			faq: 'FAQ'
		},
		short: {
			start: 'Start',
			features: 'Features',
			'bot-write': 'Recording',
			'bot-card': 'Fixing',
			'bot-keys': 'Buttons',
			categorize: 'Categories',
			site: 'Website',
			limits: 'Limits',
			accounts: 'Accounts',
			safety: 'Security',
			faq: 'FAQ'
		}
	}
};
