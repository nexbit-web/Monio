import { getContext, setContext } from 'svelte';
import { toLocalInput } from './date';
import { toInputAmount } from './money';

export type TxType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

/** Что подставить в форму: пусто — новая операция, с id — редактирование. */
export type TxDraft = {
	id?: string;
	type?: TxType;
	amount?: number;
	categoryId?: string | null;
	accountId?: string;
	toAccountId?: string | null;
	occurredAt?: Date;
	note?: string | null;
};

type Env = () => { tz: string; defaultAccountId: string | undefined };

/**
 * Состояние единого диалога «операция» — открыть его можно с любой страницы.
 * Живёт в контексте лейаута, а не в модуле: на сервере модуль общий для всех запросов.
 */
export class TxDialog {
	open = $state(false);
	id = $state<string | undefined>(undefined);
	type = $state<TxType>('EXPENSE');
	amount = $state('');
	categoryId = $state('');
	accountId = $state('');
	toAccountId = $state('');
	occurredAt = $state('');
	note = $state('');

	#env: Env;

	constructor(env: Env) {
		this.#env = env;
	}

	show(d: TxDraft = {}) {
		const { tz, defaultAccountId } = this.#env();
		this.id = d.id;
		this.type = d.type ?? 'EXPENSE';
		this.amount = d.amount ? toInputAmount(d.amount) : '';
		this.categoryId = d.categoryId ?? '';
		this.accountId = d.accountId ?? defaultAccountId ?? '';
		this.toAccountId = d.toAccountId ?? '';
		this.occurredAt = toLocalInput(d.occurredAt ?? new Date(), tz);
		this.note = d.note ?? '';
		this.open = true;
	}

	/** После «Сохранить и ещё»: оставляем тип, счёт и дату, чистим сумму и комментарий. */
	resetForNext() {
		this.id = undefined;
		this.amount = '';
		this.note = '';
	}
}

const KEY = Symbol('tx-dialog');

export const provideTxDialog = (env: Env) => setContext(KEY, new TxDialog(env));
export const useTxDialog = () => getContext<TxDialog>(KEY);
