import { describe, expect, it } from 'vitest';
import {
	bestMatch,
	dropNameWords,
	goodsOf,
	learnableWord,
	matchCategory,
	normalize,
	tokens
} from './categorize';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './defaults';
import { GOODS } from './goods';
import { isIconKey } from '../../icon-keys';

const expense = DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({ id: `e${i}`, ...c }));
const income = DEFAULT_INCOME_CATEGORIES.map((c, i) => ({ id: `i${i}`, ...c }));
const name = (text: string, list = expense) => matchCategory(text, list)?.name ?? null;

describe('normalize и tokens', () => {
	it('украинские буквы, ё и апостроф', () => {
		expect(normalize('Таксі')).toBe('такси');
		expect(normalize('Їжа')).toBe('ижа');
		expect(normalize('Ґанок')).toBe('ганок');
		expect(normalize('Єнот')).toBe('енот');
		expect(normalize('Ёлка')).toBe('елка');
		expect(normalize("п'ять")).toBe('пять');
	});

	it('слова короче двух букв и знаки отбрасываются', () => {
		expect(tokens('Кофе, и булка!')).toEqual(['кофе', 'булка']);
		expect(tokens('M&M’s')).toEqual(['m&ms']);
		expect(tokens('...')).toEqual([]);
	});
});

describe('matchCategory — частые покупки', () => {
	it.each([
		['хлеб и молоко', 'Продукты'],
		['сильпо', 'Продукты'],
		['обед', 'Кафе и рестораны'],
		['glovo', 'Кафе и рестораны'],
		['uber', 'Транспорт'],
		['бензин', 'Авто'],
		['аренда квартиры', 'Жильё'],
		['квартплата', 'Коммунальные услуги'],
		['свет', 'Коммунальные услуги'],
		['youtube premium', 'Подписки'],
		['стоматолог', 'Здоровье'],
		['кроссовки', 'Одежда и обувь'],
		['кино', 'Развлечения'],
		['букет', 'Подарки'],
		['корм коту', 'Питомцы'],
		['комиссия банка', 'Кредиты и комиссии']
	])('«%s» → %s', (text, expected) => {
		expect(name(text)).toBe(expected);
	});

	it('доходы', () => {
		expect(name('аванс', income)).toBe('Зарплата');
		expect(name('upwork', income)).toBe('Фриланс');
		expect(name('продал на olx', income)).toBe('Продажа');
		expect(name('вернул долг', income)).toBe('Возврат долга');
	});

	it('пустой текст и пустой список', () => {
		expect(name('')).toBeNull();
		expect(matchCategory('кофе', [])).toBeNull();
	});

	it('при равенстве побеждает категория выше в списке', () => {
		const list = [
			{ id: 'a', name: 'Первая', keywords: ['чай'] },
			{ id: 'b', name: 'Вторая', keywords: ['чай'] }
		];
		expect(matchCategory('чай', list)?.id).toBe('a');
	});

	it('точное слово важнее начала слова', () => {
		const list = [
			{ id: 'a', name: 'Начало', keywords: ['кофе'] },
			{ id: 'b', name: 'Точное', keywords: ['кофейня'] }
		];
		expect(matchCategory('кофейня', list)?.id).toBe('b');
	});

	it('слова из нескольких частей', () => {
		const list = [{ id: 'a', name: 'Связь', keywords: ['мой тариф'] }];
		expect(matchCategory('оплатил мой тариф', list)?.id).toBe('a');
		expect(matchCategory('тариф мой', list)).toBeNull();
	});
});

describe('learnableWord', () => {
	it('первое длинное незнакомое слово', () => {
		expect(learnableWord('2 чебурека', expense)).toBe('чебурека');
		expect(learnableWord('по 50', expense)).toBeNull();
		expect(learnableWord(null, expense)).toBeNull();
	});
});

