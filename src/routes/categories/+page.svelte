<script lang="ts">
	import { enhance } from '$app/forms';
	import toast from '$lib/toast.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import ActionButton from '$lib/components/action-button.svelte';
	import PageTabs from '$lib/components/page-tabs.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import { primaryAction } from '$lib/table';
	import FinIcon from '$lib/components/fin-icon.svelte';
	import IconPicker from '$lib/components/icon-picker.svelte';
	import { CATEGORY_ICONS } from '$lib/icon-keys';
	import { formatMoney, toInputAmount } from '$lib/money';
	import { cn } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data } = $props();

	type Cat = (typeof data.categories)[number];

	const active = $derived(data.categories.filter((c) => !c.archived));
	const archived = $derived(data.categories.filter((c) => c.archived));
	const isExpense = $derived(data.kind === 'EXPENSE');

	let open = $state(false);
	let saving = $state(false);
	let error = $state('');
	let form = $state({ id: '', name: '', icon: 'other', keywords: '', monthlyBudget: '' });

	function edit(c?: Cat) {
		form = c
			? {
					id: c.id,
					name: c.name,
					icon: c.icon,
					keywords: c.keywords.join(', '),
					monthlyBudget: c.monthlyBudget ? toInputAmount(c.monthlyBudget) : ''
				}
			: { id: '', name: '', icon: isExpense ? 'other' : 'salary', keywords: '', monthlyBudget: '' };
		error = '';
		open = true;
	}
</script>

<svelte:head><title>Категории · Monio</title></svelte:head>

<PageHeader title="Категории" count={data.kindCounts.expense + data.kindCounts.income} />

<div class="mb-3 flex flex-wrap items-center gap-1.5">
	<PageTabs
		tabs={[
			{
				href: '/categories',
				label: 'Расходы',
				hint: String(data.kindCounts.expense),
				active: isExpense
			},
			{
				href: '/categories?kind=income',
				label: 'Доходы',
				hint: String(data.kindCounts.income),
				active: !isExpense
			}
		]}
	/>
	<button type="button" class="{primaryAction} ml-auto" onclick={() => edit()}>
		<Plus size={14} /> Категория
	</button>
</div>

