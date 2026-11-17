/**
 * Тексты наставника в боте — по-украински: «🐷 Відкласти», «💡 Поради», отчёт
 * за неделю (по кнопке и в воскресенье сам) и итог месяца 1-го числа.
 * Цель одна — откладывать $100 в месяц; считается только то, что человек
 * отложил сам («нз 1000»). Чистые функции: выводы наставника (advisor.ts,
 * week.ts) на входе — HTML для Telegram на выходе.
 */
import {
	fromUsd,
	toUsd,
	toUsdUp,
	type Advice,
	type CategoryRef,
	type GoalMonth,
	type Reason
} from '../../advisor.ts';
import { formatMoney } from '../../money.ts';
import type { WeekSummary } from '../../week.ts';
import { iconEmoji } from '../../icon-keys.ts';
import { monthGen, monthName, weekLabel, weekdayName, weekdayShort } from './dates.ts';
import { clip, esc } from './render.ts';

const money = (kop: number) => formatMoney(kop);
const signedMoney = (kop: number) => formatMoney(kop, { sign: true });
/** «$100», «$1 250» */
const usd = (n: number) => `$${Math.max(0, Math.round(n)).toLocaleString('uk-UA')}`;
const named = (c: CategoryRef) => `${iconEmoji(c.icon)} ${esc(c.name)}`;
/** «нз 3639» — гривны целиком, вверх, чтобы точно хватило до цели */
const nz = (kop: number) => `<code>нз ${Math.ceil(kop / 100)}</code>`;

// ── Отложено ────────────────────────────────────────────────────────────

/** «🎯 Листопад: відкладено $20 з $100 — ще 3 639 ₴». */
export function goalProgressText(
	key: string,
	saved: number,
	goalUsd: number,
	rate: number
): string {
	const goal = fromUsd(goalUsd, rate);
	const name = monthName(key);
	if (saved >= goal)
		return `✅ ${name}: відкладено ${usd(toUsd(saved, rate))} — ціль ${usd(goalUsd)} виконано!`;
	return `🎯 ${name}: відкладено <b>${usd(toUsd(saved, rate))} з ${usd(goalUsd)}</b> — ще ${money(goal - Math.max(0, saved))}`;
}

/** Экран «🐷 Відкласти». rest — сколько осталось до цели (для кнопки). */
export function saveScreenText(p: {
	key: string;
	saved: number;
	goalUsd: number;
	rate: number;
	from: string | null;
	to: string | null;
}): { text: string; rest: number; button: string } {
	const goal = fromUsd(p.goalUsd, p.rate);
	const rest = Math.max(0, goal - p.saved);
	const route =
		p.from && p.to
			? ` — перекажу з «${esc(p.from)}» на «${esc(p.to)}»`
			: p.from
				? ` — перекажу з «${esc(p.from)}» на новий рахунок «Накопления»`
				: '';
	const text = [
		'🐷 <b>Відкласти</b>',
		goalProgressText(p.key, p.saved, p.goalUsd, p.rate),
		'',
		`Надішли суму${route}:`,
		`<code>нз 1000</code> або <code>відклав 1000</code>`,
		'До цілі рахується лише те, що відкладаєш сам.'
	].join('\n');
	return { text, rest, button: `🐷 Відкласти ${money(rest)} — до ${usd(p.goalUsd)}` };
}

// ── Причины ─────────────────────────────────────────────────────────────

/** Почему цель месяца не выполнена — без точки в конце. */
export function reasonText(r: Reason): string {
	switch (r.id) {
		case 'not-saved':
			return `гроші були — наприкінці місяця лишилося вільних <b>${money(r.free)}</b>, але їх не відкладено`;
		case 'no-income':
			return 'доходів за місяць у записах немає — якщо вони були, запиши їх';
		case 'income-down':
			return `дохід менший, ніж зазвичай, на <b>${money(r.amount)}</b> (зазвичай ${money(r.usual)})`;
		case 'expense-up': {
			const top = r.top.map((g) => `${named(g)} +${money(g.delta)}`).join(', ');
			return `витрати більші, ніж зазвичай, на <b>${money(r.amount)}</b> (зазвичай ${money(r.usual)})${top ? ` — найбільше зросли ${top}` : ''}`;
		}
		case 'deficit':
			return `витрачено більше, ніж зароблено, — на <b>${money(r.amount)}</b>`;
		case 'expense-high':
			return `витрати забрали <b>${r.share}%</b> доходу — відкладати не було з чого`;
	}
}

// ── Блоки ───────────────────────────────────────────────────────────────