describe('dropNameWords — название категории не дублируется в описании', () => {
	it.each([
		['продукты атб', 'Продукты', 'атб'],
		['Продукты АТБ', 'Продукты', 'АТБ'],
		['продукти', 'Продукты', ''],
		['продуктов, хлеб', 'Продукты', 'хлеб'],
		['кафе латте', 'Кафе и рестораны', 'латте'],
		['ужин в ресторане', 'Кафе и рестораны', 'ужин в'],
		['мобильная связь киевстар', 'Мобильная связь', 'киевстар'],
		['зарплата за октябрь', 'Зарплата', 'за октябрь'],
		['зарплату аванс', 'Зарплата', 'аванс'],
		['продуктовый набор подарок', 'Подарки', 'продуктовый набор']
	])('«%s» в «%s» → «%s»', (note, name, expected) => {
		expect(dropNameWords(note, name)).toBe(expected);
	});

	it.each([
		// ключевые слова и похожие, но другие слова остаются
		['кава', 'Кафе и рестораны'],
		['такси домой', 'Транспорт'],
		['автобус', 'Авто'],
		['автомобиль', 'Авто']
	])('«%s» в «%s» — без изменений', (note, name) => {
		expect(dropNameWords(note, name)).toBe(note);
	});

	it('пустое описание и короткое название — как есть', () => {
		expect(dropNameWords('', 'Продукты')).toBe('');
		expect(dropNameWords('ТВ приставка', 'ТВ')).toBe('ТВ приставка');
	});
});

