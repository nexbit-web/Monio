<script lang="ts">
	import { enhance } from '$app/forms';
	import toast from '$lib/toast.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import NativeSelect from '$lib/components/native-select.svelte';
	import ActionButton from '$lib/components/action-button.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import { pill, primaryAction } from '$lib/table';
	import FinIcon from '$lib/components/fin-icon.svelte';
	import IconPicker from '$lib/components/icon-picker.svelte';
	import { ACCOUNT_ICONS } from '$lib/icon-keys';
	import Mascot from '$lib/components/mascot.svelte';
	import { useTxDialog } from '$lib/tx-dialog.svelte';
	import { formatMoney, toInputAmount } from '$lib/money';
	import { cn } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Star from '@lucide/svelte/icons/star';
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data } = $props();
	const txDialog = useTxDialog();

	type Acc = (typeof data.accounts)[number];

	const active = $derived(data.accounts.filter((a) => !a.archived));
	const archived = $derived(data.accounts.filter((a) => a.archived));

	const TYPE_LABEL = {
		CARD: 'Карта',
		CASH: 'Наличные',
		SAVINGS: 'Накопления',
		OTHER: 'Другое'
	} as const;

	let open = $state(false);
	let saving = $state(false);
	let error = $state('');
	let form = $state({
		id: '',
		name: '',
		icon: 'card',
		type: 'CARD',
		openingBalance: '',
		isDefault: false
	});

	function edit(a?: Acc) {
		form = a
			? {
					id: a.id,
					name: a.name,
					icon: a.icon,
					type: a.type,
					openingBalance: a.openingBalance
						? `${a.openingBalance < 0 ? '-' : ''}${toInputAmount(Math.abs(a.openingBalance))}`
						: '',
					isDefault: a.isDefault
				}
			: { id: '', name: '', icon: 'card', type: 'CARD', openingBalance: '', isDefault: false };
		error = '';
		open = true;
	}
</script>

<svelte:head><title>Счета · Monio</title></svelte:head>

<PageHeader title="Счета" count={active.length} subtitle="Карты, наличные и накопления">
	{#snippet actions()}
		<button
			type="button"
			class="{pill} disabled:pointer-events-none disabled:opacity-50"
			onclick={() => txDialog.show({ type: 'TRANSFER' })}
			disabled={active.length < 2}
		>
			<ArrowLeftRight size={13} /> Перевод
		</button>
		<button type="button" class={primaryAction} onclick={() => edit()}>
			<Plus size={14} /> Счёт
		</button>
	{/snippet}
</PageHeader>

<div class="grid gap-3 pb-6">
	<!-- главная цифра страницы — на тёмной карточке, как фирменный блок в DESIGN.md -->
	<div
		class="flex flex-wrap items-center gap-4 rounded-[12px] bg-[linear-gradient(#1d1d20_24%,#0b0b0c)] px-5 py-5 text-white"
	>
		<Mascot size={56} mood="wink" tone="light" />
		<div>
			<p class="eyebrow text-white/60">Всего на активных счетах</p>
			<p class="mt-1 font-display text-4xl font-semibold tracking-[-0.04em] tabular">
				{formatMoney(data.total)}
			</p>
		</div>
	</div>

	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each active as a (a.id)}
			<Card.Root class="py-4">
				<Card.Content class="grid gap-3 px-4">
					<div class="flex items-start gap-3">
						<FinIcon icon={a.icon} size={30} />
						<div class="min-w-0 flex-1">
							<p class="truncate font-display font-semibold">{a.name}</p>
							<p class="text-xs text-muted-foreground">
								{TYPE_LABEL[a.type]}{#if a.isDefault}
									· <span class="font-medium text-link">основной</span>{/if}
							</p>
						</div>
					</div>
					<p
						class={cn(
							'font-display text-2xl font-semibold tracking-[-0.03em] tabular',
							a.balance < 0 && 'text-destructive'
						)}
					>
						{formatMoney(a.balance)}
					</p>
					<div class="-mx-1 flex items-center gap-0.5">
						<Button variant="ghost" size="sm" href="/transactions?m=all&acc={a.id}">
							{a.txCount} опер.
						</Button>
						<span class="flex-1"></span>
						{#if !a.isDefault}
							<ActionButton
								action="?/setDefault"
								id={a.id}
								label="Сделать основным"
								size="icon-sm"
								success="Теперь это основной счёт"
							>
								<Star />
							</ActionButton>
						{/if}
						<Button variant="ghost" size="icon-sm" aria-label="Изменить" onclick={() => edit(a)}>
							<Pencil />
						</Button>
						<ActionButton
							action="?/archive"
							id={a.id}
							label="В архив"
							size="icon-sm"
							success="Счёт в архиве"
						>
							<Archive />
						</ActionButton>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<p class="text-xs text-muted-foreground">
		Основной счёт подставляется в новые операции, в том числе из Telegram. Остаток = начальный
		остаток + доходы − расходы ± переводы.
	</p>

	{#if archived.length}
		<details>
			<summary class="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
				Архив ({archived.length})
			</summary>
			<Card.Root class="mt-3 py-2">
				<Card.Content class="grid divide-y divide-border px-2">
					{#each archived as a (a.id)}
						<div class="flex items-center gap-3 px-2 py-2 opacity-70">
							<FinIcon icon={a.icon} size={24} />
							<span class="flex-1 text-sm">{a.name}</span>
							<span class="text-sm tabular">{formatMoney(a.balance)}</span>
							<ActionButton
								action="?/restore"
								id={a.id}
								label="Вернуть"
								size="icon-sm"
								success="Счёт снова активен"
							>
								<ArchiveRestore />
							</ActionButton>
							{#if a.txCount === 0}
								<ActionButton
									action="?/delete"
									id={a.id}
									label="Удалить навсегда"
									size="icon-sm"
									confirmText="Удалить счёт «{a.name}» навсегда?"
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
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{form.id ? 'Изменить счёт' : 'Новый счёт'}</Dialog.Title>
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

			<div class="grid gap-2">
				<Label for="acc-name">Название</Label>
				<Input
					id="acc-name"
					name="name"
					bind:value={form.name}
					maxlength={40}
					placeholder="Монобанк"
					required
				/>
			</div>

			<div class="grid gap-2">
				<span class="text-sm font-medium">Иконка</span>
				<IconPicker keys={ACCOUNT_ICONS} bind:value={form.icon} />
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<div class="grid gap-2">
					<Label for="acc-type">Тип</Label>
					<NativeSelect id="acc-type" name="type" bind:value={form.type}>
						{#each Object.entries(TYPE_LABEL) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</NativeSelect>
				</div>
				<div class="grid gap-2">
					<Label for="acc-opening">Начальный остаток, ₴</Label>
					<Input
						id="acc-opening"
						name="openingBalance"
						bind:value={form.openingBalance}
						inputmode="decimal"
						placeholder="0"
					/>
				</div>
			</div>

			<label class="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					name="isDefault"
					bind:checked={form.isDefault}
					class="size-4 accent-primary"
				/>
				Основной счёт (для новых операций и Telegram)
			</label>

			{#if error}<p class="text-sm text-destructive" role="alert">{error}</p>{/if}

			<Button type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</Button>
		</form>
	</Dialog.Content>
</Dialog.Root>