<div class="grid gap-3 pb-6">
	<div>
		<p class="max-w-2xl text-[13px] text-muted-foreground">
			<b class="text-foreground">Ключевые слова</b> — по ним Мони в Telegram сам узнаёт категорию:
			напишешь «атб 320», и он запишет в «Продукты». Пиши основу слова без окончания: «продукт»
			поймает и «продукты», и «продуктов».
			{#if isExpense}<b class="text-foreground">Лимит</b> — сколько готов тратить в месяц; на обзоре будет
				видно, когда он превышен.{/if}
		</p>
	</div>

	<Card.Root class="py-1">
		<Card.Content class="grid divide-y divide-border px-2">
			{#each active as c (c.id)}
				<div class="flex items-center gap-3 px-2 py-2.5">
					<FinIcon icon={c.icon} size={26} />
					<div class="min-w-0 flex-1">
						<p class="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
							{c.name}
							<span class="text-xs font-normal text-muted-foreground">{c.txCount} опер.</span>
						</p>
						{#if c.keywords.length}
							<p class="truncate text-xs text-muted-foreground">
								{c.keywords.slice(0, 8).join(', ')}{c.keywords.length > 8
									? ` +${c.keywords.length - 8}`
									: ''}
							</p>
						{:else}
							<p class="text-xs text-muted-foreground/60">без ключевых слов</p>
						{/if}
					</div>
					{#if isExpense}
						<div class="hidden text-right text-xs sm:block">
							<p class="font-medium tabular">{formatMoney(c.spentThisMonth)}</p>
							<p
								class={cn(
									'text-muted-foreground tabular',
									c.monthlyBudget && c.spentThisMonth > c.monthlyBudget && 'text-destructive'
								)}
							>
								{c.monthlyBudget ? `лимит ${formatMoney(c.monthlyBudget)}` : 'в этом месяце'}
							</p>
						</div>
					{/if}
					<div class="flex shrink-0">
						<Button variant="ghost" size="icon-sm" aria-label="Изменить" onclick={() => edit(c)}>
							<Pencil />
						</Button>
						<ActionButton
							action="?/archive"
							id={c.id}
							label="В архив"
							size="icon-sm"
							success="Категория в архиве"
						>
							<Archive />
						</ActionButton>
					</div>
				</div>
			{:else}
				<p class="py-8 text-center text-sm text-muted-foreground">Категорий нет — создай первую.</p>
			{/each}
		</Card.Content>
	</Card.Root>

	{#if archived.length}
		<details class="group">
			<summary class="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
				Архив ({archived.length})
			</summary>
			<Card.Root class="mt-3 py-2">
				<Card.Content class="grid divide-y divide-border px-2">
					{#each archived as c (c.id)}
						<div class="flex items-center gap-3 px-2 py-2 opacity-70">
							<FinIcon icon={c.icon} size={24} />
							<span class="flex-1 text-sm"
								>{c.name}
								<span class="text-xs text-muted-foreground">· {c.txCount} опер.</span></span
							>
							<ActionButton
								action="?/restore"
								id={c.id}
								label="Вернуть"
								size="icon-sm"
								success="Категория снова активна"
							>
								<ArchiveRestore />
							</ActionButton>
							{#if c.txCount === 0}
								<ActionButton
									action="?/delete"
									id={c.id}
									label="Удалить навсегда"
									size="icon-sm"
									variant="ghost"
									confirmText="Удалить категорию «{c.name}» навсегда?"
									success="Удалено"
								>
									<Trash2 />
								</ActionButton>
							{/if}
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		</details>
	{/if}
</div>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[92svh] overflow-y-auto sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title
				>{form.id
					? 'Изменить категорию'
					: `Новая категория ${isExpense ? 'расходов' : 'доходов'}`}</Dialog.Title
			>
		</Dialog.Header>

		<form
			method="POST"
			action="?/save"
			class="grid gap-4"
			use:enhance={() => {
				saving = true;
				error = '';
				return async ({ result, update }) => {
					saving = false;
					if (result.type === 'failure') {
						error = String(result.data?.message ?? 'Не удалось сохранить');
						return;
					}
					if (result.type === 'success') {
						open = false;
						toast.success('Сохранено');
					}
					await update();
				};
			}}
		>
			{#if form.id}<input type="hidden" name="id" value={form.id} />{/if}
			<input type="hidden" name="kind" value={data.kind} />

			<div class="grid gap-2">
				<Label for="cat-name">Название</Label>
				<Input id="cat-name" name="name" bind:value={form.name} maxlength={40} required />
			</div>

			<div class="grid gap-2">
				<span class="text-sm font-medium">Иконка</span>
				<IconPicker keys={CATEGORY_ICONS} bind:value={form.icon} />
			</div>

			<div class="grid gap-2">
				<Label for="cat-keywords">Ключевые слова для бота</Label>
				<Textarea
					id="cat-keywords"
					name="keywords"
					bind:value={form.keywords}
					rows={3}
					placeholder="атб, сильпо, продукт"
				/>
				<p class="text-xs text-muted-foreground">
					Через запятую. Регистр и украинские/русские буквы не важны.
				</p>
			</div>

			{#if isExpense}
				<div class="grid gap-2">
					<Label for="cat-budget">Лимит в месяц, ₴</Label>
					<Input
						id="cat-budget"
						name="monthlyBudget"
						bind:value={form.monthlyBudget}
						inputmode="decimal"
						placeholder="без лимита"
					/>
				</div>
			{/if}

			{#if error}<p class="text-sm text-destructive" role="alert">{error}</p>{/if}

			<Button type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</Button>
		</form>
	</Dialog.Content>
</Dialog.Root>