describe('словарь товаров (goods.json)', () => {
	const cat = (text: string) => matchCategory(text, expense)?.name ?? null;

	it.each([
		// продукты
		['яблоки', 'Продукты'],
		['яблука', 'Продукты'],
		['хлеб', 'Продукты'],
		['хліб', 'Продукты'],
		['булочка', 'Продукты'],
		['булочки з маком', 'Продукты'],
		['бананы', 'Продукты'],
		['картопля', 'Продукты'],
		['огірки', 'Продукты'],
		['курица', 'Продукты'],
		['куряче філе', 'Продукты'],
		['сыр', 'Продукты'],
		['сир кисломолочний', 'Продукты'],
		['яйца', 'Продукты'],
		['яйця', 'Продукты'],
		['гречка', 'Продукты'],
		['масло', 'Продукты'],
		['йогурт', 'Продукты'],
		['шинка', 'Продукты'],
		['пломбир', 'Продукты'],
		['пиво', 'Продукты'],
		['сок', 'Продукты'],
		['сік', 'Продукты'],
		['макароны', 'Продукты'],
		['рис', 'Продукты'],
		['мороженое', 'Продукты'],
		['морозиво', 'Продукты'],
		['помидоры', 'Продукты'],
		['картошка', 'Продукты'],
		['творожок', 'Продукты'],
		['селёдка', 'Продукты'],
		['перловка', 'Продукты'],
		['пшоно', 'Продукты'],
		// кафе
		['чай', 'Кафе и рестораны'],
		['капучино', 'Кафе и рестораны'],
		['лате', 'Кафе и рестораны'],
		['картошка фри', 'Кафе и рестораны'],
		['пакетик чая', 'Кафе и рестораны'],
		['піца', 'Кафе и рестораны'],
		// одежда
		['носок', 'Одежда и обувь'],
		['носки', 'Одежда и обувь'],
		['кроссовки', 'Одежда и обувь'],
		['кросівки', 'Одежда и обувь'],
		['кофта', 'Одежда и обувь'],
		['сумка', 'Одежда и обувь'],
		['платок', 'Одежда и обувь'],
		['ремінь', 'Одежда и обувь'],
		['зонтик', 'Одежда и обувь'],
		['парасолька', 'Одежда и обувь'],
		['валіза', 'Одежда и обувь'],
		['шкарпетки', 'Одежда и обувь'],
		['куртка', 'Одежда и обувь'],
		['куртку', 'Одежда и обувь'],
		['шапка', 'Одежда и обувь'],
		['ботинки', 'Одежда и обувь'],
		['черевики', 'Одежда и обувь'],
		['трусы', 'Одежда и обувь'],
		// дом и быт
		['порошок', 'Дом и быт'],
		['стиральный порошок', 'Дом и быт'],
		['гель для стирки', 'Дом и быт'],
		['средство для посуды', 'Дом и быт'],
		['туалетная бумага', 'Дом и быт'],
		['туалетний папір', 'Дом и быт'],
		['лампочка', 'Дом и быт'],
		['сковорода', 'Дом и быт'],
		// остальное
		['чайник', 'Техника'],
		['стиральная машина', 'Техника'],
		['зарядка', 'Техника'],
		['зубная паста', 'Красота и уход'],
		['гель для душа', 'Красота и уход'],
		['дезодорант', 'Красота и уход'],
		['парацетамол', 'Здоровье'],
		['вітаміни', 'Здоровье'],
		['моторное масло', 'Авто'],
		['шины', 'Авто'],
		['наполнитель', 'Питомцы'],
		['протеин', 'Спорт'],
		['тетрадь', 'Образование'],
		['боулинг', 'Развлечения'],
		['жетон', 'Транспорт'],
		['симка', 'Мобильная связь']
	])('«%s» → %s', (text, name) => {
		expect(cat(text)).toBe(name);
	});

	it('платёж — не платок, зонтичный — не зонт', () => {
		expect(cat('платёж')).toBeNull();
		expect(cat('платіж')).toBeNull();
		expect(cat('зонтичный')).toBeNull();
	});

	it.each(['молоток', 'рыбалка', 'кошелёк', 'автобус', 'шорох', 'привет'])(
		'«%s» — похожее слово не путаем с продуктами',
		(text) => {
			expect(cat(text), text).not.toBe('Продукты');
		}
	);

	it('товар важнее магазина, но один магазин — всё ещё Продукты', () => {
		expect(cat('атб порошок')).toBe('Дом и быт');
		expect(cat('куртка в магазине')).toBe('Одежда и обувь');
		expect(cat('в магазин куртка')).toBe('Одежда и обувь');
		expect(cat('атб')).toBe('Продукты');
		expect(cat('магазин')).toBe('Продукты');
	});

	it('выученное слово важнее словаря: поправил «чай» на Продукты — так и будет', () => {
		const learned = expense.map((c) =>
			c.name === 'Продукты' ? { ...c, keywords: [...c.keywords, 'чай'] } : c
		);
		expect(matchCategory('чай', learned)?.name).toBe('Продукты');
		// и словарь не мешает это слово выучить
		expect(learnableWord('чай', expense)).toBe('чай');
	});

	it('категории со старыми значками-эмодзи (как в базе) находятся', () => {
		const legacy: Record<string, string> = {
			groceries: '🛒',
			clothes: '👕',
			household: '🧺',
			transport: '🚕',
			car: '⛽',
			beauty: '💇'
		};
		const old = expense.map((c) => ({ ...c, icon: legacy[c.icon] ?? c.icon }));
		expect(matchCategory('носки', old)?.name).toBe('Одежда и обувь');
		expect(matchCategory('яблоки', old)?.name).toBe('Продукты');
		expect(matchCategory('жетон', old)?.name).toBe('Транспорт');
		expect(matchCategory('антифриз', old)?.name).toBe('Авто');
	});

	it('переименованная категория со своим значком — по названию', () => {
		const mine = [{ id: 'x', name: 'Мій одяг', icon: '🧥', keywords: [] }];
		expect(matchCategory('шапка', mine)?.name).toBe('Мій одяг');
	});

	it('без значка словарь не работает — только слова-подсказки', () => {
		const bare = [{ id: 'x', name: 'Разное', keywords: [] }];
		expect(matchCategory('яблоки', bare)).toBeNull();
	});

	it('сила совпадения: подсказка 3, словарь чуть меньше, магазин — вдвое слабее', () => {
		expect(bestMatch('такси', expense).score).toBe(3);
		expect(bestMatch('яблоки', expense).score).toBe(2.9);
		expect(bestMatch('моторное', expense).score).toBe(2.95);
		expect(bestMatch('атб', expense).score).toBe(1.5);
		expect(bestMatch('привет', expense)).toEqual({ category: null, score: 0 });
	});

	describe('сам файл', () => {
		const entries = Object.entries(GOODS).flatMap(([group, g]) =>
			g.words.map((raw) => ({ group, raw, word: normalize(raw.replace(/^[=+]/, '')) }))
		);

		it('одно слово — одна категория', () => {
			const seen = new Map<string, string>();
			const clashes: string[] = [];
			for (const { group, word, raw } of entries) {
				const key = `${raw.startsWith('=') ? '=' : ''}${word}`;
				const was = seen.get(key);
				if (was && was !== group) clashes.push(`${raw}: ${was} и ${group}`);
				seen.set(key, group);
			}
			expect(clashes).toEqual([]);
		});

		it('слова не короче трёх букв, без пробелов и заглавных', () => {
			for (const { word, raw } of entries) {
				expect(word.length, raw).toBeGreaterThanOrEqual(3);
				expect(word, raw).toMatch(/^[\p{Ll}\p{N}]+$/u);
			}
		});

		it('значки — настоящие, и у каждой группы есть стартовая категория с ними', () => {
			for (const [group, g] of Object.entries(GOODS)) {
				for (const icon of g.icons) expect(isIconKey(icon), `${group}: ${icon}`).toBe(true);
				expect(
					expense.some((c) => (g.icons as string[]).includes(c.icon)),
					group
				).toBe(true);
			}
		});

		it('слово словаря не спорит с подсказкой другой стартовой категории', () => {
			const conflicts: string[] = [];
			for (const c of expense)
				for (const k of c.keywords) {
					const hit = goodsOf(normalize(k));
					if (hit && !(GOODS[hit.group].icons as string[]).includes(c.icon))
						conflicts.push(`«${k}» (${c.name}) → ${hit.group}`);
				}
			expect(conflicts).toEqual([]);
		});

		it('в словаре сотни слов', () => {
			expect(entries.length).toBeGreaterThan(1000);
		});
	});
});

