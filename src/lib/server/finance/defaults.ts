import type { PrismaClient } from '../prisma/client.ts';
import type { AccountType, CategoryKind } from '../prisma/enums.ts';

type CategorySeed = { icon: string; name: string; keywords: string[] };

/**
 * Стартовые категории. Ключевые слова — основы слов (без окончаний):
 * «продукт» ловит «продукты», «продуктов», «продукти».
 * Украинские і/ї/є перед сравнением превращаются в и/и/е (см. categorize.ts).
 */
export const DEFAULT_EXPENSE_CATEGORIES: CategorySeed[] = [
	{
		icon: 'groceries',
		name: 'Продукты',
		keywords: [
			'продукт',
			'еда',
			'магазин',
			'супермаркет',
			'атб',
			'сильпо',
			'novus',
			'новус',
			'ашан',
			'фора',
			'варус',
			'хлеб',
			'молок',
			'мясо',
			'овощ',
			'фрукт',
			'вода'
		]
	},
	{
		icon: 'cafe',
		name: 'Кафе и рестораны',
		keywords: [
			'кафе',
			'кофе',
			'кава',
			'кави',
			'ресторан',
			'обед',
			'обид',
			'ужин',
			'вечер',
			'завтрак',
			'снидан',
			'пицц',
			'суши',
			'бургер',
			'шаурм',
			'макдон',
			'kfc',
			'glovo',
			'глово',
			'доставк'
		]
	},
	{
		icon: 'transport',
		name: 'Транспорт',
		keywords: [
			'такси',
			'uber',
			'убер',
			'bolt',
			'болт',
			'uklon',
			'уклон',
			'метро',
			'автобус',
			'маршрутк',
			'проезд',
			'произд',
			'трамва',
			'тролейб',
			'троллейб',
			'поезд',
			'потяг',
			'укрзализн'
		]
	},
	{
		icon: 'car',
		name: 'Авто',
		keywords: [
			'бенз',
			'топлив',
			'пальне',
			'заправк',
			'окко',
			'okko',
			'wog',
			'socar',
			'upg',
			'парковк',
			'мойк',
			'шиномонтаж',
			'автомобил',
			'машин'
		]
	},
	{
		icon: 'home',
		name: 'Жильё',
		keywords: ['аренд', 'оренд', 'квартир', 'ипотек', 'жиль', 'житл']
	},
	{
		icon: 'utilities',
		name: 'Коммунальные услуги',
		keywords: [
			'коммунал',
			'комунал',
			'комуналк',
			'свет',
			'электр',
			'электроэнерг',
			'газ',
			'отоплен',
			'опален',
			'квартплат',
			'осбб',
			'водоканал'
		]
	},
	{
		icon: 'mobile',
		name: 'Мобильная связь',
		keywords: [
			'мобил',
			'телефон',
			'киевстар',
			'кийвстар',
			'kyivstar',
			'водафон',
			'vodafone',
			'лайфсел',
			'lifecell',
			'связь',
			'звязок',
			'пополн',
			'поповн'
		]
	},
	{
		icon: 'internet',
		name: 'Интернет и ТВ',
		keywords: [
			'интернет',
			'провайдер',
			'wifi',
			'вайфай',
			'роутер',
			'тв',
			'телевиден',
			'воля',
			'ланет',
			'triolan'
		]
	},
	{
		icon: 'subscriptions',
		name: 'Подписки',
		keywords: [
			'подписк',
			'пидписк',
			'netflix',
			'нетфликс',
			'spotify',
			'youtube',
			'ютуб',
			'icloud',
			'apple',
			'google',
			'chatgpt',
			'claude',
			'megogo',
			'мегого'
		]
	},
	{
		icon: 'health',
		name: 'Здоровье',
		keywords: [
			'аптек',
			'лекарств',
			'лики',
			'таблетк',
			'врач',
			'лекар',
			'больниц',
			'клиник',
			'анализ',
			'стоматолог',
			'зуб',
			'зубн'
		]
	},
	{
		icon: 'clothes',
		name: 'Одежда и обувь',
		keywords: [
			'одежд',
			'одяг',
			'обув',
			'взутт',
			'кроссов',
			'кросив',
			'футболк',
			'джинс',
			'куртк',
			'zara'
		]
	},
	{
		icon: 'fun',
		name: 'Развлечения',
		keywords: [
			'кино',
			'театр',
			'концерт',
			'игра',
			'игры',
			'игрушк',
			'бар',
			'клуб',
			'боулинг',
			'steam',
			'квест'
		]
	},
	{ icon: 'gifts', name: 'Подарки', keywords: ['подар', 'цвет', 'квит', 'букет'] },
	// «маме», «брату», «сестрі», «бабусі», «донат», «ЗСУ» — в словаре (goods.json):
	// там эти слова важнее товара, «сестре куртка» — Семья, а не Одежда
	{ icon: 'family', name: 'Семья', keywords: [] },
	{ icon: 'charity', name: 'Благотворительность', keywords: ['благотвор', 'благодийн'] },
	{
		icon: 'education',
		name: 'Образование',
		keywords: ['курс', 'книг', 'обучен', 'навчан', 'учеб', 'репетитор', 'школ']
	},
	{
		icon: 'sport',
		name: 'Спорт',
		keywords: ['спорт', 'спортзал', 'абонем', 'тренир', 'тренув', 'бассейн', 'басейн', 'фитнес']
	},
	{
		icon: 'beauty',
		name: 'Красота и уход',
		keywords: ['барбер', 'стрижк', 'парикмах', 'перукар', 'маникюр', 'космет', 'шампун', 'eva']
	},
	{
		icon: 'tech',
		name: 'Техника',
		keywords: [
			'техник',
			'ноутбук',
			'наушник',
			'навушник',
			'rozetka',
			'розетк',
			'comfy',
			'фокстрот',
			'гаджет'
		]
	},
	{
		icon: 'household',
		name: 'Дом и быт',
		keywords: [
			'бытов',
			'побут',
			'хозтовар',
			'посуд',
			'мебел',
			'мебл',
			'ремонт',
			'эпицентр',
			'епицентр',
			'икеа',
			'jysk'
		]
	},
	{
		icon: 'pets',
		name: 'Питомцы',
		keywords: ['корм', 'ветерин', 'кот', 'собак', 'питом', 'зоомагаз']
	},
	{
		icon: 'bank',
		name: 'Кредиты и комиссии',
		keywords: ['кредит', 'комисс', 'комис', 'рассрочк', 'розстроч', 'долг', 'борг']
	},
	{ icon: 'other', name: 'Другое', keywords: [] }
];

