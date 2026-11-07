<script lang="ts">
	/** Список возможностей в две колонки: контурный значок, заголовок, одна-две фразы. */
	import type { Component } from 'svelte';

	let {
		items
	}: {
		items: {
			icon: Component<{ size?: number; strokeWidth?: number }>;
			title: string;
			text: string;
		}[];
	} = $props();
</script>

<ul class="features">
	{#each items as item (item.title)}
		<li>
			<span class="icon"><item.icon size={18} strokeWidth={1.8} /></span>
			<div>
				<p class="title">{item.title}</p>
				<p class="text">{item.text}</p>
			</div>
		</li>
	{/each}
</ul>

<style>
	.features {
		display: grid;
		gap: 22px 32px;
		margin: 24px 0;
		padding: 0;
		list-style: none;
		max-width: none;
	}
	@media (min-width: 640px) {
		.features {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	li {
		display: flex;
		gap: 14px;
		margin: 0;
	}
	.icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--card);
		color: var(--foreground);
	}
	.title {
		margin: 0;
		font-size: 14.5px;
		font-weight: 600;
	}
	.text {
		margin: 2px 0 0;
		font-size: 13.5px;
		line-height: 1.55;
		color: var(--muted-foreground);
	}
</style>
