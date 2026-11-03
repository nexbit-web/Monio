<script lang="ts">
	/**
	 * Переключатель разделов страницы в двух видах из CRM:
	 * `pills` — пилюли с числом (фильтры над списком), выбранная — в цвет темы;
	 * `segmented` — сегменты на серой дорожке, выбранный — белая плитка (периоды).
	 */
	import { pill, pillActive } from '$lib/table';

	type Tab = {
		href: string;
		label: string;
		/** число или короткая сумма рядом с названием */
		hint?: string;
		active: boolean;
	};

	let { tabs, variant = 'pills' }: { tabs: Tab[]; variant?: 'pills' | 'segmented' } = $props();
</script>

{#if variant === 'segmented'}
	<div class="flex h-7 rounded-[8px] bg-foreground/6 p-0.5" role="group" aria-label="Период">
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				data-sveltekit-noscroll
				aria-current={tab.active ? 'page' : undefined}
				class="flex items-center rounded-[6px] px-2.5 text-[12px] font-medium whitespace-nowrap transition-colors {tab.active
					? 'bg-card text-foreground shadow-sm ring-1 ring-border'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{tab.label}
			</a>
		{/each}
	</div>
{:else}
	<nav class="contents" aria-label="Разделы">
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				data-sveltekit-noscroll
				aria-current={tab.active ? 'page' : undefined}
				class={tab.active ? pillActive : pill}
			>
				{tab.label}
				{#if tab.hint}<span class="whitespace-nowrap tabular-nums opacity-60">{tab.hint}</span>{/if}
			</a>
		{/each}
	</nav>
{/if}