describe('кому: Семья и Благотворительность', () => {
	const cat = (text: string) => matchCategory(text, expense)?.name ?? null;

	it.each([
		['сестре куртка', 'Семья'],
		['сестрі кросівки', 'Семья'],
		['брату такси', 'Семья'],
		['папе дал денег', 'Семья'],
		['татові на ліки', 'Семья'],
		['маме цветы', 'Семья'],
		['мамі продукти атб', 'Семья'],
		['бабушке хлеб', 'Семья'],
		['бабусі хліб', 'Семья'],
		['дедушке лекарства', 'Семья'],
		['для мамы торт', 'Семья'],
		['для сестри шапка', 'Семья'],
		['родителям коммуналка', 'Семья'],
		['дітям іграшки', 'Семья'],
		['семье продукты', 'Семья'],
		['донат зсу', 'Благотворительность'],
		['задонатил на зсу', 'Благотворительность'],
		['благотворительность', 'Благотворительность'],
		['благодійність', 'Благотворительность'],
		['пожертва церкви', 'Благотворительность'],
		['хлеб для приюта', 'Благотворительность'],
		['корм у притулок', 'Благотворительность'],
		['бездомному еда', 'Благотворительность'],
		['волонтерам', 'Благотворительность'],
		['фонд united24', 'Благотворительность']
	])('«%s» → %s', (text, name) => {
		expect(cat(text)).toBe(name);
	});

	it('«от мамы», «від тата», «мама дала» — не расход на маму', () => {
		expect(cat('від мами')).toBeNull();
		expect(cat('от папы')).toBeNull();
		expect(cat('мама дала')).toBeNull();
		expect(cat('брат')).toBeNull();
	});

	it('«тату» — это татуировка, а не папа', () => {
		expect(cat('тату')).not.toBe('Семья');
	});

	it('без «кому» товар идёт в свою категорию', () => {
		expect(cat('куртка')).toBe('Одежда и обувь');
		expect(cat('хлеб')).toBe('Продукты');
	});

	it('«кому» сильнее любой подсказки, своя подсказка с тем же словом — ещё сильнее', () => {
		expect(bestMatch('маме', expense).score).toBe(3.5);
		expect(bestMatch('маме такси', expense).category?.name).toBe('Семья');
		const mine = expense.map((c) =>
			c.name === 'Благотворительность' ? { ...c, keywords: [...c.keywords, 'бабусі'] } : c
		);
		expect(matchCategory('бабусі хліб', mine)?.name).toBe('Благотворительность');
		expect(matchCategory('бабушке хлеб', mine)?.name).toBe('Семья');
	});

	it('слова «кому» и связки не запоминаем — запоминаем сам товар', () => {
		expect(learnableWord('маме чебурек', expense)).toBe('чебурек');
		expect(learnableWord('для мами чебурек', expense)).toBe('чебурек');
		expect(learnableWord('бабусі', expense)).toBeNull();
		expect(learnableWord('для сестри', expense)).toBeNull();
	});
});
