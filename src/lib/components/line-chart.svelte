<script lang="ts">
	/**
	 * Линейный график на голом SVG: тонкие линии, ненавязчивая сетка,
	 * подпись последнего значения прямо у точки и слой наведения с перекрестием.
	 */

	import type { ChartPoint, ChartSeries } from './chart-types';

	let {
		series,
		height = 220,
		formatY = (v: number) => v.toFixed(1),
		formatX = (v: number) => String(v),
		unit = '',
		yTicks = 4,
		showLegend = true
	}: {
		series: ChartSeries[];
		height?: number;
		formatY?: (v: number) => string;
		formatX?: (v: number) => string;
		unit?: string;
		yTicks?: number;
		showLegend?: boolean;
	} = $props();

	const PAD = { top: 12, right: 46, bottom: 24, left: 40 };

	let width = $state(640);
	let hoverX = $state<number | null>(null);

	const colorOf = (s: ChartSeries, i: number) => s.color ?? `var(--chart-${(i % 5) + 1})`;

	const all = $derived(series.flatMap((s) => s.points));

	const domain = $derived.by(() => {
		if (all.length === 0) return null;
		const xs = all.map((p) => p.x);
		const ys = all.map((p) => p.y);
		const minX = Math.min(...xs);
		const maxX = Math.max(...xs);
		let minY = Math.min(...ys);
		let maxY = Math.max(...ys);
		const span = maxY - minY || Math.max(1, Math.abs(maxY) * 0.05);
		minY -= span * 0.12;
		maxY += span * 0.12;
		return { minX, maxX: maxX === minX ? minX + 1 : maxX, minY, maxY };
	});

	const plotW = $derived(Math.max(10, width - PAD.left - PAD.right));
	const plotH = $derived(Math.max(10, height - PAD.top - PAD.bottom));

	const sx = $derived((x: number) =>
		domain ? PAD.left + ((x - domain.minX) / (domain.maxX - domain.minX)) * plotW : 0
	);
	const sy = $derived((y: number) =>
		domain ? PAD.top + (1 - (y - domain.minY) / (domain.maxY - domain.minY)) * plotH : 0
	);

	const ticksY = $derived.by(() => {
		if (!domain) return [];
		const step = (domain.maxY - domain.minY) / yTicks;
		return Array.from({ length: yTicks + 1 }, (_, i) => domain.minY + step * i);
	});

	const ticksX = $derived.by(() => {
		if (!domain) return [];
		const count = Math.min(4, Math.max(1, Math.floor(plotW / 90)));
		const step = (domain.maxX - domain.minX) / count;
		return Array.from({ length: count + 1 }, (_, i) => domain.minX + step * i);
	});

	function path(points: ChartPoint[]): string {
		return points
			.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`)
			.join(' ');
	}

	/** Все уникальные x — по ним ищем ближайшую точку под курсором. */
	const xIndex = $derived([...new Set(all.map((p) => p.x))].sort((a, b) => a - b));

	const hovered = $derived.by(() => {
		if (hoverX === null || xIndex.length === 0) return null;
		const x = xIndex.reduce((best, v) => (Math.abs(v - hoverX!) < Math.abs(best - hoverX!) ? v : best));
		const values = series
			.map((s, i) => {
				const p = s.points.find((q) => q.x === x);
				return p ? { label: s.label, value: p.y, color: colorOf(s, i) } : null;
			})
			.filter((v): v is { label: string; value: number; color: string } => v !== null);
		if (values.length === 0) return null;
		return { x, values };
	});

	function onMove(event: PointerEvent) {
		if (!domain) return;
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const px = event.clientX - rect.left;
		const t = (px - PAD.left) / plotW;
		hoverX = domain.minX + t * (domain.maxX - domain.minX);
	}
</script>

<div class="relative w-full" bind:clientWidth={width}>
	{#if !domain}
		<div class="text-muted-foreground grid h-[--h] place-items-center text-sm" style="--h:{height}px">
			Нет данных
		</div>
	{:else}
		<svg
			{width}
			{height}
			role="img"
			aria-label={series.map((s) => s.label).join(', ')}
			class="touch-none select-none"
			onpointermove={onMove}
			onpointerleave={() => (hoverX = null)}
		>
			<!-- сетка -->
			{#each ticksY as t (t)}
				<line
					x1={PAD.left}
					x2={width - PAD.right}
					y1={sy(t)}
					y2={sy(t)}
					stroke="var(--border)"
					stroke-width="1"
					opacity="0.5"
				/>
				<text
					x={PAD.left - 8}
					y={sy(t)}
					text-anchor="end"
					dominant-baseline="middle"
					font-size="10"
					fill="var(--muted-foreground)"
				>
					{formatY(t)}
				</text>
			{/each}

			{#each ticksX as t (t)}
				<text
					x={sx(t)}
					y={height - 6}
					text-anchor="middle"
					font-size="10"
					fill="var(--muted-foreground)"
				>
					{formatX(t)}
				</text>
			{/each}

			<!-- серии -->
			{#each series as s, i (s.id)}
				{@const color = colorOf(s, i)}
				{#if s.kind === 'dots'}
					{#each s.points as p (p.x)}
						<circle cx={sx(p.x)} cy={sy(p.y)} r="2.5" fill={color} opacity="0.75" />
					{/each}
				{:else}
					{#if s.points.length > 1}
						<path
							d={path(s.points)}
							fill="none"
							stroke={color}
							stroke-width="2"
							stroke-linejoin="round"
							stroke-linecap="round"
						/>
					{/if}
					{#if s.points.length === 1}
						<circle
							cx={sx(s.points[0].x)}
							cy={sy(s.points[0].y)}
							r="4"
							fill={color}
							stroke="var(--card)"
							stroke-width="2"
						/>
					{/if}
					<!-- прямая подпись последнего значения вместо числа на каждой точке -->
					{#if s.points.length > 0}
						{@const last = s.points[s.points.length - 1]}
						<circle
							cx={sx(last.x)}
							cy={sy(last.y)}
							r="4"
							fill={color}
							stroke="var(--card)"
							stroke-width="2"
						/>
						<text
							x={Math.min(sx(last.x) + 8, width - 2)}
							y={sy(last.y)}
							dominant-baseline="middle"
							font-size="11"
							font-weight="600"
							fill="var(--foreground)"
						>
							{formatY(last.y)}
						</text>
					{/if}
				{/if}
			{/each}

			<!-- слой наведения -->
			{#if hovered}
				<line
					x1={sx(hovered.x)}
					x2={sx(hovered.x)}
					y1={PAD.top}
					y2={height - PAD.bottom}
					stroke="var(--muted-foreground)"
					stroke-width="1"
					stroke-dasharray="3 3"
				/>
				{#each hovered.values as v (v.label)}
					<circle
						cx={sx(hovered.x)}
						cy={sy(v.value)}
						r="4.5"
						fill={v.color}
						stroke="var(--card)"
						stroke-width="2"
					/>
				{/each}
			{/if}
		</svg>

		{#if hovered}
			<div
				class="border-border/70 bg-popover/95 pointer-events-none absolute top-2 rounded-md border px-2.5 py-1.5 text-xs shadow-lg backdrop-blur"
				style="left: {Math.min(Math.max(sx(hovered.x) - 60, 4), Math.max(4, width - 140))}px"
			>
				<p class="text-muted-foreground mb-1">{formatX(hovered.x)}</p>
				{#each hovered.values as v (v.label)}
					<p class="flex items-center gap-2 whitespace-nowrap">
						<span class="size-2 shrink-0 rounded-full" style="background:{v.color}"></span>
						<span class="text-muted-foreground">{v.label}</span>
						<span class="tabular ml-auto font-medium">{formatY(v.value)}{unit}</span>
					</p>
				{/each}
			</div>
		{/if}
	{/if}

	{#if showLegend && series.length > 1}
		<div class="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
			{#each series as s, i (s.id)}
				<span class="flex items-center gap-1.5">
					<span class="size-2 rounded-full" style="background:{colorOf(s, i)}"></span>
					{s.label}
				</span>
			{/each}
		</div>
	{/if}
</div>
