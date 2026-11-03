<script lang="ts">
	/**
	 * Заголовок страницы как в CRM: строка 32 px — название, рядом счётчик или
	 * короткая подпись, справа действия.
	 */
	import type { Snippet } from 'svelte';

	let {
		title,
		count,
		subtitle,
		actions
	}: {
		title: string;
		/** число рядом с названием, приглушённое */
		count?: number | string;
		subtitle?: string;
		/** кнопки справа */
		actions?: Snippet;
	} = $props();
</script>

<div class="mb-2 flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1.5">
	<h1 class="text-[17px] font-semibold tracking-tight">{title}</h1>
	{#if count !== undefined}
		<span class="text-[17px] font-semibold tracking-tight text-muted-foreground/50 tabular-nums">
			{count}
		</span>
	{/if}
	{#if subtitle}<span class="hidden text-[13px] text-muted-foreground sm:inline">{subtitle}</span
		>{/if}
	{#if actions}<div class="ml-auto flex flex-wrap items-center gap-1.5">
			{@render actions()}
		</div>{/if}
</div>
