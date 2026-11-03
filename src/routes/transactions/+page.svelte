<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import NativeSelect from '$lib/components/native-select.svelte';
	import MonthSwitcher from '$lib/components/month-switcher.svelte';
	import PageTabs from '$lib/components/page-tabs.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import TxTable from '$lib/components/tx-table.svelte';
	import { useTxDialog } from '$lib/tx-dialog.svelte';
	import { formatMoney } from '$lib/money';
	import { currentMonthKey, dayKeyOf } from '$lib/date';
	import { pill, pillActive, primaryAction } from '$lib/table';
	import Download from '@lucide/svelte/icons/download';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import ListFilter from '@lucide/svelte/icons/list-filter';

	let { data } = $props();
	const dialog = useTxDialog();

	const nowMonth = $derived(currentMonthKey(data.tz));
	const f = $derived(data.filters);

	/** Ссылка на эту же страницу с изменёнными параметрами; страница сбрасывается на первую. */
	function withParams(patch: Record<string, string | null>) {
		const p = new URLSearchParams(page.url.searchParams);
		p.delete('page');
		for (const [k, v] of Object.entries(patch)) {
			if (v === null || v === '') p.delete(k);
			else p.set(k, v);
		}
		const qs = p.toString();
		return qs ? `/transactions?${qs}` : '/transactions';
	}

	const tabs = $derived([
		{
			href: withParams({ type: null }),
			label: 'Все',
			hint: String(data.counts.all),
			active: f.type === null
		},
		{
			href: withParams({ type: 'EXPENSE' }),
			label: 'Расходы',
			hint: data.totals.expense ? `−${formatMoney(data.totals.expense)}` : undefined,
			active: f.type === 'EXPENSE'
		},
		{
			href: withParams({ type: 'INCOME' }),
			label: 'Доходы',
			hint: data.totals.income ? `+${formatMoney(data.totals.income)}` : undefined,
			active: f.type === 'INCOME'
		},
		{
			href: withParams({ type: 'TRANSFER' }),
			label: 'Переводы',
			hint: data.counts.transfer ? String(data.counts.transfer) : undefined,
			active: f.type === 'TRANSFER'
		}
	]);

	const groups = $derived.by(() => {
		const out: { key: string; items: typeof data.rows; net: number }[] = [];
		for (const r of data.rows) {
			const key = dayKeyOf(r.occurredAt, data.tz);
			let g = out.at(-1);
			if (!g || g.key !== key) {
				g = { key, items: [], net: 0 };
				out.push(g);
			}
			g.items.push(r);
			g.net += r.type === 'INCOME' ? r.amount : r.type === 'EXPENSE' ? -r.amount : 0;
		}
		return out;
	});

	const hasExtraFilters = $derived(!!(f.category || f.account || f.q || f.from || f.to));
	let showFilters = $state(false);

	const submitOnChange = (e: Event) => (e.currentTarget as HTMLSelectElement).form?.requestSubmit();

	function edit(r: (typeof data.rows)[number]) {
		dialog.show({
			id: r.id,
			type: r.type,
			amount: r.amount,
			categoryId: r.category?.id,
			accountId: r.account.id,
			toAccountId: r.toAccount?.id,
			occurredAt: r.occurredAt,
			note: r.note
		});
	}
</script>

<svelte:head><title>Операции · Monio</title></svelte:head>

