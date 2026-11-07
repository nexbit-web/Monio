<script lang="ts">
	/** Шаги по порядку — номера в кружках на одной вертикальной линии, как в документации. */
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<ol class="steps">{@render children()}</ol>

<style>
	.steps {
		margin: 24px 0;
		padding: 0;
		list-style: none;
		max-width: none;
		counter-reset: step;
	}
</style>
