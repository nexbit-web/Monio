<script lang="ts">
	/** Листалка месяцев — серая дорожка 28 px, как сегментированный переключатель в CRM. */
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { monthTitle, shiftMonth } from '$lib/date';

	let {
		month,
		current,
		href
	}: {
		month: string;
		/** текущий месяц — дальше листать незачем */
		current: string;
		href: (month: string) => string;
	} = $props();

	const next = $derived(shiftMonth(month, 1));
	const arrow =
		'grid size-6 place-items-center rounded-[6px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground hover:shadow-sm';
</script>

<div class="inline-flex h-7 items-center rounded-[8px] bg-foreground/6 p-0.5">
	<a
		href={href(shiftMonth(month, -1))}
		class={arrow}
		aria-label="Предыдущий месяц"
		data-sveltekit-noscroll
	>
		<ChevronLeft size={15} />
	</a>
	<span class="min-w-28 px-1.5 text-center text-[12px] font-semibold tabular-nums">
		{monthTitle(month)}
	</span>
	{#if next <= current}
		<a href={href(next)} class={arrow} aria-label="Следующий месяц" data-sveltekit-noscroll>
			<ChevronRight size={15} />
		</a>
	{:else}
		<span class="grid size-6 place-items-center text-muted-foreground/30" aria-hidden="true">
			<ChevronRight size={15} />
		</span>
	{/if}
</div>
