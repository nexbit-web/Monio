<script lang="ts">
	/**
	 * Доходы и расходы по месяцам — сгруппированные столбики со скруглённым
	 * верхом. shadcn-svelte Chart поверх LayerChart.
	 */
	import { BarChart } from 'layerchart';
	import * as Chart from '$lib/components/ui/chart';
	import { formatCompact, formatMoney } from '$lib/money';

	let {
		rows,
		title
	}: {
		/** подпись месяца на оси и суммы в копейках */
		rows: { month: string; income: number; expense: number }[];
		/** полное название месяца в подсказке */
		title: (month: string) => string;
	} = $props();

	const config = {
		income: { label: 'Доходы', color: 'var(--chart-1)' },
		expense: { label: 'Расходы', color: 'var(--chart-3)' }
	} satisfies Chart.ChartConfig;
</script>

<div class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
	{#each Object.values(config) as s (s.label)}
		<span class="flex items-center gap-1.5">
			<span class="size-2.5 rounded-[3px]" style:background={s.color}></span>{s.label}
		</span>
	{/each}
</div>

<Chart.Container {config} class="aspect-auto h-60 w-full">
	<BarChart
		data={rows}
		x="month"
		seriesLayout="group"
		bandPadding={0.3}
		groupPadding={0.08}
		series={[
			{ key: 'income', label: config.income.label, color: config.income.color },
			{ key: 'expense', label: config.expense.label, color: config.expense.color }
		]}
		props={{
			bars: { stroke: 'none', radius: 4 },
			yAxis: { format: (v: number) => formatCompact(v), ticks: 4 },
			grid: { x: false }
		}}
	>
		{#snippet tooltip()}
			<Chart.Tooltip labelFormatter={(m) => title(String(m))}>
				{#snippet formatter({ value, name, item })}
					<div class="flex w-full items-center gap-2">
						<span
							class="size-2.5 shrink-0 rounded-[3px]"
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
	</BarChart>
</Chart.Container>
