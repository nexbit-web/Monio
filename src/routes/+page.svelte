<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import PaceChart from '$lib/components/pace-chart.svelte';
	import CategoryBars from '$lib/components/category-bars.svelte';
	import MonthSwitcher from '$lib/components/month-switcher.svelte';
	import TxRow from '$lib/components/tx-row.svelte';
	import Mascot from '$lib/components/mascot.svelte';
	import FinIcon from '$lib/components/fin-icon.svelte';
	import { pill, primaryAction } from '$lib/table';
	import EmptyState from '$lib/components/empty-state.svelte';
	import { useTxDialog } from '$lib/tx-dialog.svelte';
	import { formatMoney, percentChange } from '$lib/money';
	import { monthGen, monthName, monthPrep, monthTitle } from '$lib/date';
	import { cn } from '$lib/utils';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Plus from '@lucide/svelte/icons/plus';
	import Send from '@lucide/svelte/icons/send';

	let { data } = $props();
	const dialog = useTxDialog();

	const net = $derived(data.totals.income - data.totals.expense);
	const savingsRate = $derived(
		data.totals.income ? Math.round((net / data.totals.income) * 100) : null
	);

	/** С чем сравниваем: текущий месяц — с тем же отрезком прошлого, прошедший — с прошлым целиком. */
	const comparePeriod = $derived(
		data.isCurrent
			? `1–${data.dayOfMonth} ${monthGen(data.prevMonth)}`
			: `в ${monthPrep(data.prevMonth)}`
	);

	const expenseChange = $derived(percentChange(data.totals.expense, data.prevTotals.expense));
	const incomeChange = $derived(percentChange(data.totals.income, data.prevTotals.income));

	const isEmpty = $derived(
		data.totals.income === 0 && data.totals.expense === 0 && data.recent.length === 0
	);

	const firstName = $derived(data.user?.name?.split(' ')[0] ?? null);

	const txHref = (params: Record<string, string>) =>
		`/transactions?${new URLSearchParams({ m: data.month, ...params })}`;
</script>

<svelte:head><title>Обзор · Monio</title></svelte:head>

