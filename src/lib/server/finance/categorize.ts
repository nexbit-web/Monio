/**
 * Угадывание категории по тексту: «атб хлеб» → Продукты, «киевстар» → Мобильная связь.
 * Сравниваем по основам слов, поэтому «продуктов» совпадает с ключом «продукт».
 *
 * Два источника, по силе совпадения:
 *   3.6  — своя подсказка, которая совпала со словом «кому» («бабусі» → Благотворительность);
 *   3.5  — слово «кому» из словаря: «маме», «брату», «донат» — важнее любого товара,
 *          «сестре куртка» → Семья. После «от/від» не считается: «від мами» — не расход на маму;
 *   3    — слово-подсказка категории целиком (в том числе выученное: «чай» → Продукты);
 *   2.95 — сильное слово из словаря товаров («моторное» → Авто);
 *   2.9  — слово из словаря товаров (goods.ts): «яблоки» → Продукты, «носки» → Одежда;
 *   2    — слово начинается с подсказки; 1 — сокращение подсказки.
 * Подсказки-магазины и общие слова («атб», «магазин») — вдвое слабее: «атб порошок»
 * — это Дом и быт, а не Продукты; одно «250 атб» — по-прежнему Продукты.
 */
import { iconKey } from '../../icon-keys.ts';
import { GOODS } from './goods.ts';

export type Matchable = {
	id: string;
	name: string;
	keywords: string[];
	/** значок категории — по нему категорию находит словарь товаров */
	icon?: string;
};

