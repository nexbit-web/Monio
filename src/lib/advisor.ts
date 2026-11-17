/**
 * Финансовый наставник. Цель одна — откладывать каждый месяц $100 (сумму
 * можно поменять в настройках).
 *
 * Отложено — только то, что человек сам отложил: перевёл на счёт «Накопления»
 * (в боте — «нз 1000» или «відклав 1000», в CRM — перевод на этот счёт).
 * То, что просто осталось на карте, к цели не считается.
 *
 * По доходам, расходам и отложенному наставник говорит:
 *  - как идёт этот месяц: сколько уже отложено и сколько ещё можно тратить,
 *    чтобы было из чего отложить остальное;
 *  - хватает ли на цель в средний месяц и сколько тогда можно тратить;
 *  - итоги прошлых месяцев: выполнена ли цель и на сколько, а если нет —
 *    почему (деньги были, но не отложены; доход меньше обычного; расходы
 *    больше).
 *
 * Без сумм по категориям — никаких «на еду — не больше 3 000 ₴».
 * Цель в гривнах — по курсу НБУ (server/rates.ts): для этого месяца —
 * последний курс, для прошлых — на последний день месяца.
 *
 * Чистые функции: данные на входе — выводы на выходе, без базы и сети. Модуль
 * общий для CRM и бота; тексты рисуют отдельно: CRM по-русски (advice-ru.ts),
 * бот по-украински (bot/advice-text.ts). Все суммы — копейки.
 */
import {
	DAY_MS,
	dayKeyOf,
	daysInMonth,
	monthKeyOf,
	monthRange,
	shiftMonth,
	zonedParts
} from './date.ts';

export type Kind = 'EXPENSE' | 'INCOME';
export type AccountType = 'CARD' | 'CASH' | 'SAVINGS' | 'OTHER';

export type AdvisorCategory = {
	id: string;
	kind: Kind;
	name: string;
	icon: string;
};

/** Сумма операций одного типа одной категории за месяц («2026-11»). */
export type MonthCell = { month: string; type: Kind; categoryId: string | null; total: number };

/** Курс доллара НБУ, ₴ за $1. */
export type UsdRates = {
	/** последний курс */
	current: number;
	/** на какой день («2026-11-17»); null — НБУ недоступен, курс примерный */
	date: string | null;
	/** курс на последний день месяца: «2026-10» → 45.53 */
	monthEnd: Record<string, number>;
};

export type AdvisorInput = {
	now: Date;
	tz: string;
	/** ячейки за HISTORY_MONTHS прошлых месяцев и текущий */
	cells: MonthCell[];
	/** отложено по месяцам: «2026-11» → переводы на «Накопления» минус обратно */
	saved: Map<string, number>;
	/** все категории, и архивные — по ним узнаём названия в истории */
	categories: AdvisorCategory[];
	/** самая ранняя операция — с неё начался учёт */
	firstTxAt: Date | null;
	/** цель: сколько долларов откладывать в месяц */
	goalUsd: number;
	rates: UsdRates;
};

// ── Правила ─────────────────────────────────────────────────────────────

export const DEFAULT_GOAL_USD = 100;
/** Средний месяц — по стольким последним полным месяцам. */
export const LOOKBACK_MONTHS = 3;
/** Итоги — за столько прошлых месяцев. */
export const HISTORY_MONTHS = 6;
/** Меньше недели записей — выводы делать рано. */
export const MIN_DAYS = 7;
/** Средний месяц для пересчёта «в день → в месяц». */
const MONTH_DAYS = 30.4;
/** Доход упал или расходы выросли заметно — от 500 ₴ и от 5% обычного. */
const NOTABLE = 50_000;
const NOTABLE_SHARE = 0.05;
/** Рост категории, о котором стоит сказать, — от 200 ₴. */
const GROWTH_MIN = 20_000;

/** Счета раз в месяц: их не растягивают на месяц по дням, как продукты. */
const BILL_ICONS = new Set(['home', 'utilities', 'mobile', 'internet', 'subscriptions', 'bank']);
const GROCERY_ICONS = new Set(['groceries']);
const EATING_OUT_ICONS = new Set(['cafe', 'coffee', 'drinks']);

