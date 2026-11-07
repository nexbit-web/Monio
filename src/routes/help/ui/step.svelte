<script lang="ts">
	/** Один шаг: номер по порядку (считает CSS), заголовок и пояснение. */
	import type { Snippet } from 'svelte';

	let { title, children }: { title: string; children?: Snippet } = $props();
</script>

<li class="step">
	<p class="title">{title}</p>
	{#if children}<div class="body">{@render children()}</div>{/if}
</li>

<style>
	.step {
		position: relative;
		margin: 0;
		padding: 0 0 26px 44px;
		counter-increment: step;
	}
	.step::before {
		content: counter(step);
		position: absolute;
		left: 0;
		top: -2px;
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border: 1px solid var(--border);
		border-radius: 50%;
		background: var(--card);
		font-size: 13px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	/* линия к следующему шагу */
	.step:not(:last-child)::after {
		content: '';
		position: absolute;
		left: 14px;
		top: 30px;
		bottom: 2px;
		width: 1px;
		background: var(--border);
	}
	.step:last-child {
		padding-bottom: 0;
	}
	.title {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
		line-height: 1.5;
	}
	.body {
		margin-top: 4px;
		font-size: 14px;
		color: var(--muted-foreground);
	}
	.body :global(p) {
		margin: 4px 0 0;
	}
	.body :global(p:first-child) {
		margin-top: 0;
	}
</style>
