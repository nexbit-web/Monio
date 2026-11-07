<script lang="ts">
	/** Раздел справки: заголовок из docs.ts, вступление одной фразой, дальше — содержимое. */
	import type { Snippet } from 'svelte';
	import { UI, type Lang, type SectionId } from './docs';

	let {
		lang,
		id,
		lead,
		children
	}: { lang: Lang; id: SectionId; lead?: string; children: Snippet } = $props();
</script>

<section {id}>
	<h2><a href="#{id}">{UI[lang].sections[id]}</a></h2>
	{#if lead}<p class="lead">{lead}</p>{/if}
	{@render children()}
</section>

<style>
	section {
		padding-block: 48px;
		border-top: 1px solid var(--border);
		scroll-margin-top: 16px;
	}
	section:first-child {
		border-top: 0;
		padding-top: 32px;
	}
	h2 {
		margin: 0;
		font-size: 24px;
		font-weight: 650;
		letter-spacing: -0.02em;
		line-height: 1.25;
	}
	h2 a {
		color: inherit;
	}
	h2 a:hover::after {
		content: ' #';
		color: var(--muted-foreground);
		font-weight: 400;
	}
	.lead {
		margin: 8px 0 0;
		font-size: 15.5px;
		line-height: 1.6;
		color: var(--muted-foreground);
	}
</style>
