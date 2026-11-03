<script lang="ts">
	/**
	 * Свои иконки разделов — только контур, мягкие и округлые: скруглённые углы,
	 * круглые концы линий, одна толщина. Цвет берут от текста (currentColor).
	 */
	import type { NavGlyph } from '$lib/nav';

	let { name, size = 20 }: { name: NavGlyph; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if name === 'overview'}
		<!-- Домик со скруглённой крышей и дверью -->
		<path
			d="M4 10.4a2 2 0 0 1 .7-1.5l6-5.1a2 2 0 0 1 2.6 0l6 5.1a2 2 0 0 1 .7 1.5V18a2.4 2.4 0 0 1-2.4 2.4H6.4A2.4 2.4 0 0 1 4 18Z"
		/>
		<path d="M9.6 20.4v-5a1.6 1.6 0 0 1 1.6-1.6h1.6a1.6 1.6 0 0 1 1.6 1.6v5" />
	{:else if name === 'transactions'}
		<!-- Две встречные стрелки: деньги пришли и ушли -->
		<path d="M4.5 8.5h14.2" />
		<path d="m15 4.8 3.7 3.7-3.7 3.7" />
		<path d="M19.5 15.5H5.3" />
		<path d="m9 11.8-3.7 3.7L9 19.2" />
	{:else if name === 'stats'}
		<!-- Столбики, которые растут -->
		<rect x="4" y="12.6" width="4" height="7.6" rx="1.8" />
		<rect x="10" y="8.2" width="4" height="12" rx="1.8" />
		<rect x="16" y="3.8" width="4" height="16.4" rx="1.8" />
	{:else if name === 'categories'}
		<!-- Четыре плитки -->
		<rect x="3.6" y="3.6" width="7" height="7" rx="2.4" />
		<rect x="13.4" y="3.6" width="7" height="7" rx="2.4" />
		<rect x="3.6" y="13.4" width="7" height="7" rx="2.4" />
		<rect x="13.4" y="13.4" width="7" height="7" rx="3.5" />
	{:else if name === 'accounts'}
		<!-- Кошелёк с застёжкой -->
		<rect x="3.6" y="6" width="16.8" height="13.6" rx="3.2" />
		<path d="m6.6 6 8.6-2.5a1.8 1.8 0 0 1 2.3 1.7V6" />
		<path d="M20.4 10.8h-3.6a2 2 0 0 0 0 4h3.6" />
		<circle cx="16.9" cy="12.8" r="0.9" fill="currentColor" stroke="none" />
	{:else}
		<!-- Шестерня — форма из Lucide «settings» -->
		<path
			d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
		/>
		<circle cx="12" cy="12" r="3" />
	{/if}
</svg>
