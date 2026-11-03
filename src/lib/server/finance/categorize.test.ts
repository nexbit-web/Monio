import { describe, expect, it } from 'vitest';
import { learnableWord, matchCategory, normalize, tokens } from './categorize';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './defaults';

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
