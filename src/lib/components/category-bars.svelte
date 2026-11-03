<script lang="ts">
	/**
	 * Рейтинг категорий: одна полоса на категорию, один цвет (величина, а не идентичность).
	 * Если у категории есть лимит — полоса показывает долю лимита, а превышение подписано словами.
	 */
	import { formatMoney, percentChange } from '$lib/money';
	import FinIcon from './fin-icon.svelte';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';

	type Item = {
		id: string | null;
		name: string;
		icon: string | null;
		amount: number;
		prevAmount: number;
		budget: number | null;
	};

	let {
		items,
		total,
		href,
		compare = true,
		emptyText = 'Пока пусто'
	}: {
		items: Item[];
		total: number;
		href: (id: string | null) => string;
		compare?: boolean;
		emptyText?: string;
	} = $props();

	const max = $derived(Math.max(1, ...items.map((i) => i.amount)));
</script>

{#if items.length === 0}
	<p class="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
{:else}
	<ul class="grid gap-1">
		{#each items as item (item.id ?? 'none')}
			{@const share = total ? Math.round((item.amount / total) * 100) : 0}
			{@const change = compare ? percentChange(item.amount, item.prevAmount) : null}
			{@const over = item.budget !== null && item.amount > item.budget}
			{@const fill = item.budget ? Math.min(1, item.amount / item.budget) : item.amount / max}
			<li>
				<a
					href={href(item.id)}
					class="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
				>
					<FinIcon icon={item.icon} size={26} class="row-span-2" />
					<span class="truncate text-sm">{item.name}</span>
					<span class="text-sm font-semibold tabular">{formatMoney(item.amount)}</span>

					<span class="relative h-1.5 overflow-hidden rounded-full bg-muted">
						<span
							class="absolute inset-y-0 left-0 rounded-full {over
								? 'bg-destructive'
								: 'bg-chart-1'}"
							style="width: {Math.max(item.amount ? 2 : 0, fill * 100)}%"
						></span>
					</span>
					<span class="text-right text-[11px] text-muted-foreground tabular">
						{#if item.budget}
							{#if over}
								<span class="inline-flex items-center gap-0.5 text-destructive">
									<CircleAlert class="size-3" /> лимит +{formatMoney(item.amount - item.budget)}
								</span>
							{:else}
								из {formatMoney(item.budget)}
							{/if}
						{:else}
							{share}%
						{/if}
						{#if change !== null && Math.abs(change) >= 1}
							· {change > 0 ? '↑' : '↓'}{Math.abs(Math.round(change))}%
						{/if}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