<PageHeader title="Операции" count={data.counts.all}>
	{#snippet actions()}
		<a class={pill} href="/transactions/export?{data.query}" data-sveltekit-reload>
			<Download size={13} /> CSV
		</a>
		<button
			type="button"
			class={primaryAction}
			onclick={() => dialog.show({ type: f.type ?? 'EXPENSE' })}
		>
			<Plus size={14} /> Операция
		</button>
	{/snippet}
</PageHeader>

<!-- панель над списком: тип, период и фильтры -->
<div class="flex flex-wrap items-center gap-1.5">
	<PageTabs {tabs} />
	<span class="mx-0.5 h-4 w-px bg-border" aria-hidden="true"></span>
	<MonthSwitcher
		month={f.month && f.month !== 'all' ? f.month : nowMonth}
		current={nowMonth}
		href={(m) => withParams({ m, from: null, to: null })}
	/>
	<a
		href={withParams({ m: 'all', from: null, to: null })}
		class={f.month === 'all' ? pillActive : pill}
		aria-current={f.month === 'all' ? 'page' : undefined}
	>
		Весь период
	</a>
	<button
		type="button"
		onclick={() => (showFilters = !showFilters)}
		aria-expanded={showFilters || hasExtraFilters}
		class={hasExtraFilters ? pillActive : pill}
	>
		<ListFilter size={13} /> Фильтр
	</button>
	{#if hasExtraFilters}
		<a
			href={withParams({ cat: null, acc: null, q: null, from: null, to: null })}
			class="text-[12px] text-muted-foreground hover:text-foreground"
		>
			Сбросить
		</a>
	{/if}
</div>

{#if showFilters || hasExtraFilters}
	<!-- обычная GET-форма: работает и без JS -->
	<form
		method="GET"
		class="mt-2 grid gap-2 rounded-[12px] border bg-block p-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_1.4fr]"
		data-sveltekit-keepfocus
	>
		{#if f.month}<input type="hidden" name="m" value={f.month} />{/if}
		{#if f.type}<input type="hidden" name="type" value={f.type} />{/if}

		<NativeSelect
			name="cat"
			value={f.category ?? ''}
			onchange={submitOnChange}
			aria-label="Категория"
		>
			<option value="">Все категории</option>
			<option value="none">Без категории</option>
			<optgroup label="Расходы">
				{#each data.allCategories.filter((c) => c.kind === 'EXPENSE') as c (c.id)}
					<option value={c.id}>{c.name}{c.archived ? ' (архив)' : ''}</option>
				{/each}
			</optgroup>
			<optgroup label="Доходы">
				{#each data.allCategories.filter((c) => c.kind === 'INCOME') as c (c.id)}
					<option value={c.id}>{c.name}{c.archived ? ' (архив)' : ''}</option>
				{/each}
			</optgroup>
		</NativeSelect>

		<NativeSelect name="acc" value={f.account ?? ''} onchange={submitOnChange} aria-label="Счёт">
			<option value="">Все счета</option>
			{#each data.allAccounts as a (a.id)}
				<option value={a.id}>{a.name}{a.archived ? ' (архив)' : ''}</option>
			{/each}
		</NativeSelect>

		<Input type="date" name="from" value={f.from ?? ''} aria-label="С даты" class="sm:w-auto" />
		<Input type="date" name="to" value={f.to ?? ''} aria-label="По дату" class="sm:w-auto" />

		<div class="flex gap-2">
			<Input name="q" value={f.q} placeholder="Поиск по комментарию" aria-label="Поиск" />
			<Button type="submit" variant="outline" size="icon" aria-label="Применить">
				<Search />
			</Button>
		</div>
	</form>
{/if}

{#if data.rows.length === 0}
	<EmptyState
		title="Операций не найдено"
		text="Измени период или фильтры — или добавь операцию: здесь или через Telegram-бота."
	>
		<Button onclick={() => dialog.show({ type: f.type ?? 'EXPENSE' })}><Plus /> Добавить</Button>
	</EmptyState>
{:else}
	<div class="mt-2 pb-6">
		<TxTable {groups} tz={data.tz} onedit={edit} />

		{#if data.pages > 1}
			<div class="mt-4 flex items-center justify-center gap-3 text-sm">
				{#if data.page > 1}
					<Button
						variant="outline"
						size="sm"
						href="/transactions?{data.query}&page={data.page - 1}"
					>
						← Назад
					</Button>
				{/if}
				<span class="text-muted-foreground tabular">Стр. {data.page} из {data.pages}</span>
				{#if data.page < data.pages}
					<Button
						variant="outline"
						size="sm"
						href="/transactions?{data.query}&page={data.page + 1}"
					>
						Дальше →
					</Button>
				{/if}
			</div>
		{/if}
	</div>
{/if}
