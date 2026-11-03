<script lang="ts">
	/** Строка операции в ленте: иконка категории, название и комментарий, сумма справа. */
	import { formatMoney } from '$lib/money';
	import { formatTime } from '$lib/date';
	import { cn } from '$lib/utils';
	import FinIcon from './fin-icon.svelte';
	import TelegramLogo from './telegram-logo.svelte';

	type Ref = { id: string; name: string; icon: string } | null;

	let {
		tx,
		tz,
		showTime = true,
		onclick
	}: {
		tx: {
			type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
			amount: number;
			occurredAt: Date;
			note: string | null;
			source?: 'WEB' | 'TELEGRAM';
			category: Ref;
			account: Ref;
			toAccount: Ref;
		};
		tz: string;
		showTime?: boolean;
		onclick?: () => void;
	} = $props();

	const title = $derived(
		tx.type === 'TRANSFER' ? 'Перевод' : (tx.category?.name ?? 'Без категории')
	);
	const accountLine = $derived(
		tx.type === 'TRANSFER'
			? `${tx.account?.name ?? '?'} → ${tx.toAccount?.name ?? '?'}`
			: (tx.account?.name ?? '')
	);
</script>

<button
	type="button"
	class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
	{onclick}
>
	<FinIcon icon={tx.category?.icon} transfer={tx.type === 'TRANSFER'} size={28} />
	<span class="min-w-0 flex-1">
		<span class="flex items-center gap-1.5">
			<span
				class={cn(
					'truncate text-sm font-medium',
					!tx.category && tx.type !== 'TRANSFER' && 'text-muted-foreground italic'
				)}
			>
				{title}
			</span>
			{#if tx.source === 'TELEGRAM'}
				<span class="shrink-0" title="Записано через Telegram"><TelegramLogo size={13} /></span>
			{/if}
		</span>
		<span class="block truncate text-xs text-muted-foreground">
			{#if tx.note}{tx.note} ·
			{/if}{accountLine}
		</span>
	</span>
	<span class="shrink-0 text-right">
		<span
			class={cn(
				'block text-sm font-semibold tabular',
				tx.type === 'INCOME' && 'text-signal-green',
				tx.type === 'TRANSFER' && 'text-muted-foreground'
			)}
		>
			{tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '−' : ''}{formatMoney(tx.amount)}
		</span>
		{#if showTime}
			<span class="block text-[11px] text-muted-foreground tabular"
				>{formatTime(tx.occurredAt, tz)}</span
			>
		{/if}
	</span>
</button>
