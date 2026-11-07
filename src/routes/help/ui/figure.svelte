<script lang="ts">
	/** Иллюстрация в документации: спокойная серая подложка и подпись под ней. */
	import type { Snippet } from 'svelte';

	let { caption, children }: { caption?: string; children: Snippet } = $props();
</script>

<figure class="figure">
	<div class="stage">{@render children()}</div>
	{#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
	.figure {
		margin: 24px 0;
	}
	.stage {
		display: grid;
		place-items: center;
		padding: 32px 20px;
		border: 1px solid var(--border);
		border-radius: 14px;
		background: var(--table-head);
	}
	figcaption {
		margin-top: 10px;
		text-align: center;
		font-size: 13px;
		color: var(--muted-foreground);
	}
	@media (max-width: 520px) {
		.stage {
			padding: 18px 10px;
		}
	}
</style>
