<script lang="ts">
	/**
	 * Операции таблицей, как списки в CRM: сетка с линиями по каждой клетке,
	 * шапка на ступень темнее, строки по 36 px. Дни — строками-группами, как
	 * группы статусов в ClickUp: дата, число операций и итог дня справа.
	 */
	import { formatMoney } from '$lib/money';
	import { dayHeading, formatTime } from '$lib/date';
	import { bodyRow, cell, headRow, table } from '$lib/table';
	import { cn } from '$lib/utils';
	import FinIcon from './fin-icon.svelte';
	import TelegramLogo from './telegram-logo.svelte';
	import Monitor from '@lucide/svelte/icons/monitor';

	type Ref = { id: string; name: string; icon: string } | null;
	type Row = {
		id: string;
		type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
		amount: number;
		occurredAt: Date;
		note: string | null;
		source: 'WEB' | 'TELEGRAM';
		category: Ref;
		account: NonNullable<Ref>;
		toAccount: Ref;
	};

	let {
		groups,
		tz,
		onedit
	}: {
		groups: { key: string; items: Row[]; net: number }[];
		tz: string;
		onedit: (row: Row) => void;
	} = $props();

	const columns =
		'grid-cols-[60px_minmax(200px,1.2fr)_minmax(180px,1.5fr)_minmax(150px,0.9fr)_112px_132px]';
	const HEADERS = ['Время', 'Категория', 'Комментарий', 'Счёт', 'Источник'];
</script>

<!-- Таблица прижата к краям панели, как в CRM. -->
<div class="-mr-2 -ml-3 overflow-x-auto">
	<div class="min-w-205 {table}" role="table" aria-label="Операции">
		<div class="{headRow} {columns}" role="row">
			{#each HEADERS as header (header)}
				<div class={cell} role="columnheader">{header}</div>
			{/each}
			<div class="{cell} justify-end" role="columnheader">Сумма</div>
		</div>

		{#each groups as g (g.key)}
			<div
				class="flex h-9 items-center gap-2 border-b border-border px-3 text-[12px]"
				role="row"
				aria-label={dayHeading(g.key, tz)}
			>
				<span
					class="inline-flex h-5.5 items-center rounded-[6px] bg-foreground/6 px-2 font-semibold"
				>
					{dayHeading(g.key, tz)}
				</span>
				<span class="text-muted-foreground tabular-nums">{g.items.length}</span>
				{#if g.net !== 0}
					<span
						class={cn(
							'ml-auto pr-0.5 font-semibold tabular-nums',
							g.net > 0 ? 'text-signal-green' : 'text-muted-foreground'
						)}
					>
						{formatMoney(g.net, { sign: true })}
					</span>
				{/if}
			</div>

			{#each g.items as r (r.id)}
				<button type="button" class="{bodyRow} {columns}" role="row" onclick={() => onedit(r)}>
					<span class="{cell} text-muted-foreground tabular-nums" role="cell">
						{formatTime(r.occurredAt, tz)}
					</span>

					<span class="{cell} gap-2" role="cell">
						<FinIcon icon={r.category?.icon} transfer={r.type === 'TRANSFER'} size={22} />
						{#if r.type === 'TRANSFER'}
							<span class="truncate font-medium">Перевод</span>
						{:else if r.category}
							<span class="truncate font-medium">{r.category.name}</span>
						{:else}
							<span class="truncate text-muted-foreground italic">Без категории</span>
						{/if}
					</span>

					<span class="{cell} text-muted-foreground" role="cell">
						<span class="truncate">{r.note || '—'}</span>
					</span>

					<span class="{cell} gap-1.5" role="cell">
						{#if r.type === 'TRANSFER'}
							<span class="truncate">{r.account?.name ?? '?'} → {r.toAccount?.name ?? '?'}</span>
						{:else}
							<FinIcon icon={r.account?.icon} size={14} tile={false} />
							<span class="truncate">{r.account?.name ?? ''}</span>
						{/if}
					</span>

					<span class="{cell} gap-1.5 text-muted-foreground" role="cell">
						{#if r.source === 'TELEGRAM'}
							<TelegramLogo size={15} /> <span class="text-foreground">Telegram</span>
						{:else}
							<Monitor size={13} class="shrink-0" /> Вручную
						{/if}
					</span>

					<span
						class={cn(
							cell,
							'justify-end font-semibold tabular-nums',
							r.type === 'INCOME' && 'text-signal-green',
							r.type === 'TRANSFER' && 'text-muted-foreground'
						)}
						role="cell"
					>
						{r.type === 'INCOME' ? '+' : r.type === 'EXPENSE' ? '−' : ''}{formatMoney(r.amount)}
					</span>
				</button>
			{/each}
		{/each}
	</div>
</div>
