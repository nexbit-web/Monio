<script lang="ts">
	import FinIcon from './fin-icon.svelte';
	/**
	 * Сводная «категория × месяц». Насыщенность ячейки — доля от максимума этой же строки,
	 * так видно, в какой месяц категория была «тяжелее» всего. Один оттенок, текст всегда обычного цвета.
	 */
	import { formatMoney } from '$lib/money';
	import { monthShort } from '$lib/date';

	type Row = {
		id: string | null;
		name: string;
		icon: string | null;
		values: number[];
		total: number;
		avg: number;
	};

	let {
		months,
		rows,
		href,
		currentYear
	}: {
		months: string[];
		rows: Row[];
		href: (categoryId: string | null, month: string) => string;
		currentYear: number;
	} = $props();

	const columnTotals = $derived(months.map((_, i) => rows.reduce((s, r) => s + r.values[i], 0)));
	const grand = $derived(columnTotals.reduce((s, v) => s + v, 0));

	const shade = (v: number, max: number) =>
		v > 0 && max > 0
			? `background: color-mix(in oklch, var(--chart-1) ${Math.round(6 + 34 * (v / max))}%, transparent)`
			: '';

	const fmt = (v: number) => (v === 0 ? '—' : formatMoney(v, { currency: false }));
</script>

{#if rows.length === 0}
	<p class="py-6 text-center text-sm text-muted-foreground">За этот период данных нет</p>
{:else}
	<div class="-mx-4 overflow-x-auto px-4">
		<table class="w-full border-separate border-spacing-0 text-sm">
			<thead>
				<tr class="text-xs text-muted-foreground">
					<th class="sticky left-0 z-10 bg-card py-2 pr-3 text-left font-normal">Категория</th>
					{#each months as m (m)}
						<th class="px-2 py-2 text-right font-normal whitespace-nowrap"
							>{monthShort(m, currentYear)}</th
						>
					{/each}
					<th class="px-2 py-2 text-right font-medium">Итого</th>
					<th class="py-2 pl-2 text-right font-normal whitespace-nowrap">В среднем</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as r (r.id ?? 'none')}
					{@const rowMax = Math.max(...r.values)}
					<tr class="group">
						<th
							class="sticky left-0 z-10 max-w-44 truncate border-t bg-card py-1.5 pr-3 text-left font-normal group-hover:bg-muted"
						>
							<span class="flex items-center gap-2"
								><FinIcon icon={r.icon} size={22} /><span class="truncate">{r.name}</span></span
							>
						</th>
						{#each r.values as v, i (months[i])}
							<td class="border-t p-0.5 text-right">
								<a
									href={href(r.id, months[i])}
									class="block rounded px-1.5 py-1 whitespace-nowrap tabular hover:ring-1 hover:ring-primary/60"
									style={shade(v, rowMax)}
									title="{r.name}, {monthShort(months[i], currentYear)}: {formatMoney(v)}"
								>
									{fmt(v)}
								</a>
							</td>
						{/each}
						<td class="border-t px-2 py-1.5 text-right font-semibold whitespace-nowrap tabular"
							>{fmt(r.total)}</td
						>
						<td
							class="border-t py-1.5 pl-2 text-right whitespace-nowrap text-muted-foreground tabular"
							>{fmt(r.avg)}</td
						>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr class="font-semibold">
					<th class="sticky left-0 z-10 border-t-2 bg-card py-2 pr-3 text-left">Всего</th>
					{#each columnTotals as v, i (months[i])}
						<td class="border-t-2 px-2 py-2 text-right whitespace-nowrap tabular">{fmt(v)}</td>
					{/each}
					<td class="border-t-2 px-2 py-2 text-right whitespace-nowrap tabular">{fmt(grand)}</td>
					<td class="border-t-2"></td>
				</tr>
			</tfoot>
		</table>
	</div>
{/if}