/** Нижний регистр, ё→е и украинские буквы → русские, чтобы «таксі» совпало с «такси». */
export function normalize(s: string): string {
	return s
		.toLowerCase()
		.replace(/ё/g, 'е')
		.replace(/[ії]/g, 'и')
		.replace(/є/g, 'е')
		.replace(/ґ/g, 'г')
		.replace(/[’'`ʼ]/g, '');
}

export function tokens(s: string): string[] {
	return normalize(s)
		.split(/[^\p{L}\p{N}&.]+/u)
		.map((t) => t.replace(/^\.+|\.+$/g, ''))
		.filter((t) => t.length >= 2);
}

function termsOf(c: Matchable): string[] {
	const terms = new Set<string>();
	for (const w of tokens(c.name)) {
		if (w.length < 4) continue;
		terms.add(w);
		if (w.length >= 6) terms.add(w.slice(0, -1));
	}
	for (const k of c.keywords) {
		const n = normalize(k).trim();
		if (n) terms.add(n);
	}
	return [...terms];
}

/**
 * Подсказки, которые говорят «где», а не «что»: магазины и общие слова.
 * Конкретный товар в той же записи важнее них.
 */
const WEAK = new Set(
	[
		'магазин',
		'супермаркет',
		'маркет',
		'еда',
		'їжа',
		'покупк',
		'атб',
		'сильпо',
		'сільпо',
		'novus',
		'новус',
		'ашан',
		'фора',
		'варус',
		'метро',
		'эпицентр',
		'епіцентр',
		'rozetka',
		'розетк',
		'comfy',
		'фокстрот',
		'eva',
		'glovo',
		'глово',
		'доставк',
		'olx'
	].map(normalize)
);

/** 3 — точное слово, 2 — слово начинается с ключа, 1 — сокращение («интер» → «интернет»). */
function score(token: string, term: string): number {
	if (token === term) return 3;
	if (term.length >= 4 && token.length > term.length && token.startsWith(term)) return 2;
	if (token.length >= 5 && term.startsWith(token)) return 1;
	return 0;
}

function keywordScore(toks: string[], c: Matchable): number {
	if (toks.length === 0) return 0;
	const joined = ` ${toks.join(' ')} `;
	let best = 0;
	for (const term of termsOf(c)) {
		let s = 0;
		if (term.includes(' ')) s = joined.includes(` ${term} `) ? 3 : 0;
		else for (const tok of toks) s = Math.max(s, score(tok, term));
		if (WEAK.has(term)) s /= 2;
		// своя подсказка «бабусі» важнее того же слова в словаре «кому»
		if (s === 3 && goodsOf(term)?.priority) s = OWN_RECIPIENT;
		best = Math.max(best, s);
		if (best === OWN_RECIPIENT) break;
	}
	return best;
}

const bestScore = (text: string, c: Matchable) => keywordScore(tokens(text), c);

// ── Словарь товаров ─────────────────────────────────────────────────────

type GoodsEntry = { group: string; weight: number; priority: boolean };

/** Слово «кому» из словаря и своя подсказка с тем же словом. */
const RECIPIENT = 3.5;
const OWN_RECIPIENT = 3.6;

/** После этих слов «кому» не считается: «від мами 500» — это мама дала, а не расход на маму. */
const FROM = new Set(['от', 'вид', 'из']);

/** Слова-связки: их не запоминаем как подсказку категории. */
const FILLER = new Set(['для', 'вид', 'под', 'при', 'про', 'без', 'через', 'купил', 'купила']);

/** Слово → группа: точные слова отдельно, основы — отдельно. */
const EXACT = new Map<string, GoodsEntry>();
const STEMS = new Map<string, GoodsEntry>();
for (const [group, { words, priority = false }] of Object.entries(GOODS)) {
	for (const raw of words) {
		const exact = raw.startsWith('=');
		const strong = raw.startsWith('+');
		const word = normalize(exact || strong ? raw.slice(1) : raw);
		const weight = priority ? RECIPIENT : strong ? 2.95 : 2.9;
		(exact ? EXACT : STEMS).set(word, { group, weight, priority });
	}
}

/** Сколько букв окончания может идти после основы: «яблок» + «ами». */
const MAX_ENDING = 3;

/** Группа товара для слова: точное совпадение или самая длинная подходящая основа. */
export function goodsOf(token: string): GoodsEntry | null {
	const hit = EXACT.get(token);
	if (hit) return hit;
	for (let len = token.length; len >= Math.max(3, token.length - MAX_ENDING); len--) {
		const stem = STEMS.get(token.slice(0, len));
		if (stem) return stem;
	}
	return null;
}

/** Группы словаря, к которым относится категория: по значку, а если он свой — по названию. */
function groupsOf(c: Matchable): Set<string> {
	const key = iconKey(c.icon);
	const byIcon = Object.entries(GOODS).filter(([, g]) => g.icons.includes(key));
	if (byIcon.length) return new Set(byIcon.map(([name]) => name));
	const words = tokens(c.name);
	return new Set(
		Object.entries(GOODS)
			.filter(([, g]) => g.names.some((n) => words.some((w) => w.startsWith(normalize(n)))))
			.map(([name]) => name)
	);
}

function goodsScore(toks: string[], c: Matchable): number {
	if (!toks.length) return 0;
	const groups = groupsOf(c);
	if (!groups.size) return 0;
	let best = 0;
	toks.forEach((tok, i) => {
		const hit = goodsOf(tok);
		if (!hit || !groups.has(hit.group)) return;
		if (hit.priority && i > 0 && FROM.has(toks[i - 1])) return;
		best = Math.max(best, hit.weight);
	});
	return best;
}

/**
 * Лучшая категория и сила совпадения (0 — не узнали). При равенстве
 * побеждает та, что раньше в списке. Словарь товаров работает для категорий
 * со значком (icon); без него — только слова-подсказки.
 */
export function bestMatch<T extends Matchable>(
	text: string,
	categories: T[]
): { category: T | null; score: number } {
	const toks = tokens(text);
	let category: T | null = null;
	let top = 0;
	for (const c of categories) {
		const s = Math.max(keywordScore(toks, c), goodsScore(toks, c));
		if (s > top) {
			category = c;
			top = s;
		}
	}
	return { category, score: top };
}

/** Лучшая категория из списка или null. При равенстве побеждает та, что раньше в списке. */
export function matchCategory<T extends Matchable>(text: string, categories: T[]): T | null {
	return bestMatch(text, categories).category;
}

/**
 * Слово, которое стоит запомнить как ключ категории, когда пользователь выбрал её вручную:
 * первое «настоящее» слово комментария, которое пока не узнаётся ни одной категорией.
 * Словарь товаров тут не в счёт: если бот решил «чай» → Кафе, а человек
 * поправил на Продукты, слово запоминаем — и дальше оно важнее словаря.
 * Слова «кому» («маме», «бабусі») не запоминаем: «маме хлеб», перенесённый в
 * Продукты, — исправление одной записи, а не правило «всё для мамы — Продукты».
 */
export function learnableWord(note: string | null, categories: Matchable[]): string | null {
	if (!note) return null;
	const word = tokens(note).find(
		(t) => /^\p{L}{3,30}$/u.test(t) && !FILLER.has(t) && !goodsOf(t)?.priority
	);
	if (!word) return null;
	return categories.some((c) => bestScore(word, c) > 0) ? null : word;
}

/**
 * Убирает из комментария слова, которые просто повторяют название категории:
 * «продукты атб» в категории «Продукты» → «атб», «продукти» → «». Остальные
 * слова остаются, даже ключевые: «кофе», «такси», «атб» говорят, что именно
 * купили, а название категории и так видно рядом.
 */
export function dropNameWords(note: string, categoryName: string): string {
	const names = tokens(categoryName).filter((w) => w.length >= 4);
	if (!note || names.length === 0) return note;
	// основа слова: «продукты» → «продук» (ловит «продукти», «продуктов»), «кафе» → «кафе»
	const stems = names.map((n) => ({
		n,
		stem: n.length >= 7 ? n.slice(0, -2) : n.length >= 5 ? n.slice(0, -1) : n
	}));
	return note
		.split(/\s+/)
		.filter((word) => {
			const t = normalize(word).replace(/[^\p{L}\p{N}]/gu, '');
			return !stems.some(({ n, stem }) => t.startsWith(stem) && t.length <= n.length + 2);
		})
		.join(' ');
}