/** «🎯 Ціль — $100 на місяць: 4 539 ₴ за курсом НБУ 45,39 ₴». */
function goalLine(a: Advice): string {
	const g = a.goal;
	const rate = g.rate.toLocaleString('uk-UA', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	return `🎯 Ціль — <b>${usd(g.usd)} на місяць</b>: ${money(g.amount)} за курсом НБУ ${rate} ₴${g.rateDate ? '' : ' (приблизно — НБУ зараз недоступний)'}`;
}

/** Как идёт этот месяц: отложено, сколько ещё можно тратить. */
function monthStatus(a: Advice): string[] {
	const m = a.month;
	const g = a.goal;
	const goal = usd(g.usd);
	const lines = [
		`📅 <b>${monthName(m.key)}</b>: зароблено ${money(m.income)}, витрачено ${money(m.expense)}`,
		goalProgressText(m.key, m.saved, g.usd, g.rate)
	];
	switch (m.status) {
		case 'done':
			break;
		case 'ok':
			lines.push(
				`Щоб відкласти решту, до кінця місяця можна витратити ще ${money(m.left!)} — ≈ <b>${money(m.perDay!)} на день</b>.`
			);
			if (m.free >= m.remaining)
				lines.push(`💡 Вільні гроші вже є — відклади зараз: ${nz(m.remaining)}`);
			break;
		case 'pace': {
			const end = m.canSave ?? 0;
			lines.push(
				`⚠️ Витрачаєш швидше, ніж треба: за такого темпу ${end > 0 ? `наприкінці місяця вільних буде ≈ ${money(end)} — до ${goal} не вистачить` : 'наприкінці місяця нічого не залишиться'}. Тримайся в межах <b>${money(m.perDay!)} на день</b>.`
			);
			if (m.free >= m.remaining) lines.push(`💡 Поки гроші є — відклади зараз: ${nz(m.remaining)}`);
			break;
		}
		case 'short':
			lines.push(
				`❌ Щоб відкласти ще ${money(m.remaining)}, бракує <b>${money(-m.left!)}</b> — потрібен ще дохід або менше витрат.`
			);
			if (m.canSave)
				lines.push(
					`💡 За нинішнього темпу реально відкласти ≈ <b>${money(m.canSave)}</b> (${usd(toUsd(m.canSave, g.rate))}) — краще їх, ніж нічого.`
				);
			break;
		case 'no-income':
			lines.push(
				'Доходів цього місяця ще немає — запиши їх, і я порахую, скільки можна витрачати.'
			);
			break;
	}
	return lines;
}

/** Хватает ли доходов на цель в средний месяц и сколько тогда можно тратить. */
function planLines(a: Advice): string[] {
	const g = a.goal;
	const p = a.plan;
	const goal = usd(g.usd);
	if (a.mode === 'none')
		return [
			a.days
				? `Обліку поки ${a.days} дн. Записуй усе ще тиждень — і я скажу, чи вистачає доходів на ${goal} на місяць.`
				: `Записуй доходи й витрати — за тиждень скажу, чи вистачає на ${goal} на місяць.`
		];

	const lines = [
		`📊 У середньому за місяць${a.mode === 'estimate' ? ` (оцінка за ${a.days} дн.)` : ''}: дохід <b>${money(a.income)}</b>, витрати <b>${money(a.expense)}</b>` +
			(a.free >= 0
				? ` — залишається <b>${money(a.free)}</b>.`
				: ` — на ${money(-a.free)} більше, ніж приходить.`)
	];
	const limit =
		p.maxSpend > 0
			? `Щоб відкладати ${goal}, витрачай не більше <b>${money(p.maxSpend)}</b> на місяць.`
			: `Дохід поки менший за саму ціль — потрібен більший дохід.`;
	switch (p.kind) {
		case 'enough':
			lines.push(
				`✅ На ціль вистачає. Відкладай одразу в день зарплати — ${nz(g.amount)} — а живи на решту.`
			);
			break;
		case 'gap':
			lines.push(`До ${goal} бракує <b>${money(p.gap)}</b> на місяць. ${limit}`);
			break;
		case 'deficit':
			lines.push(`Спершу треба вийти в нуль, потім — відкладати. ${limit}`);
			break;
		case 'no-income':
			lines.push(
				'Доходів у записах немає — запиши їх (<code>+30000 зарплата</code>), і я порахую, чи вистачає на ціль.'
			);
			break;
	}
	return lines;
}

/** Итог прошлого месяца: выполнена ли цель, на сколько, а если нет — почему. */
export function verdictLines(h: GoalMonth, goalUsd: number): string[] {
	const saved = toUsd(h.saved, h.rate);
	const name = monthName(h.key);
	const partial = h.partial ? ' <i>(облік був не весь місяць)</i>' : '';
	if (h.met)
		return [
			`✅ <b>${name}: ціль виконано</b> — відкладено ${usd(saved)} (${money(h.saved)})${saved > goalUsd ? `, на ${usd(saved - goalUsd)} більше` : ''}.${partial}`
		];
	const lines = [
		h.saved > 0
			? `❌ <b>${name}: ціль не виконано</b> — відкладено ${usd(saved)} (${money(h.saved)}), до ${usd(goalUsd)} забракло ${usd(toUsdUp(h.goal - h.saved, h.rate))}.${partial}`
			: `❌ <b>${name}: нічого не відкладено.</b>${partial}`
	];
	if (h.reasons.length === 1) lines.push(`Причина: ${reasonText(h.reasons[0])}.`);
	else if (h.reasons.length) lines.push('Чому:', ...h.reasons.map((r) => `• ${reasonText(r)}`));
	return lines;
}

// ── «💡 Поради» ─────────────────────────────────────────────────────────

export function adviceText(a: Advice): string {
	const lines = [
		'💡 <b>Фінансовий наставник</b>',
		'',
		goalLine(a),
		'',
		...monthStatus(a),
		'',
		...planLines(a)
	];
	const last = a.history[0];
	if (last) lines.push('', ...verdictLines(last, a.goal.usd));
	return clip(lines.join('\n'));
}

// ── Отчёт за неделю ─────────────────────────────────────────────────────

const change = (pct: number | null) =>
	pct === null || Math.abs(pct) < 15
		? ''
		: ` · ${pct > 0 ? '↑' : '↓'}${Math.abs(Math.round(pct))}%`;

export function weekText(s: WeekSummary, a: Advice | null): string {
	const full = s.elapsed === 7;
	const lines = [
		`📈 <b>Тиждень ${weekLabel(s.key)}</b>${full ? '' : ` · поки ${s.elapsed} ${s.elapsed === 1 ? 'день' : s.elapsed < 5 ? 'дні' : 'днів'}`}`,
		''
	];

	if (s.count === 0) {
		lines.push(
			'Записів за цей тиждень немає.',
			'Записуй навіть дрібні витрати — так видно, куди насправді йдуть гроші.'
		);
	} else {
		lines.push(`🟢 Доходи: <b>${money(s.income)}</b>`);
		let spent = `🔴 Витрати: <b>${money(s.expense)}</b>`;
		// сравниваем, только когда неделя прошла целиком — иначе любая неделя «дешевле»
		if (full && s.usual && s.usual.expense > 0) {
			const diff = Math.round(((s.expense - s.usual.expense) / s.usual.expense) * 100);
			spent +=
				Math.abs(diff) < 5
					? ` · як зазвичай`
					: ` · на ${Math.abs(diff)}% ${diff > 0 ? 'більше' : 'менше'}, ніж зазвичай (${money(s.usual.expense)})`;
		}
		lines.push(spent);
		// без доходов «залишок −342 ₴» только пугает — это просто расходы
		if (s.income > 0)
			lines.push(
				`💰 Залишок: <b>${signedMoney(s.net)}</b>${s.rate !== null && s.rate > 0 ? ` · ${s.rate}% доходу` : ''}`
			);
		if (s.toSavings) lines.push(`🐷 Відкладено: <b>${money(s.toSavings)}</b>`);

		if (s.categories.length) {
			lines.push('', '<b>Куди пішли гроші</b>');
			for (const c of s.categories.slice(0, 8))
				lines.push(`${named(c)} — ${money(c.amount)} · ${c.share}%${full ? change(c.change) : ''}`);
			if (s.categories.length > 8) lines.push(`…і ще ${s.categories.length - 8}`);
		}

		if (s.food.total)
			lines.push(
				'',
				`🥗 На їжу: ${money(s.food.total)}${s.food.groceries && s.food.eatingOut ? ` — продукти ${money(s.food.groceries)}, кафе ${money(s.food.eatingOut)}` : ''}`
			);

		if (s.biggest.length) {
			lines.push('', '🧾 <b>Найбільші витрати</b>');
			for (const b of s.biggest)
				lines.push(
					`${money(b.amount)} · ${named(b)}${b.note ? ` · ${esc(b.note)}` : ''} · ${weekdayShort(b.day)}`
				);
		}
		if (s.topDay)
			lines.push(`📆 Найдорожчий день — ${weekdayName(s.topDay.day)}, ${money(s.topDay.amount)}`);
		if (s.uncategorized)
			lines.push(
				`❓ Без категорії ${money(s.uncategorized)} — розклади, щоб звіти були точнішими.`
			);
	}

	if (a) lines.push('', goalLine(a), ...monthStatus(a));
	return clip(lines.join('\n'));
}

// ── Итог месяца (1-го числа) ────────────────────────────────────────────

/** Хвост к итогам месяца key: выполнена ли цель и что делать в новом месяце. */
export function monthAdviceBlock(key: string, a: Advice): string {
	const lines = [''];
	const h = a.history.find((x) => x.key === key);
	if (h) lines.push(...verdictLines(h, a.goal.usd));
	lines.push(
		'',
		`💡 <b>На новий місяць</b> — ціль ${usd(a.goal.usd)} (${money(a.goal.amount)}). Відклади одразу, щойно прийде дохід: ${nz(a.goal.amount)}`
	);
	return lines.join('\n');
}

export const monthReportTitle = (key: string) => `🗓 <b>Підсумки ${monthGen(key)}</b>`;