export const DEFAULT_INCOME_CATEGORIES: CategorySeed[] = [
	{
		icon: 'salary',
		name: 'Зарплата',
		keywords: ['зарплат', 'зп', 'аванс', 'оклад', 'преми', 'salary']
	},
	{
		icon: 'freelance',
		name: 'Фриланс',
		keywords: ['фриланс', 'freelance', 'заказ', 'замовлен', 'проект', 'upwork', 'клиент']
	},
	{ icon: 'sidejob', name: 'Подработка', keywords: ['подработ', 'пидробит', 'халтур', 'смена'] },
	{ icon: 'party', name: 'Подарки', keywords: ['подар'] },
	{
		icon: 'cashback',
		name: 'Кешбэк и проценты',
		keywords: ['кешбек', 'кэшбек', 'кешбэк', 'cashback', 'процент', 'депозит', 'дивиденд']
	},
	{
		icon: 'refund',
		name: 'Возврат долга',
		keywords: ['возврат', 'вернул', 'повернув', 'повернен']
	},
	{ icon: 'sale', name: 'Продажа', keywords: ['продаж', 'продал', 'продав', 'olx'] },
	{ icon: 'other', name: 'Другое', keywords: [] }
];

export const DEFAULT_ACCOUNTS: {
	icon: string;
	name: string;
	type: AccountType;
	isDefault?: boolean;
}[] = [
	{ icon: 'card', name: 'Карта', type: 'CARD', isDefault: true },
	{ icon: 'cash', name: 'Наличные', type: 'CASH' }
];

/**
 * Создаёт стартовые счета и категории — один раз на пользователя.
 * Безопасно вызывать повторно и параллельно: проверка идёт по initializedAt внутри транзакции,
 * а повторная вставка категорий гасится уникальным индексом.
 */
export async function initializeUser(db: PrismaClient, userId: string): Promise<void> {
	await db.$transaction(async (tx) => {
		const user = await tx.user.findUnique({
			where: { id: userId },
			select: { initializedAt: true }
		});
		if (!user || user.initializedAt) return;

		const rows = (kind: CategoryKind, list: CategorySeed[]) =>
			list.map((c, i) => ({
				userId,
				kind,
				name: c.name,
				icon: c.icon,
				keywords: c.keywords,
				sortOrder: i
			}));

		await tx.category.createMany({
			data: [
				...rows('EXPENSE', DEFAULT_EXPENSE_CATEGORIES),
				...rows('INCOME', DEFAULT_INCOME_CATEGORIES)
			],
			skipDuplicates: true
		});

		if ((await tx.account.count({ where: { userId } })) === 0) {
			await tx.account.createMany({
				data: DEFAULT_ACCOUNTS.map((a, i) => ({
					userId,
					...a,
					isDefault: a.isDefault ?? false,
					sortOrder: i
				}))
			});
		}

		await tx.user.update({ where: { id: userId }, data: { initializedAt: new Date() } });
	});
}
