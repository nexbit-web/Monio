/**
 * Отчёты наставника: экраны «📈 Тиждень» и «💡 Поради» и рассылка по
 * расписанию — отчёт за неделю в воскресенье вечером и итоги месяца 1-го числа.
 *
 * Расписание (Vercel Cron, /api/cron/reports) вызывает sendDueReports раз в
 * день вечером; что кому пора отправить, решаем здесь по часовому поясу
 * пользователя. Пропущенный запуск догоняем на следующий день, повторный —
 * не шлёт отчёт второй раз (claimReport).
 */
import type { Api } from 'grammy';
import type { InlineKeyboardMarkup } from 'grammy/types';
import { loadAdvice, type Advice } from '../../advisor.ts';
import {
	addDaysToKey,
	daysInMonth,
	monthKeyOf,
	monthRange,
	shiftMonth,
	zonedParts
} from '../../date.ts';
import { summarizeWeek, weekKeyOf, weekWindow } from '../../week.ts';
import { adviceText, monthAdviceBlock, monthReportTitle, weekText } from './advice-text.ts';
import { monthName, weekShort } from './dates.ts';
import { monthText } from './render.ts';
import type { BotStore, Recipient } from './store.ts';
import { btn, inline } from './ui.ts';

export type ReportUser = { id: string; tz: string; goalUsd: number; weeklyReport: boolean };

export type View = { text: string; markup: InlineKeyboardMarkup };

export const T_REPORTS = {
	advice: '💡 Поради',
	week: '📈 Тиждень',
	month: '📅 Місяць',
	weeklyOff: '🔕 Не надсилати щонеділі',
	weeklyOn: '🔔 Надсилати щонеділі',
	nowOff: 'Більше не надсилатиму звіт щонеділі',
	nowOn: 'Щонеділі ввечері надішлю звіт за тиждень'
} as const;

// ── Экраны ──────────────────────────────────────────────────────────────

/**
 * Отчёт за неделю key. Для текущей недели (и в рассылке) — с целью месяца:
 * сколько отложено и сколько можно тратить; прошлые недели — только цифры недели.
 */
export async function weekView(
	store: BotStore,
	user: ReportUser,
	key: string,
	now = new Date(),
	withAdvice = key === weekKeyOf(now, user.tz)
): Promise<View> {
	const [txs, first, advice] = await Promise.all([
		store.between(user.id, weekWindow(key, user.tz)),
		store.firstTxAt(user.id),
		withAdvice ? loadAdvice(store, user, now) : null
	]);
	const summary = summarizeWeek(txs, key, user.tz, now, first);
	const current = weekKeyOf(now, user.tz);
	const prev = addDaysToKey(key, -7);
	const next = addDaysToKey(key, 7);
	return {
		text: weekText(summary, advice),
		markup: inline([
			[
				btn(`‹ ${weekShort(prev)}`, `w:${prev}`),
				...(key < current ? [btn(`${weekShort(next)} ›`, `w:${next}`)] : [])
			],
			[
				btn(T_REPORTS.advice, 'adv'),
				user.weeklyReport
					? btn(T_REPORTS.weeklyOff, `wr:0:${key}`)
					: btn(T_REPORTS.weeklyOn, `wr:1:${key}`)
			]
		])
	};
}

export async function adviceView(
	store: BotStore,
	user: ReportUser,
	now = new Date()
): Promise<View> {
	const advice = await loadAdvice(store, user, now);
	const month = monthKeyOf(now, user.tz);
	return {
		text: adviceText(advice),
		markup: inline([
			[btn(T_REPORTS.week, `w:${weekKeyOf(now, user.tz)}`), btn(T_REPORTS.month, `m:${month}`)]
		])
	};
}

/** Данные для итогов месяца — те же, что у кнопки «📅 Місяць». */
export async function loadMonth(
	store: BotStore,
	userId: string,
	tz: string,
	key: string,
	now = new Date()
) {
	const currentKey = monthKeyOf(now, tz);
	const current = key === currentKey;
	const start = monthRange(key, tz).start;
	const range = current ? { start, end: now } : monthRange(key, tz);

	const prevFull = monthRange(shiftMonth(key, -1), tz);
	// для текущего месяца — «тот же период» прошлого: столько же времени от начала
	const prevRange = current
		? {
				start: prevFull.start,
				end: new Date(
					Math.min(
						prevFull.start.getTime() + (now.getTime() - start.getTime()),
						prevFull.end.getTime()
					)
				)
			}
		: prevFull;

	const [totals, prev, byCategory, categories] = await Promise.all([
		store.totals(userId, range),
		store.totals(userId, prevRange),
		store.spentByCategory(userId, range),
		store.categories(userId, true)
	]);
	return {
		key,
		current,
		day: current ? zonedParts(now, tz).day : daysInMonth(key),
		totals,
		prevExpense: prev.expense,
		byCategory,
		categories
	};
}

