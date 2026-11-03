import { describe, expect, it } from 'vitest';
import {
	ACCOUNT_ICONS,
	CATEGORY_ICONS,
	ICON_META,
	iconEmoji,
	iconKey,
	isIconKey,
	type IconKey
} from './icon-keys';
import { DIM_EMOJI } from './server/bot/ui';
import {
	DEFAULT_ACCOUNTS,
	DEFAULT_EXPENSE_CATEGORIES,
	DEFAULT_INCOME_CATEGORIES
} from './server/finance/defaults';

const keys = Object.keys(ICON_META) as IconKey[];

describe('набор иконок', () => {
	it('у каждой иконки есть подпись, эмодзи и цвет плитки', () => {
		for (const key of keys) {
			const meta = ICON_META[key];
			expect(meta.label, key).not.toBe('');
			expect(meta.emoji, key).not.toBe('');
			expect(meta.tone, key).toBeTruthy();
		}
	});

	it('эмодзи для Telegram яркие: ни одного тусклого', () => {
		for (const key of keys)
			for (const dim of DIM_EMOJI) expect(ICON_META[key].emoji, key).not.toContain(dim);
	});

	it('выбор иконок категорий и счетов — только существующие ключи, без повторов', () => {
		for (const list of [CATEGORY_ICONS, ACCOUNT_ICONS]) {
			expect(list.every(isIconKey)).toBe(true);
			expect(new Set(list).size).toBe(list.length);
		}
	});

	it('стартовые категории и счета используют ключи из набора', () => {
		for (const c of [
			...DEFAULT_EXPENSE_CATEGORIES,
			...DEFAULT_INCOME_CATEGORIES,
			...DEFAULT_ACCOUNTS
		])
			expect(isIconKey(c.icon), c.icon).toBe(true);
	});

	it('isIconKey не принимает чужое', () => {
		expect(isIconKey('groceries')).toBe(true);
		expect(isIconKey('toString')).toBe(false);
		expect(isIconKey('🛒')).toBe(false);
		expect(isIconKey(null)).toBe(false);
	});
});

describe('старые эмодзи из базы', () => {
	// так подписаны категории в базе у тех, кто начал до перехода на SVG
	it.each([
		['🛒', 'groceries'],
		['🍽', 'cafe'],
		['🚕', 'taxi'],
		['⛽', 'fuel'],
		['🐾', 'pets'],
		['🖥', 'tech'],
		['🛠', 'sidejob'],
		['💻', 'freelance'],
		['🏋️', 'sport'],
		['🏋', 'sport'],
		['↩️', 'refund'],
		['📈', 'growth'],
		['💳', 'card'],
		['🐷', 'savings']
	] as const)('%s → %s', (emoji, key) => {
		expect(iconKey(emoji)).toBe(key);
	});

	it('незнакомое — запасной ключ', () => {
		expect(iconKey('🦄')).toBe('other');
		expect(iconKey('🦄', 'card')).toBe('card');
		expect(iconKey(null)).toBe('other');
		expect(iconKey(' 🛒 ')).toBe('groceries');
	});
});

describe('iconEmoji — что показывает бот', () => {
	it('ключ → его эмодзи', () => {
		expect(iconEmoji('groceries')).toBe(ICON_META.groceries.emoji);
	});

	it('старое тусклое эмодзи из базы → новое яркое', () => {
		expect(iconEmoji('🐾')).toBe('🐶');
		expect(iconEmoji('🛠')).toBe('🧰');
		expect(iconEmoji('🖥')).toBe('💻');
		expect(iconEmoji('🎬')).toBe('🍿');
		expect(iconEmoji('🛒')).toBe('🍏');
	});

	it('💻 в базе — это старый «Фриланс», а не «Техника»', () => {
		expect(iconEmoji('💻')).toBe(ICON_META.freelance.emoji);
	});

	it('незнакомое эмодзи — как есть; пусто — вопрос', () => {
		expect(iconEmoji('🦄')).toBe('🦄');
		expect(iconEmoji(null)).toBe('❓');
		expect(iconEmoji('')).toBe('❓');
	});
});
