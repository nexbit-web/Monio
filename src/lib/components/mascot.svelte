<script lang="ts">
	/**
	 * Мони — финансовый помощник Monio. Цельная фигура без деталей: голова-
	 * «сквиркл» с антенной и два глаза-капсулы, одним цветом — цветом темы
	 * (чёрный, фиолетовый…). В тёмной теме — светлый с тёмными глазами.
	 *
	 * mood: happy — обычный, wink — «готово», wow — удивление для пустых экранов.
	 * tone: light — белый, для тёмного фона (сайдбар, тёмная карточка).
	 */
	let {
		size = 40,
		mood = 'happy',
		tone = 'theme',
		blink = true,
		class: className = ''
	}: {
		size?: number;
		mood?: 'happy' | 'wink' | 'wow';
		tone?: 'theme' | 'light';
		blink?: boolean;
		class?: string;
	} = $props();

	const body = $derived(tone === 'light' ? '#ffffff' : 'var(--primary)');
	const face = $derived(tone === 'light' ? 'var(--rail)' : 'var(--primary-foreground)');
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 64 64"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class="mascot {className}"
	class:blink
	role="img"
	aria-label="Мони — помощник Monio"
>
	<!-- антенна -->
	<path d="M32 16V9" stroke={body} stroke-width="3.2" stroke-linecap="round" />
	<circle cx="32" cy="6.5" r="3.6" fill={body} />
	<!-- голова -->
	<rect x="7" y="15" width="50" height="42" rx="17" fill={body} />

	<g class="eyes">
		{#if mood === 'wow'}
			<circle cx="23.5" cy="34.5" r="5" fill={face} />
			<circle cx="40.5" cy="34.5" r="5" fill={face} />
		{:else}
			<rect x="20" y="28" width="7" height="13" rx="3.5" fill={face} />
			{#if mood === 'wink'}
				<path
					d="M36.5 36.5c2.2-3.2 5.8-3.2 8 0"
					stroke={face}
					stroke-width="3.2"
					stroke-linecap="round"
				/>
			{:else}
				<rect x="37" y="28" width="7" height="13" rx="3.5" fill={face} />
			{/if}
		{/if}
	</g>

	<!-- рот: улыбка или удивлённое «о» -->
	{#if mood === 'wow'}
		<circle cx="32" cy="47" r="2.4" fill={face} />
	{:else}
		<path
			d="M28 46.5c2.4 2.2 5.6 2.2 8 0"
			stroke={face}
			stroke-width="2.6"
			stroke-linecap="round"
		/>
	{/if}
</svg>

<style>
	.mascot {
		flex-shrink: 0;
	}
	.blink .eyes {
		transform-box: fill-box;
		transform-origin: center;
		animation: monio-blink 5s infinite;
	}
	@keyframes monio-blink {
		0%,
		92%,
		100% {
			transform: scaleY(1);
		}
		95% {
			transform: scaleY(0.1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.blink .eyes {
			animation: none;
		}
	}
</style>
