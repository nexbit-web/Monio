import { describe, expect, it } from 'vitest';
import { parseEntry } from './parse';
import { formatMoney, parseAmount } from '../../money';
import { matchCategory, learnableWord } from '../finance/categorize';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../finance/defaults';

describe('parseAmount', () => {
	it.each([
		['250', 25000],
		['250,50', 25050],
		['99.9', 9990],
		['1 250', 125000],
		['250грн', 25000],
		['2к', 200000],
		['1,5к', 150000],
		['120+80', 20000]
	])('%s → %i коп.', (input, expected) => {
		expect(parseAmount(input)).toBe(expected);
	});

	it.each(['', 'abc', '0', '-5', '1,234', '12..5'])('«%s» — не сумма', (input) => {
		expect(parseAmount(input)).toBeNull();
	});
});

describe('formatMoney', () => {
	it('целые без копеек, дробные с копейками, неразрывный пробел в тысячах', () => {
		expect(formatMoney(125000)).toBe('1 250 ₴');
		expect(formatMoney(25050)).toBe('250,50 ₴');
		expect(formatMoney(-25000)).toBe('−250 ₴');
		expect(formatMoney(25000, { sign: true })).toBe('+250 ₴');
	});
});

describe('parseEntry', () => {
	it('сумма в начале или в конце', () => {
		expect(parseEntry('250 продукты')).toEqual({
			amount: 25000,
			sign: null,
			note: 'продукты',
			daysAgo: 0
		});
		expect(parseEntry('кофе 65,50')).toEqual({
			amount: 6550,
			sign: null,
			note: 'кофе',
			daysAgo: 0
		});
	});

	it('плюс — доход, в том числе отдельным словом', () => {
		expect(parseEntry('+30000 зарплата')?.sign).toBe('+');
		expect(parseEntry('+ 5000 фриланс')).toMatchObject({
			amount: 500000,
			sign: '+',
			note: 'фриланс'
		});
	});

	it('вчера / позавчера / вчора', () => {
		expect(parseEntry('вчера такси 180')).toMatchObject({
			amount: 18000,
			note: 'такси',
			daysAgo: 1
		});
		expect(parseEntry('позавчора кава 70')?.daysAgo).toBe(2);
	});

	it('тысячи через пробел и «к»', () => {
		expect(parseEntry('1 250 атб')?.amount).toBe(125000);
		expect(parseEntry('2к фриланс')?.amount).toBe(200000);
	});

	it('несколько чисел — сумма самая крупная, остальное в комментарий', () => {
		expect(parseEntry('2 кофе 130')).toMatchObject({ amount: 13000, note: '2 кофе' });
	});

	it('без числа — null', () => {
		expect(parseEntry('привет')).toBeNull();
		expect(parseEntry('📊 Сегодня')).toBeNull();
	});
});

describe('matchCategory', () => {
	const expense = DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({ id: `e${i}`, ...c }));
	const income = DEFAULT_INCOME_CATEGORIES.map((c, i) => ({ id: `i${i}`, ...c }));
	const name = (text: string, list = expense) => matchCategory(text, list)?.name ?? null;

	it.each([
		['атб', 'Продукты'],
		['продуктов на неделю', 'Продукты'],
		['продукти', 'Продукты'],
		['кава', 'Кафе и рестораны'],
		['таксі додому', 'Транспорт'],
		['Bolt', 'Транспорт'],
		['киевстар', 'Мобильная связь'],
		['поповнення мобільного', 'Мобильная связь'],
		['интернет', 'Интернет и ТВ'],
		['комуналка', 'Коммунальные услуги'],
		['аптека', 'Здоровье'],
		['барбер', 'Красота и уход'],
		['netflix', 'Подписки']
	])('«%s» → %s', (text, expected) => {
		expect(name(text)).toBe(expected);
	});

	it('не путает похожие слова', () => {
		expect(name('котлеты')).not.toBe('Питомцы');
		expect(name('вода')).toBe('Продукты');
		expect(name('чебуреки')).toBeNull();
	});

	it('доходы', () => {
		expect(name('зарплата', income)).toBe('Зарплата');
		expect(name('зп', income)).toBe('Зарплата');
		expect(name('кешбек', income)).toBe('Кешбэк и проценты');
	});

	it('learnableWord: новое слово — запоминаем, известное — нет', () => {
		expect(learnableWord('чебуреки у метро', expense)).toBe('чебуреки');
		expect(learnableWord('атб хлеб', expense)).toBeNull();
		expect(learnableWord('', expense)).toBeNull();
	});
});
