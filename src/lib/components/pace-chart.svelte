<script lang="ts">
	/**
	 * Темп трат: расходы нарастающим итогом по дням — этот месяц областью,
	 * прошлый пунктиром для сравнения. shadcn-svelte Chart поверх LayerChart.
	 */
	import { AreaChart } from 'layerchart';
	import * as Chart from '$lib/components/ui/chart';
	import { formatCompact, formatMoney } from '$lib/money';

	type Point = { day: number; total: number };

	let {
		current,
		previous,
		currentLabel,
		previousLabel
	}: {
		current: Point[];
		previous: Point[];
		currentLabel: string;
		previousLabel: string;
	} = $props();

	// Одна строка на день: у прошлого месяца — весь месяц, у этого — до сегодня.
	const rows = $derived.by(() => {
		const days = Math.max(current.at(-1)?.day ?? 0, previous.at(-1)?.day ?? 0);
		const cur = new Map(current.map((p) => [p.day, p.total]));
		const prev = new Map(previous.map((p) => [p.day, p.total]));
		return Array.from({ length: days }, (_, i) => ({
			day: i + 1,
			cur: cur.get(i + 1) ?? null,
			prev: prev.get(i + 1) ?? null
		}));
	});

	const config = $derived({
		cur: { label: currentLabel, color: 'var(--chart-1)' },
		prev: { label: previousLabel, color: 'var(--chart-2)' }
	} satisfies Chart.ChartConfig);

	const has = (key: 'cur' | 'prev') => (d: { cur: number | null; prev: number | null }) =>
		d[key] !== null;
</script>

{#if rows.length === 0}
	<p class="py-10 text-center text-[13px] text-muted-foreground">Расходов пока нет</p>
{:else}
	<!-- легенда: два ряда, поэтому подписываем, а не полагаемся на цвет -->
	<div class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
		<span class="flex items-center gap-1.5">
			<span class="h-0.5 w-3.5 rounded-full bg-chart-1"></span>{currentLabel}
		</span>
		<span class="flex items-center gap-1.5">
			<span class="w-3.5 border-t-2 border-dashed border-chart-2"></span>{previousLabel}
		</span>
	</div>

	<Chart.Container {config} class="aspect-auto h-50 w-full">
		<AreaChart
			data={rows}
			x="day"
			series={[
				{
					key: 'prev',
					label: previousLabel,
					color: config.prev.color,
					props: {
						fillOpacity: 0,
						defined: has('prev'),
						line: { defined: has('prev'), class: '[stroke-dasharray:4_3] stroke-[1.5]' }
					}
				},
				{
					key: 'cur',
					label: currentLabel,
					color: config.cur.color,
					props: {
						fillOpacity: 0.16,
						defined: has('cur'),
						line: { defined: has('cur'), class: 'stroke-2' }
					}
				}
			]}
			props={{
				xAxis: { format: (d: number) => String(d), ticks: 6 },
				yAxis: { format: (v: number) => formatCompact(v), ticks: 4 },
				grid: { x: false }
			}}
		>
			{#snippet tooltip()}
				<Chart.Tooltip labelFormatter={(d) => `${d}-е число`} indicator="line">
					{#snippet formatter({ value, name, item })}
						<div class="flex w-full items-center gap-2">
							<span
								class="h-2.5 w-1 shrink-0 rounded-[2px]"
								style:background={item.config?.color ?? item.color}
							></span>
							<span class="flex-1 text-muted-foreground">{name}</span>
							<span class="font-medium text-foreground tabular-nums">
								{formatMoney(Number(value))}
							</span>
						</div>
					{/snippet}
				</Chart.Tooltip>
			{/snippet}
		</AreaChart>
	</Chart.Container>
{/if}
