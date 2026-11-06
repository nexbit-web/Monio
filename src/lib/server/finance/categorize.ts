/**
 * Угадывание категории по тексту: «атб хлеб» → Продукты, «киевстар» → Мобильная связь.
 * Сравниваем по основам слов, поэтому «продуктов» совпадает с ключом «продукт».
 */

export type Matchable = { id: string; name: string; keywords: string[] };

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

/** 3 — точное слово, 2 — слово начинается с ключа, 1 — сокращение («интер» → «интернет»). */
function score(token: string, term: string): number {
	if (token === term) return 3;
	if (term.length >= 4 && token.length > term.length && token.startsWith(term)) return 2;
	if (token.length >= 5 && term.startsWith(token)) return 1;
	return 0;
}

function bestScore(text: string, c: Matchable): number {
	const toks = tokens(text);
	if (toks.length === 0) return 0;
	const joined = ` ${toks.join(' ')} `;
	let best = 0;
	for (const term of termsOf(c)) {
		if (term.includes(' ')) {
			if (joined.includes(` ${term} `)) best = 3;
			continue;
		}
		for (const tok of toks) best = Math.max(best, score(tok, term));
		if (best === 3) break;
	}
	return best;
}

/** Лучшая категория из списка или null. При равенстве побеждает та, что раньше в списке. */
export function matchCategory<T extends Matchable>(text: string, categories: T[]): T | null {
	let best: T | null = null;
	let top = 0;
	for (const c of categories) {
		const s = bestScore(text, c);
		if (s > top) {
			best = c;
			top = s;
		}
	}
	return best;
}

/**
 * Слово, которое стоит запомнить как ключ категории, когда пользователь выбрал её вручную:
 * первое «настоящее» слово комментария, которое пока не узнаётся ни одной категорией.
 */
export function learnableWord(note: string | null, categories: Matchable[]): string | null {
	if (!note) return null;
	const word = tokens(note).find((t) => /^\p{L}{3,30}$/u.test(t));
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