export const isBill = (c: { icon: string } | undefined) => !!c && BILL_ICONS.has(c.icon);
export const isGroceries = (c: { icon: string; name: string } | undefined | null) =>
	!!c && (GROCERY_ICONS.has(c.icon) || /продукт/i.test(c.name));
export const isEatingOut = (c: { icon: string; name: string } | undefined | null) =>
	!!c && (EATING_OUT_ICONS.has(c.icon) || /кафе|ресторан/i.test(c.name));

/** Расчётные суммы — до целой гривны: «7 735 ₴», а не «7 734,80 ₴». */
const wholeUah = (kop: number) => Math.round(kop / 100) * 100;
/** Вниз до гривны — «можно тратить» лучше недооценить. */
const floorUah = (kop: number) => Math.floor(kop / 100) * 100;

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/**
 * Копейки → целые доллары, вниз: 4 520 ₴ по 45,39 → $99, чтобы невыполненная
 * цель не выглядела как «$100 из $100». Запас 0,02 — цель округлена до гривны,
 * и ровно выполненная не должна стать «$99».
 */
export const toUsd = (kop: number, rate: number) => Math.floor(kop / 100 / rate + 0.02);
/** …вверх — для «не хватило»: 19 ₴ → $1. */
export const toUsdUp = (kop: number, rate: number) =>
	Math.max(1, Math.ceil(kop / 100 / rate - 0.02));
/** Доллары → копейки, до целой гривны: $100 по 45,39 → 4 539 ₴. */
export const fromUsd = (usd: number, rate: number) => Math.round(usd * rate) * 100;

// ── Результат ───────────────────────────────────────────────────────────

export type CategoryRef = { id: string | null; name: string; icon: string | null };

export type Goal = {
	usd: number;
	/** ₴ за $1 */
	rate: number;
	/** день курса; null — курс примерный */
	rateDate: string | null;
	/** цель в гривнах по этому курсу */
	amount: number;
};

/**
 * Хватает ли на цель в средний месяц. enough — да; gap — не хватает, но доход
 * больше расходов; deficit — расходы больше доходов; no-income — доходов нет;
 * none — данных мало.
 */
export type Plan = {
	kind: 'enough' | 'gap' | 'deficit' | 'no-income' | 'none';
	/** не хватает до цели в средний месяц */
	gap: number;
	/** сколько можно тратить в месяц, чтобы откладывать цель; ≤ 0 — доход меньше цели */
	maxSpend: number;
};

/** Почему цель месяца не выполнена — по важности. */
export type Reason =
	/** деньги были — осталось свободных free, но их не отложили */
	| { id: 'not-saved'; free: number }
	| { id: 'no-income' }
	| { id: 'income-down'; amount: number; usual: number }
	| {
			id: 'expense-up';
			amount: number;
			usual: number;
			/** какие траты выросли сильнее всего */
			top: (CategoryRef & { delta: number })[];
	  }
	| { id: 'deficit'; amount: number }
	| { id: 'expense-high'; share: number };

/** Итог прошлого месяца. */
export type GoalMonth = {
	key: string;
	/** учёт начался посреди месяца */
	partial: boolean;
	income: number;
	expense: number;
	/** отложено вручную */
	saved: number;
	/** ₴ за $1 на конец месяца */
	rate: number;
	/** цель в гривнах по этому курсу */
	goal: number;
	met: boolean;
	/** пусто, если цель выполнена */
	reasons: Reason[];
};

