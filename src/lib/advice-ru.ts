/**
 * Тексты наставника для CRM — по-русски. Бот пишет по-украински
 * (server/bot/advice-text.ts); коды и числа одни — из advisor.ts.
 *
 * Жирное — между **…**: его рисует components/rich-text.svelte (без HTML,
 * названия категорий — ввод пользователя).
 */
import type { Reason } from './advisor.ts';
import { formatMoney } from './money.ts';

const money = (kop: number) => formatMoney(kop);
/** «$100», «$1 250» */
export const usd = (n: number) => `$${Math.max(0, Math.round(n)).toLocaleString('ru-RU')}`;

/** Почему цель месяца не выполнена — одна строка. */
export function reasonRu(r: Reason): string {
	switch (r.id) {
		case 'not-saved':
			return `Деньги были: к концу месяца осталось свободных **${money(r.free)}**, но их не отложили.`;
		case 'no-income':
			return 'Доходов за месяц в записях нет. Если они были — запиши их, и итог пересчитается.';
		case 'income-down':
			return `Доход меньше обычного на **${money(r.amount)}** (обычно ${money(r.usual)}).`;
		case 'expense-up': {
			const top = r.top.map((g) => `«${g.name}» +${money(g.delta)}`).join(', ');
			return `Расходы больше обычного на **${money(r.amount)}** (обычно ${money(r.usual)})${top ? ` — больше всего выросли ${top}` : ''}.`;
		}
		case 'deficit':
			return `Потрачено больше, чем заработано, — на **${money(r.amount)}**.`;
		case 'expense-high':
			return `Расходы забрали **${r.share}%** дохода — откладывать было не из чего.`;
	}
}
