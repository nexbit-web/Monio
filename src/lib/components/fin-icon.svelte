<script lang="ts" module>
	import type { IconTone } from '$lib/icon-keys';

	/**
	 * Яркие насыщенные цвета плиток, как у иконок приложений в ClickUp. Знак
	 * белый; на жёлтой плитке белый не читается — там знак тёмный.
	 */
	const TONES: Record<IconTone, { bg: string; fg: string }> = {
		green: { bg: '#16b673', fg: '#ffffff' },
		teal: { bg: '#12b5a5', fg: '#ffffff' },
		sky: { bg: '#1aa7ff', fg: '#ffffff' },
		blue: { bg: '#3d7bff', fg: '#ffffff' },
		violet: { bg: '#7c5cff', fg: '#ffffff' },
		purple: { bg: '#b14cf0', fg: '#ffffff' },
		pink: { bg: '#ff4f9a', fg: '#ffffff' },
		coral: { bg: '#ff6550', fg: '#ffffff' },
		red: { bg: '#f43f5e', fg: '#ffffff' },
		orange: { bg: '#ff7a1a', fg: '#ffffff' },
		amber: { bg: '#ffb800', fg: '#3a2600' },
		gray: { bg: '#8a94a6', fg: '#ffffff' }
	};
</script>

<script lang="ts">
	/**
	 * Иконка категории или счёта: белый сплошной знак на яркой плитке. Плитка —
	 * как иконки в новой macOS: градиент от светлого угла к насыщенному, по
	 * краю стеклянный блик (ярче в верхнем левом и нижнем правом углах) и
	 * лёгкая тень под знаком. Без плитки (`tile={false}`) — сам знак цветом плитки.
	 *
	 * `icon` — значение из базы (ключ или старое эмодзи). null — «без категории»,
	 * `transfer` — перевод между счетами.
	 */
	import { ICON_META, iconKey } from '$lib/icon-keys';
	import { cn } from '$lib/utils';
	import FinGlyph from './fin-glyph.svelte';

	let {
		icon,
		transfer = false,
		size = 32,
		tile = true,
		class: className
	}: {
		icon: string | null | undefined;
		transfer?: boolean;
		/** сторона плитки в px; знак внутри — около 60 % */
		size?: number;
		/** false — один знак без плитки */
		tile?: boolean;
		class?: string;
	} = $props();

	const key = $derived(icon ? iconKey(icon) : null);
	const name = $derived(transfer ? 'transfer' : (key ?? 'unknown'));
	const tone = $derived(transfer || !key ? TONES.gray : TONES[ICON_META[key].tone]);
</script>

{#if tile}
	<span
		class={cn('fin-tile', className)}
		style:width="{size}px"
		style:height="{size}px"
		style:border-radius="{Math.round(size * 0.27)}px"
		style:color={tone.fg}
		style:--tone={tone.bg}
		aria-hidden="true"
	>
		<FinGlyph {name} size={Math.round(size * 0.62)} />
	</span>
{:else}
	<span
		class={cn('inline-grid shrink-0 place-items-center', className)}
		style:color={tone.bg}
		aria-hidden="true"
	>
		<FinGlyph {name} {size} />
	</span>
{/if}

<style>
	.fin-tile {
		position: relative;
		display: inline-grid;
		flex-shrink: 0;
		place-items: center;
		isolation: isolate;
		background: linear-gradient(
			155deg,
			color-mix(in oklab, var(--tone) 72%, white) 0%,
			var(--tone) 52%,
			color-mix(in oklab, var(--tone) 86%, black) 100%
		);
		box-shadow:
			0 1px 2px rgb(0 0 0 / 0.16),
			0 0 0 0.5px color-mix(in oklab, var(--tone) 70%, black);
	}

	/* Стеклянная кромка: светлая рамка 1px, ярче всего в двух углах. Маска
	   оставляет только рамку — середина плитки прозрачная. */
	.fin-tile::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: inherit;
		padding: 1px;
		background: linear-gradient(
			135deg,
			rgb(255 255 255 / 0.9) 0%,
			rgb(255 255 255 / 0.25) 28%,
			rgb(255 255 255 / 0) 50%,
			rgb(255 255 255 / 0.15) 72%,
			rgb(255 255 255 / 0.6) 100%
		);
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
		pointer-events: none;
	}

	/* Мягкий блик сверху — как свет на стекле. */
	.fin-tile::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: inherit;
		background: radial-gradient(120% 70% at 25% 0%, rgb(255 255 255 / 0.32), transparent 62%);
		pointer-events: none;
	}

	.fin-tile :global(svg) {
		filter: drop-shadow(0 1px 0.6px rgb(0 0 0 / 0.22));
	}
</style>