export type Advice = {
	/** history — по полным месяцам; estimate — оценка по первым дням; none — данных мало */
	mode: 'history' | 'estimate' | 'none';
	/** полных месяцев в расчёте */
	months: number;
	/** дней учёта */
	days: number;

	goal: Goal;

	/** средний месяц */
	income: number;
	expense: number;
	/** доход − расход */
	free: number;

	plan: Plan;

	/** текущий месяц */
	month: {
		key: string;
		day: number;
		days: number;
		income: number;
		expense: number;
		/** отложено вручную */
		saved: number;
		/** сколько ещё отложить до цели */
		remaining: number;
		/** свободно сейчас: доходы − расходы − отложенное */
		free: number;
		/** доход, на который рассчитываем: в истории — не меньше среднего */
		expectedIncome: number;
		/** можно ещё потратить, чтобы было из чего отложить остальное; < 0 — не хватает */
		left: number | null;
		/** …то же в день, включая сегодня */
		perDay: number | null;
		/** расходы к концу месяца при нынешнем темпе; null — рано судить */
		projected: number | null;
		/** сколько ещё реально отложить к концу месяца при нынешнем темпе; null — рано судить */
		canSave: number | null;
		/** done — цель выполнена; no-income — доходов нет; short — на цель уже не
		 *  хватает; pace — темп трат не даст отложить; ok — идём по плану */
		status: 'done' | 'no-income' | 'short' | 'pace' | 'ok';
	};

	/** итоги прошлых месяцев, сначала последний */
	history: GoalMonth[];
};

// ── Расчёт ──────────────────────────────────────────────────────────────

