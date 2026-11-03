<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import MonthBars from '$lib/components/month-bars.svelte';
	import PivotTable from '$lib/components/pivot-table.svelte';
	import PageTabs from '$lib/components/page-tabs.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import { formatMoney } from '$lib/money';
	import { monthShort, monthTitle, shiftMonth } from '$lib/date';
	import { cn } from '$lib/utils';

	let { data } = $props();

	const last = $derived(data.months.at(-1)!);
	const currentYear = $derived(Number(last.slice(0, 4)));

	const tabs = $derived(
		data.periods.map((p) => ({
			href: `?n=${p}`,
			label: p === 3 ? '3 месяца' : `${p} месяцев`,
			active: data.n === p
		}))
	);

	const barRows = $derived(
		data.months.map((m, i) => ({
			month: monthShort(m, currentYear),
			income: data.series[i].income,
			expense: data.series[i].expense
		}))
	);
	const monthByLabel = $derived(new Map(data.months.map((m) => [monthShort(m, currentYear), m])));

	const pivotHref = (type: 'EXPENSE' | 'INCOME') => (cat: string | null, month: string) =>
		`/transactions?${new URLSearchParams({ m: month, type, cat: cat ?? 'none' })}`;

	const stats = $derived([
		{ label: 'Средний доход в месяц', value: formatMoney(data.summary.avgIncome) },
		{ label: 'Средний расход в месяц', value: formatMoney(data.summary.avgExpense) },
		{
			label: `Сэкономлено за ${data.n} мес`,
			value: formatMoney(data.summary.totalIncome - data.summary.totalExpense, { sign: true })
		},
		{
			label: 'Норма сбережений',
			value: data.summary.savingsRate === null ? '—' : `${data.summary.savingsRate}%`
		}
	]);
</script>

<svelte:head><title>Аналитика · Monio</title></svelte:head>

<PageHeader
	title="Аналитика"
	subtitle="{monthShort(shiftMonth(last, -(data.n - 1)), currentYear)} – {monthShort(
		last,
		currentYear
	)}"
>
	{#snippet actions()}<PageTabs {tabs} variant="segmented" />{/snippet}
</PageHeader>

<div class="grid gap-3 pb-6">
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each stats as s (s.label)}
			<Card.Root class="gap-1 py-4">
				<Card.Content class="px-4">
					<p class="eyebrow text-muted-foreground">{s.label}</p>
					<p
						class="mt-1.5 font-display text-[26px] leading-tight font-semibold tracking-[-0.03em] tabular"
					>
						{s.value}
					</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Доходы и расходы по месяцам</Card.Title>
			<Card.Description>
				{#if data.summary.countedMonths}
					Средние выше — по {data.summary.countedMonths} полным месяцам учёта, без текущего
				{:else}
					Средние появятся, когда закончится первый месяц учёта
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<MonthBars rows={barRows} title={(label) => monthTitle(monthByLabel.get(label) ?? '')} />

			<!-- табличный вид тех же цифр -->
			<div class="-mx-4 mt-4 overflow-x-auto px-4">
				<table class="w-full text-sm">
					<thead class="text-muted-foreground">
						<tr>
							<th class="py-2 text-left eyebrow font-semibold">Месяц</th>
							<th class="py-2 text-right eyebrow font-semibold">Доходы</th>
							<th class="py-2 text-right eyebrow font-semibold">Расходы</th>
							<th class="py-2 text-right eyebrow font-semibold">Остаток</th>
						</tr>
					</thead>
					<tbody>
						{#each [...data.series].reverse() as s (s.month)}
							{@const net = s.income - s.expense}
							<tr class="border-t">
								<td class="py-2">
									<a href="/?m={s.month}" class="font-medium hover:text-link"
										>{monthTitle(s.month)}</a
									>
								</td>
								<td class="py-2 text-right tabular">{formatMoney(s.income)}</td>
								<td class="py-2 text-right tabular">{formatMoney(s.expense)}</td>
								<td
									class={cn('py-2 text-right font-semibold tabular', net < 0 && 'text-destructive')}
								>
									{formatMoney(net, { sign: true })}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Расходы: категория × месяц</Card.Title>
			<Card.Description>
				Чем насыщеннее ячейка, тем больше потрачено в этой категории относительно других месяцев.
				Клик — операции за этот месяц.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<PivotTable
				months={data.months}
				rows={data.expensePivot}
				href={pivotHref('EXPENSE')}
				{currentYear}
			/>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Доходы: источник × месяц</Card.Title>
		</Card.Header>
		<Card.Content>
			<PivotTable
				months={data.months}
				rows={data.incomePivot}
				href={pivotHref('INCOME')}
				{currentYear}
			/>
		</Card.Content>
	</Card.Root>
</div>
