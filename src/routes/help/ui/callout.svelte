<script lang="ts">
	/** Заметка на полях: совет (tip) или предупреждение (warn). */
	import type { Snippet } from 'svelte';
	import Info from '@lucide/svelte/icons/info';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	let { kind = 'tip', children }: { kind?: 'tip' | 'warn'; children: Snippet } = $props();
</script>

<aside class="callout {kind}">
	<span class="icon" aria-hidden="true">
		{#if kind === 'warn'}<TriangleAlert size={16} />{:else}<Info size={16} />{/if}
	</span>
	<div class="body">{@render children()}</div>
</aside>

<style>
	.callout {
		display: flex;
		gap: 10px;
		margin: 20px 0;
		padding: 12px 14px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--table-head);
		font-size: 14px;
	}
	.icon {
		flex-shrink: 0;
		margin-top: 2px;
		color: var(--link);
	}
	.warn .icon {
		color: var(--signal-yellow);
	}
	.body :global(p) {
		margin: 0;
	}
	.body :global(p + p) {
		margin-top: 6px;
	}
</style>
