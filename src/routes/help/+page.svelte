<script lang="ts">
	/**
	 * «Как пользоваться» — документация по сайту и боту на русском, украинском
	 * и английском. Язык — в ссылке (?lang=uk), сервер его запоминает. Одна
	 * колонка по центру: шапка, оглавление, разделы. Блоки — в ui/.
	 */
	import { setContext } from 'svelte';
	import Mascot from '$lib/components/mascot.svelte';
	import { HELP_LANG, LANGS, SECTIONS, UI } from './docs';
	import Ru from './ru.svelte';
	import Uk from './uk.svelte';
	import En from './en.svelte';
	import './help.css';

	let { data } = $props();

	setContext(HELP_LANG, () => data.lang);

	const ui = $derived(UI[data.lang]);
	const Content = $derived({ ru: Ru, uk: Uk, en: En }[data.lang]);
</script>

<svelte:head><title>{ui.title} · Monio</title></svelte:head>

<div class="help-doc" lang={data.lang}>
	<header class="hero">
		<p class="eyebrow-line"><Mascot size={26} /> {ui.eyebrow}</p>
		<h1>{ui.title}</h1>
		<p class="lead">{ui.lead}</p>
		<div class="langs" role="group" aria-label={ui.switcher}>
			{#each LANGS as l (l)}
				<a
					href="?lang={l}"
					hreflang={l}
					lang={l}
					data-sveltekit-noscroll
					data-sveltekit-replacestate
					aria-current={l === data.lang ? 'page' : undefined}
				>
					{UI[l].name}
				</a>
			{/each}
		</div>
	</header>

	<nav class="toc" aria-label={ui.jump}>
		<p>{ui.jump}</p>
		<ol>
			{#each SECTIONS as id, i (id)}
				<li>
					<a href="#{id}"><span>{i + 1}</span>{ui.sections[id]}</a>
				</li>
			{/each}
		</ol>
	</nav>

	<article>
		<Content />
	</article>
</div>

<style>
	.help-doc {
		/* всё, что внутри спозиционировано, считается от справки, а не от окна */
		position: relative;
		max-width: 760px;
		margin: 0 auto;
		padding: 12px 0 40px;
	}
	.hero {
		display: grid;
		justify-items: center;
		gap: 12px;
		padding: 28px 0 32px;
		text-align: center;
	}
	.eyebrow-line {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted-foreground);
	}
	h1 {
		margin: 0;
		font-size: clamp(28px, 4vw, 38px);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.15;
	}
	.lead {
		margin: 0;
		max-width: 54ch;
		font-size: 16.5px;
		line-height: 1.6;
		color: var(--muted-foreground);
	}
	.langs {
		display: flex;
		gap: 2px;
		margin-top: 6px;
		padding: 3px;
		border-radius: 9px;
		background: var(--muted);
	}
	.langs a {
		padding: 4px 12px;
		border-radius: 7px;
		font-size: 13px;
		font-weight: 500;
		color: var(--muted-foreground);
	}
	.langs a:hover {
		color: var(--foreground);
	}
	.langs a[aria-current='page'] {
		background: var(--card);
		color: var(--foreground);
		box-shadow:
			0 1px 2px rgba(0, 0, 0, 0.08),
			0 0 0 1px var(--border);
	}
	.toc {
		margin: 0 0 16px;
		padding: 18px 22px;
		border: 1px solid var(--border);
		border-radius: 14px;
	}
	.toc p {
		margin: 0 0 10px;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}
	.toc ol {
		display: grid;
		gap: 4px 28px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	@media (min-width: 600px) {
		.toc ol {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.toc li {
		margin: 0;
	}
	.toc a {
		display: flex;
		gap: 10px;
		padding: 3px 0;
		font-size: 14px;
		color: var(--foreground);
	}
	.toc a:hover {
		color: var(--link);
	}
	.toc span {
		width: 18px;
		flex-shrink: 0;
		text-align: right;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}
</style>