function dayDiff(fromKey: string, toKey: string): number {
	return Math.round(
		(Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS
	);
}

const average = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

type MonthTotals = {
	income: number;
	expense: number;
	cats: Map<string | null, number>;
	empty: boolean;
};

export function analyze(input: AdvisorInput): Advice {
	const { now, tz, cells, categories, firstTxAt, rates } = input;
	const month = monthKeyOf(now, tz);
	const today = zonedParts(now, tz).day;
	const dim = daysInMonth(month);
	const byId = new Map(categories.map((c) => [c.id, c]));
	const ref = (id: string | null): CategoryRef => {
		const c = id ? byId.get(id) : undefined;
		return { id, name: c?.name ?? 'Без категории', icon: c?.icon ?? null };
	};
	const savedIn = (m: string) => input.saved.get(m) ?? 0;

	const goalUsd = input.goalUsd > 0 ? input.goalUsd : DEFAULT_GOAL_USD;
	const goal: Goal = {
		usd: goalUsd,
		rate: rates.current,
		rateDate: rates.date,
		amount: fromUsd(goalUsd, rates.current)
	};

	// ── С какого момента ведётся учёт и какие месяцы полные ─────────────
	const startKey = firstTxAt ? dayKeyOf(firstTxAt, tz) : null;
	const startMonth = startKey?.slice(0, 7) ?? null;
	const startDay = startKey ? Number(startKey.slice(8, 10)) : 1;
	const days = startKey ? dayDiff(startKey, dayKeyOf(now, tz)) + 1 : 0;
	// месяц полный, если учёт начался до него или в первые три дня
	const isFull = (m: string) =>
		!!startMonth && (m > startMonth || (m === startMonth && startDay <= 3));

	const fullMonths: string[] = [];
	for (let i = 1; i <= LOOKBACK_MONTHS; i++) {
		const m = shiftMonth(month, -i);
		if (isFull(m)) fullMonths.push(m);
	}

	const mode: Advice['mode'] = fullMonths.length
		? 'history'
		: days >= MIN_DAYS
			? 'estimate'
			: 'none';

	// ── Средний месяц ───────────────────────────────────────────────────
	// history: среднее по полным месяцам. estimate: всё записанное, ежедневные
	// траты растянуты на месяц, а счета (аренда, связь) — как есть.
	let income = 0;
	let expense = 0;
	if (mode === 'history') {
		const used = new Set(fullMonths);
		for (const c of cells) {
			if (!used.has(c.month)) continue;
			if (c.type === 'INCOME') income += c.total;
			else expense += c.total;
		}
		income /= fullMonths.length;
		expense /= fullMonths.length;
	} else if (mode === 'estimate') {
		const stretch = MONTH_DAYS / days;
		const shrink = Math.min(1, stretch);
		for (const c of cells) {
			if (c.type === 'INCOME') income += c.total * shrink;
			else
				expense +=
					c.total * (isBill(c.categoryId ? byId.get(c.categoryId) : undefined) ? shrink : stretch);
		}
	}
	income = wholeUah(income);
	expense = wholeUah(expense);
	const free = income - expense;

	// ── Хватает ли на цель в средний месяц ──────────────────────────────
	const plan: Plan = { kind: 'none', gap: 0, maxSpend: income - goal.amount };
	if (mode !== 'none') {
		if (income <= 0) plan.kind = 'no-income';
		else {
			plan.gap = Math.max(0, goal.amount - free);
			plan.kind = plan.gap === 0 ? 'enough' : free < 0 ? 'deficit' : 'gap';
		}
	}

	// ── Текущий месяц ───────────────────────────────────────────────────
	let curIncome = 0;
	let curExpense = 0;
	let bills = 0;
	for (const c of cells) {
		if (c.month !== month) continue;
		if (c.type === 'INCOME') curIncome += c.total;
		else {
			curExpense += c.total;
			if (c.categoryId && isBill(byId.get(c.categoryId))) bills += c.total;
		}
	}
	const saved = savedIn(month);
	const remaining = Math.max(0, goal.amount - saved);
	const expectedIncome = mode === 'history' ? Math.max(curIncome, income) : curIncome;
	// тратить можно то, что останется после цели: max — если отложили больше цели
	const reserve = Math.max(saved, goal.amount);
	const left = expectedIncome > 0 ? floorUah(expectedIncome - curExpense - reserve) : null;
	const daysLeft = dim - today + 1;
	const perDay = left === null ? null : Math.max(0, floorUah(left / daysLeft));

	// темп: счета уже оплачены как есть, ежедневное растягиваем на месяц
	const trackedFrom = startMonth === month ? startDay : 1;
	const elapsed = today - trackedFrom + 1;
	const projected =
		elapsed >= 5 && curExpense > 0
			? wholeUah(bills + ((curExpense - bills) / elapsed) * (dim - trackedFrom + 1))
			: null;

	const canSave =
		projected !== null && expectedIncome > 0
			? Math.max(0, floorUah(expectedIncome - Math.max(projected, curExpense) - saved))
			: null;

	const status: Advice['month']['status'] =
		saved >= goal.amount
			? 'done'
			: left === null
				? 'no-income'
				: left < 0
					? 'short'
					: projected !== null && expectedIncome - projected - reserve < 0
						? 'pace'
						: 'ok';

	// ── Итоги прошлых месяцев ───────────────────────────────────────────
	const totalsOf = (m: string): MonthTotals => {
		let inc = 0;
		let exp = 0;
		const cats = new Map<string | null, number>();
		for (const c of cells) {
			if (c.month !== m) continue;
			if (c.type === 'INCOME') inc += c.total;
			else {
				exp += c.total;
				cats.set(c.categoryId, (cats.get(c.categoryId) ?? 0) + c.total);
			}
		}
		return { income: inc, expense: exp, cats, empty: inc === 0 && exp === 0 };
	};

	function reasonsFor(
		t: MonthTotals,
		saved: number,
		target: number,
		base: MonthTotals[]
	): Reason[] {
		// деньги были — просто не отложены
		const unsaved = t.income - t.expense - saved;
		if (t.income > 0 && unsaved >= target - saved) return [{ id: 'not-saved', free: unsaved }];
		if (t.income <= 0) return [{ id: 'no-income' }];

		const out: (Reason & { amount: number })[] = [];
		if (base.length) {
			const usualIncome = average(base.map((b) => b.income));
			const usualExpense = average(base.map((b) => b.expense));
			const notable = (x: number, usual: number) => x >= NOTABLE && x >= usual * NOTABLE_SHARE;
			const down = usualIncome - t.income;
			const up = t.expense - usualExpense;
			if (notable(down, usualIncome))
				out.push({ id: 'income-down', amount: wholeUah(down), usual: wholeUah(usualIncome) });
			if (notable(up, usualExpense)) {
				const ids = new Set([...t.cats.keys(), ...base.flatMap((b) => [...b.cats.keys()])]);
				const top = [...ids]
					.map((id) => ({
						...ref(id),
						delta: wholeUah((t.cats.get(id) ?? 0) - average(base.map((b) => b.cats.get(id) ?? 0)))
					}))
					.filter((g) => g.delta >= GROWTH_MIN)
					.sort((a, b) => b.delta - a.delta)
					.slice(0, 2);
				out.push({ id: 'expense-up', amount: wholeUah(up), usual: wholeUah(usualExpense), top });
			}
			out.sort((a, b) => b.amount - a.amount);
		}
		if (out.length) return out;
		return [
			t.expense > t.income
				? { id: 'deficit', amount: t.expense - t.income }
				: { id: 'expense-high', share: pct(t.expense, t.income) }
		];
	}

	const history: GoalMonth[] = [];
	for (let i = 1; i <= HISTORY_MONTHS; i++) {
		const key = shiftMonth(month, -i);
		if (!startMonth || key < startMonth) break;
		const t = totalsOf(key);
		const monthSaved = savedIn(key);
		if (t.empty && monthSaved === 0) continue;
		const rate = rates.monthEnd[key] ?? rates.current;
		const target = fromUsd(goalUsd, rate);
		const met = monthSaved >= target;

		// с чем сравниваем: до трёх полных месяцев перед этим, где что-то записано
		const base: MonthTotals[] = [];
		for (let j = 1; base.length < LOOKBACK_MONTHS && j <= HISTORY_MONTHS; j++) {
			const prev = shiftMonth(key, -j);
			if (!isFull(prev)) break;
			const pt = totalsOf(prev);
			if (!pt.empty) base.push(pt);
		}

		history.push({
			key,
			partial: !isFull(key),
			income: t.income,
			expense: t.expense,
			saved: monthSaved,
			rate,
			goal: target,
			met,
			reasons: met ? [] : reasonsFor(t, monthSaved, target, base)
		});
	}

	return {
		mode,
		months: fullMonths.length,
		days,
		goal,
		income,
		expense,
		free,
		plan,
		month: {
			key: month,
			day: today,
			days: dim,
			income: curIncome,
			expense: curExpense,
			saved,
			remaining,
			free: curIncome - curExpense - saved,
			expectedIncome,
			left,
			perDay,
			projected,
			canSave,
			status
		},
		history
	};
}

// ── Загрузка ────────────────────────────────────────────────────────────

/** Откуда наставник берёт данные — у бота и CRM это одно хранилище (bot/store.ts). */
export interface AdvisorSource {
	categories(userId: string, withArchived?: boolean): Promise<AdvisorCategory[]>;
	monthCells(userId: string, tz: string, range: { start: Date; end: Date }): Promise<MonthCell[]>;
	/** отложено по месяцам: переводы на счета «Накопления» минус обратно */
	savedByMonth(
		userId: string,
		tz: string,
		range: { start: Date; end: Date }
	): Promise<Map<string, number>>;
	firstTxAt(userId: string): Promise<Date | null>;
	/** курс доллара НБУ */
	usdRates(now: Date): Promise<UsdRates>;
}

/** Диапазон, который нужен наставнику: HISTORY_MONTHS прошлых месяцев и текущий. */
export function advisorRange(now: Date, tz: string): { start: Date; end: Date } {
	const month = monthKeyOf(now, tz);
	return {
		start: monthRange(shiftMonth(month, -HISTORY_MONTHS), tz).start,
		end: monthRange(month, tz).end
	};
}

/** Всё для совета — пятью параллельными запросами. */
export async function loadAdvice(
	source: AdvisorSource,
	user: { id: string; tz: string; goalUsd: number },
	now = new Date()
): Promise<Advice> {
	const range = advisorRange(now, user.tz);
	const [cells, saved, categories, firstTxAt, rates] = await Promise.all([
		source.monthCells(user.id, user.tz, range),
		source.savedByMonth(user.id, user.tz, range),
		source.categories(user.id, true),
		source.firstTxAt(user.id),
		source.usdRates(now)
	]);
	return analyze({
		now,
		tz: user.tz,
		cells,
		saved,
		categories,
		firstTxAt,
		goalUsd: user.goalUsd,
		rates
	});
}