// ── Рассылка по расписанию ──────────────────────────────────────────────

/**
 * Какую неделю пора прислать: в воскресенье с полудня — текущую, в понедельник —
 * прошлую (если воскресный запуск пропал). В остальные дни — ничего.
 */
export function dueWeek(now: Date, tz: string): string | null {
	const { weekday, hour } = zonedParts(now, tz);
	if (weekday === 0 && hour >= 12) return weekKeyOf(now, tz);
	if (weekday === 1) return addDaysToKey(weekKeyOf(now, tz), -7);
	return null;
}

/** Итоги прошлого месяца — 1-го числа, а если запуск пропал, то 2-го. */
export function dueMonth(now: Date, tz: string): string | null {
	const { day } = zonedParts(now, tz);
	return day <= 2 ? shiftMonth(monthKeyOf(now, tz), -1) : null;
}

export type ReportRun = { weekly: number; monthly: number; skipped: number; failed: number };

/** Отправить одно сообщение всем Telegram пользователя; true — дошло хоть до одного. */
async function deliver(api: Api, r: Recipient, view: View): Promise<boolean> {
	const results = await Promise.allSettled(
		r.telegramIds.map((id) =>
			api.sendMessage(Number(id), view.text, { parse_mode: 'HTML', reply_markup: view.markup })
		)
	);
	for (const res of results)
		if (res.status === 'rejected') console.error('[reports] не доставлено:', res.reason);
	return results.some((res) => res.status === 'fulfilled');
}

/**
 * Забронировать отчёт, собрать и отправить. Не собрался или не дошёл —
 * бронь снимаем: следующий запуск попробует ещё раз.
 */
async function sendOnce(
	store: BotStore,
	api: Api,
	r: Recipient,
	kind: 'weekly' | 'monthly',
	key: string,
	build: () => Promise<View | null>
): Promise<'sent' | 'skipped' | 'failed'> {
	const prev = kind === 'weekly' ? r.lastWeeklyReport : r.lastMonthlyReport;
	if (prev !== null && prev >= key) return 'skipped';
	if (!(await store.claimReport(r.userId, kind, key))) return 'skipped';
	try {
		const view = await build();
		if (!view) return 'skipped';
		return (await deliver(api, r, view)) ? 'sent' : await release();
	} catch (err) {
		console.error(`[reports] ${kind} ${key} для ${r.userId}:`, err);
		return release();
	}

	async function release(): Promise<'failed'> {
		await store.releaseReport(r.userId, kind, key, prev).catch(() => {});
		return 'failed';
	}
}

export async function sendDueReports(
	store: BotStore,
	api: Api,
	now = new Date()
): Promise<ReportRun> {
	const run: ReportRun = { weekly: 0, monthly: 0, skipped: 0, failed: 0 };
	const count = (kind: 'weekly' | 'monthly', result: 'sent' | 'skipped' | 'failed') => {
		if (result === 'sent') run[kind]++;
		else run[result]++;
	};

	for (const r of await store.reportRecipients()) {
		const user: ReportUser = {
			id: r.userId,
			tz: r.tz,
			goalUsd: r.goalUsd,
			weeklyReport: r.weeklyReport
		};

		const week = r.weeklyReport ? dueWeek(now, r.tz) : null;
		if (week)
			count(
				'weekly',
				await sendOnce(store, api, r, 'weekly', week, async () => {
					// человек давно ничего не записывает — не надоедаем пустыми отчётами
					const recent = await store.between(r.userId, {
						start: new Date(now.getTime() - 28 * 86_400_000),
						end: now
					});
					if (recent.length === 0) return null;
					return weekView(store, user, week, now, true);
				})
			);

		const month = r.monthlyReport ? dueMonth(now, r.tz) : null;
		if (month)
			count(
				'monthly',
				await sendOnce(store, api, r, 'monthly', month, async () => {
					const data = await loadMonth(store, r.userId, r.tz, month, now);
					if (!data.totals.income && !data.totals.expense) return null;
					const advice: Advice = await loadAdvice(store, user, now);
					const body = monthText(data).replace(/^📅 <b>.*?<\/b>\n/, '');
					return {
						text: `${monthReportTitle(month)}\n${body}\n${monthAdviceBlock(month, advice)}`,
						markup: inline([
							[btn(T_REPORTS.advice, 'adv'), btn(`📅 ${monthName(month)}`, `m:${month}`)]
						])
					};
				})
			);
	}
	return run;
}
