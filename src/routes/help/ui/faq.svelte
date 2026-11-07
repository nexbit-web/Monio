<script lang="ts">
	/** Вопрос, который раскрывается по нажатию, — ответ внутри. */
	import type { Snippet } from 'svelte';

	let { q, children }: { q: string; children: Snippet } = $props();
</script>

<details class="faq">
	<summary>
		<span>{q}</span>
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				d="m6 9 6 6 6-6"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</summary>
	<div class="answer">{@render children()}</div>
</details>

<style>
	.faq {
		border-bottom: 1px solid var(--border);
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 4px;
		font-size: 15px;
		font-weight: 600;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary svg {
		flex-shrink: 0;
		color: var(--muted-foreground);
		transition: transform 0.2s;
	}
	.faq[open] summary svg {
		transform: rotate(180deg);
	}
	summary:hover span {
		color: var(--link);
	}
	.answer {
		padding: 0 4px 16px;
		color: var(--muted-foreground);
		font-size: 14px;
	}
	.answer :global(p) {
		margin: 0 0 6px;
	}
	@media (prefers-reduced-motion: reduce) {
		summary svg {
			transition: none;
		}
	}
</style>
