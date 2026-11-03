import { describe, expect, it } from 'vitest';
import {
	MAX_AMOUNT,
	formatCompact,
	formatMoney,
	parseAmount,
	percentChange,
	toInputAmount
} from './money';

describe('formatMoney', () => {
	it('ноль и копейки', () => {
		expect(formatMoney(0)).toBe('0 ₴');
		expect(formatMoney(5)).toBe('0,05 ₴');
		expect(formatMoney(100)).toBe('1 ₴');
	});

	it('без знака валюты и со знаком плюс', () => {
		expect(formatMoney(25000, { currency: false })).toBe('250');
		expect(formatMoney(0, { sign: true })).toBe('0 ₴');
		expect(formatMoney(-100, { sign: true })).toBe('−1 ₴');
	});
});

describe('formatCompact — подписи осей', () => {
	it.each([
		[0, '0'],
		[999900, '9 999'],
		[1_200_000, '12 тыс'],
		[150_000_000, '1,5 млн'],
		[-1_200_000, '−12 тыс']
	])('%i коп. → %s', (kop, text) => {
		expect(formatCompact(kop).replace(/[\s ]/g, ' ').replace('-', '−')).toBe(text);
	});
});

describe('toInputAmount — сумма в поле ввода', () => {
	it.each([
		[25000, '250'],
		[25050, '250,50'],
		[25005, '250,05'],
		[1, '0,01']
	])('%i → %s', (kop, text) => {
		expect(toInputAmount(kop)).toBe(text);
		expect(parseAmount(text)).toBe(kop);
	});
});

describe('parseAmount — границы', () => {
	it('слишком большая сумма — не сумма', () => {
		expect(parseAmount(String(MAX_AMOUNT / 100))).toBeNull();
		expect(parseAmount(String(MAX_AMOUNT / 100 - 1))).toBe(MAX_AMOUNT - 100);
	});

	it('регистр и валюта', () => {
		expect(parseAmount('2К')).toBe(200000);
		expect(parseAmount('250 UAH')).toBe(25000);
		expect(parseAmount('250₴')).toBe(25000);
		expect(parseAmount('3тис')).toBe(300000);
	});
});

describe('percentChange', () => {
	it('рост, падение, не с чем сравнить', () => {
		expect(percentChange(150, 100)).toBe(50);
		expect(percentChange(50, 100)).toBe(-50);
		expect(percentChange(100, 0)).toBeNull();
	});
});
