import { normalize, tokens } from '../finance/categorize.ts';
import { parseAmount } from '../../money.ts';

/**
 * Свободный ввод из чата:
 *   «250 продукты», «продукты 250», «кофе 65,50», «+30000 зарплата»,
 *   «вчера такси 180», «1 250 атб», «2к фриланс», «120+80 обед».
 */
export type Entry = {
	/** копейки */
	amount: number;
	/** явный знак перед суммой: «+» — доход, «-» — расход, null — угадываем по категории */
	sign: '+' | '-' | null;
	note: string;
	/** «вчера» → 1, «позавчера» → 2 */
	daysAgo: number;
};

const DAY_WORDS: Record<string, number> = {
	сегодня: 0,
	сьогодні: 0,
	вчера: 1,
	вчора: 1,
	позавчера: 2,
	позавчора: 2
};

const CURRENCY_WORDS = new Set(['грн', 'гривен', 'гривны', 'гривні', 'гривень', 'uah', '₴']);

export function parseEntry(text: string): Entry | null {
	// «1 250» → «1250»: пробел-разделитель тысяч не должен рвать сумму
	const joined = text.trim().replace(/(?<!\d)(\d{1,3})[   ](?=\d{3}(?!\d))/g, '$1');
	const words = joined.split(/\s+/).filter(Boolean);

	let daysAgo = 0;
	const skip = new Set<number>();
	const candidates: { index: number; amount: number; sign: Entry['sign'] }[] = [];

	words.forEach((word, index) => {
		const bare = word.toLowerCase().replace(/[.,!?:;]+$/, '');
		if (bare in DAY_WORDS) {
			daysAgo = DAY_WORDS[bare];
			skip.add(index);
			return;
		}
		// «250 грн кофе» — валюта отдельным словом не попадает в комментарий
		if (CURRENCY_WORDS.has(bare)) {
			skip.add(index);
			return;
		}

		const m = /^([+\-−–]?)(.+)$/.exec(word.replace(/[,:;]+$/, ''));
		if (!m) return;
		const amount = parseAmount(m[2]);
		if (amount === null) return;

		// знак мог быть отдельным словом: «+ 5000»
		let mark = m[1];
		if (!mark && index > 0 && /^[+\-−–]$/.test(words[index - 1])) {
			mark = words[index - 1];
			skip.add(index - 1);
		}
		candidates.push({ index, amount, sign: mark === '+' ? '+' : mark ? '-' : null });
	});

	if (candidates.length === 0) return null;

	// «2 кофе 130» — суммой считаем самое крупное число, остальное уходит в комментарий
	const pick = candidates.reduce((a, b) => (b.amount > a.amount ? b : a));

	const note = words
		.filter((w, i) => i !== pick.index && !skip.has(i) && /[\p{L}\p{N}]/u.test(w))
		.join(' ')
		.trim();

	return { amount: pick.amount, sign: pick.sign, note, daysAgo };
}

// ── Счёт словом: «250 кофе нал» ─────────────────────────────────────────

type AccountLike = { name: string; type: string };

/**
 * Слова, которыми называют тип счёта. exact — только целое слово («нал»,
 * но не «налог»), prefix — начало слова («наличными», «готівкою»).
 * Сравниваем после normalize(): «готівка» → «готивка».
 */
const TYPE_WORDS: Record<string, { exact: string[]; prefix: string[] }> = {
	CASH: { exact: ['нал', 'налом', 'кеш', 'кэш', 'кешем', 'cash'], prefix: ['налич', 'готивк'] },
	CARD: {
		exact: ['карта', 'картой', 'карте', 'карту', 'картка', 'карткой', 'карткою', 'картою', 'card'],
		prefix: ['безнал']
	}
};

/** Совпадает ли слово с названием счёта: целиком, сокращением («моно») или в другом падеже. */
function matchesName(token: string, name: string): boolean {
	for (const word of tokens(name)) {
		if (word.length < 3) continue;
		if (token === word) return true;
		// сокращение: «моно» → «монобанк», но не «при» → «приват»
		if (token.length >= 4 && word.startsWith(token)) return true;
		// другой падеж: «наличными» → «наличные», «накоплений» → «накопления»
		if (word.length >= 6 && token.startsWith(word.slice(0, -2)) && token.length <= word.length + 3)
			return true;
	}
	return false;
}

function matchesType(token: string, type: string): boolean {
	const words = TYPE_WORDS[type];
	return !!words && (words.exact.includes(token) || words.prefix.some((p) => token.startsWith(p)));
}

/**
 * Ищет в комментарии слово счёта и убирает его: «кофе нал» → счёт «Наличные»,
 * комментарий «кофе». Сначала по названию счёта, потом по типу. Если счёт
 * один — искать нечего.
 */
export function extractAccount<T extends AccountLike>(
	note: string,
	accounts: T[]
): { account: T | null; note: string } {
	if (!note || accounts.length < 2) return { account: null, note };
	const words = note.split(/\s+/).filter(Boolean);

	for (let i = 0; i < words.length; i++) {
		const token = normalize(words[i]).replace(/[^\p{L}]/gu, '');
		if (token.length < 3) continue;
		const account =
			accounts.find((a) => matchesName(token, a.name)) ??
			accounts.find((a) => matchesType(token, a.type));
		if (account) {
			const rest = words.filter((_, j) => j !== i).join(' ');
			return { account, note: rest };
		}
	}
	return { account: null, note };
}
