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