{#snippet delta(change: number | null, upIsBad: boolean)}
	{#if change === null}
		<span class="text-muted-foreground">{comparePeriod} — ноль, не с чем сравнить</span>
	{:else if Math.abs(change) < 1}
		<span class="text-muted-foreground">столько же, как {comparePeriod}</span>
	{:else}
		{@const bad = upIsBad ? change > 0 : change < 0}
		<span
			class={cn(
				'inline-flex items-center gap-0.5 font-semibold',
				bad ? 'text-signal-red' : 'text-signal-green'
			)}
		>
			{#if change > 0}<ArrowUp class="size-3" />{:else}<ArrowDown class="size-3" />{/if}
			{Math.abs(Math.round(change))}% {change > 0 ? 'больше' : 'меньше'}</span
		><span class="text-muted-foreground">, чем {comparePeriod}</span>
	{/if}
{/snippet}

{#snippet stat(label: string, value: string, note: Snippet)}
	<Card.Root class="gap-1 py-4">
		<Card.Content class="px-4">
			<p class="eyebrow text-muted-foreground">{label}</p>
			<p
				class="mt-1.5 font-display text-[26px] leading-tight font-semibold tracking-[-0.03em] tabular"
			>
				{value}
			</p>
			<p class="mt-1 text-xs leading-snug">{@render note()}</p>
		</Card.Content>
	</Card.Root>
{/snippet}

<div class="mb-3 flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1.5">
	<Mascot size={28} />
	<h1 class="text-[17px] font-semibold tracking-tight">
		Привет{firstName ? `, ${firstName}` : ''}!
	</h1>
	<span class="hidden text-[13px] text-muted-foreground sm:inline">
		{data.isCurrent ? 'Вот как идёт' : 'Итоги:'}
		{monthTitle(data.month).toLowerCase()}
	</span>
	<div class="ml-auto flex flex-wrap items-center gap-1.5">
		<MonthSwitcher month={data.month} current={data.thisMonth} href={(m) => `/?m=${m}`} />
		<button type="button" class={pill} onclick={() => dialog.show({ type: 'INCOME' })}>
			<Plus size={13} /> Доход
		</button>
		<button type="button" class={primaryAction} onclick={() => dialog.show({ type: 'EXPENSE' })}>
			<Plus size={14} /> Расход
		</button>
	</div>
</div>

{#if isEmpty}
	<EmptyState
		title="В {monthPrep(data.month)} пока пусто"
		text="Запиши первую трату здесь или подключи Telegram-бота — тогда хватит написать «250 продукты»."
	>
		<Button onclick={() => dialog.show({ type: 'EXPENSE' })}><Plus /> Добавить расход</Button>
		<Button variant="outline" href="/settings#telegram"><Send /> Подключить Telegram</Button>
	</EmptyState>
{:else}
	<div class="grid gap-3 pb-6">
		<!-- главные цифры месяца -->
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			{#snippet incomeNote()}{@render delta(incomeChange, false)}{/snippet}
			{#snippet expenseNote()}{@render delta(expenseChange, true)}{/snippet}
			{#snippet netNote()}
				<span class="text-muted-foreground">
					{#if savingsRate === null}
						доходов в этом месяце нет
					{:else if savingsRate >= 0}
						отложено {savingsRate}% дохода
					{:else}
						потрачено больше, чем заработано
					{/if}
				</span>
			{/snippet}
			{#snippet balanceNote()}
				<a href="/accounts" class="text-link hover:underline">{data.accounts.length} счёт(а) →</a>
			{/snippet}

			{@render stat('Доходы', formatMoney(data.totals.income), incomeNote)}
			{@render stat('Расходы', formatMoney(data.totals.expense), expenseNote)}
			{@render stat('Остаток месяца', formatMoney(net, { sign: true }), netNote)}
			{@render stat('На всех счетах', formatMoney(data.totalBalance), balanceNote)}
		</div>

		<div class="grid gap-3 lg:grid-cols-5">
			<Card.Root class="lg:col-span-3">
				<Card.Header>
					<Card.Title>Куда уходят деньги</Card.Title>
					<Card.Description>Расходы по категориям · стрелка — к прошлому месяцу</Card.Description>
				</Card.Header>
				<Card.Content class="px-3">
					<CategoryBars
						items={data.expenses}
						total={data.totals.expense}
						href={(id) => txHref({ type: 'EXPENSE', cat: id ?? 'none' })}
						emptyText="Расходов в этом месяце пока нет"
					/>
				</Card.Content>
			</Card.Root>

			<div class="grid content-start gap-3 lg:col-span-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Темп трат</Card.Title>
						<Card.Description>Расходы нарастающим итогом по дням месяца</Card.Description>
					</Card.Header>
					<Card.Content>
						<PaceChart
							current={data.chart.current}
							previous={data.chart.previous}
							currentLabel={monthName(data.month)}
							previousLabel={monthName(data.prevMonth)}
						/>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Источники дохода</Card.Title>
					</Card.Header>
					<Card.Content class="px-3">
						<CategoryBars
							items={data.incomes}
							total={data.totals.income}
							compare={false}
							href={(id) => txHref({ type: 'INCOME', cat: id ?? 'none' })}
							emptyText="Доходов в этом месяце пока нет"
						/>
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<div class="grid gap-3 lg:grid-cols-5">
			<Card.Root class="lg:col-span-3">
				<Card.Header class="flex items-center justify-between">
					<Card.Title>Последние операции</Card.Title>
					<a href={txHref({})} class="text-sm font-medium text-link hover:underline">Все →</a>
				</Card.Header>
				<Card.Content class="px-2">
					{#each data.recent as r (r.id)}
						<TxRow
							tx={r}
							tz={data.tz}
							onclick={() =>
								dialog.show({
									id: r.id,
									type: r.type,
									amount: r.amount,
									categoryId: r.category?.id,
									accountId: r.account.id,
									toAccountId: r.toAccount?.id,
									occurredAt: r.occurredAt,
									note: r.note
								})}
						/>
					{:else}
						<p class="py-6 text-center text-sm text-muted-foreground">Пока ничего</p>
					{/each}
				</Card.Content>
			</Card.Root>

			<Card.Root class="lg:col-span-2">
				<Card.Header class="flex items-center justify-between">
					<Card.Title>Счета</Card.Title>
					<a href="/accounts" class="text-sm font-medium text-link hover:underline">Управлять →</a>
				</Card.Header>
				<Card.Content class="grid gap-0.5 px-2">
					{#each data.accounts as a (a.id)}
						<a
							href="/transactions?m=all&acc={a.id}"
							class="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
						>
							<FinIcon icon={a.icon} size={26} />
							<span class="flex-1 truncate text-sm font-medium">{a.name}</span>
							<span
								class={cn('text-sm font-semibold tabular', a.balance < 0 && 'text-destructive')}
							>
								{formatMoney(a.balance)}
							</span>
						</a>
					{/each}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
{/if}
