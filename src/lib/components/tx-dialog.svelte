<script lang="ts">
	import FinIcon from './fin-icon.svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import toast from '$lib/toast.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import NativeSelect from '$lib/components/native-select.svelte';
	import { useTxDialog, type TxType } from '$lib/tx-dialog.svelte';
	import { cn } from '$lib/utils';

	type Ref = { id: string; name: string; icon: string };

	let {
		categories,
		accounts
	}: {
		categories: (Ref & { kind: 'EXPENSE' | 'INCOME' })[];
		accounts: (Ref & { isDefault: boolean })[];
	} = $props();

	const dialog = useTxDialog();

	let saving = $state(false);
	let error = $state('');
	let amountEl = $state<HTMLInputElement | null>(null);

	const TYPES: { value: TxType; label: string }[] = [
		{ value: 'EXPENSE', label: 'Расход' },
		{ value: 'INCOME', label: 'Доход' },
		{ value: 'TRANSFER', label: 'Перевод' }
	];

	const visibleCategories = $derived(categories.filter((c) => c.kind === dialog.type));

	function setType(t: TxType) {
		if (t === dialog.type) return;
		dialog.type = t;
		dialog.categoryId = '';
		if (t === 'TRANSFER' && !dialog.toAccountId) {
			dialog.toAccountId = accounts.find((a) => a.id !== dialog.accountId)?.id ?? '';
		}
	}

	$effect(() => {
		if (!dialog.open) error = '';
	});
</script>

<Dialog.Root bind:open={dialog.open}>
	<Dialog.Content
		class="max-h-[92svh] overflow-y-auto sm:max-w-lg"
		onOpenAutoFocus={(e) => {
			e.preventDefault();
			amountEl?.focus();
		}}
	>
		<Dialog.Header>
			<Dialog.Title>{dialog.id ? 'Редактировать операцию' : 'Новая операция'}</Dialog.Title>
		</Dialog.Header>

		<form
			method="POST"
			action="/transactions?/save"
			class="grid gap-4"
			use:enhance={({ submitter }) => {
				saving = true;
				error = '';
				const again = submitter?.getAttribute('data-again') === 'true';
				const deleting = submitter?.getAttribute('formaction')?.endsWith('/delete') ?? false;
				return async ({ result }) => {
					saving = false;
					if (result.type === 'success') {
						toast.success(deleting ? 'Удалено' : dialog.id ? 'Сохранено' : 'Записано');
						if (again) {
							dialog.resetForNext();
							amountEl?.focus();
						} else {
							dialog.open = false;
						}
						await invalidateAll();
					} else if (result.type === 'failure') {
						error = String(result.data?.message ?? 'Не удалось сохранить');
					} else if (result.type === 'redirect') {
						await goto(result.location);
					} else {
						error = 'Ошибка сервера, попробуй ещё раз';
					}
				};
			}}
		>
			{#if dialog.id}<input type="hidden" name="id" value={dialog.id} />{/if}
			<input type="hidden" name="type" value={dialog.type} />

			<div
				class="grid h-8 grid-cols-3 rounded-[8px] bg-foreground/6 p-0.5"
				role="radiogroup"
				aria-label="Тип"
			>
				{#each TYPES as t (t.value)}
					<button
						type="button"
						role="radio"
						aria-checked={dialog.type === t.value}
						class={cn(
							'rounded-[6px] text-[13px] font-medium transition-colors',
							dialog.type === t.value
								? 'bg-card text-foreground shadow-sm ring-1 ring-border'
								: 'text-muted-foreground hover:text-foreground'
						)}
						onclick={() => setType(t.value)}
					>
						{t.label}
					</button>
				{/each}
			</div>

			<div class="grid gap-2">
				<Label for="tx-amount">Сумма, ₴</Label>
				<Input
					id="tx-amount"
					name="amount"
					bind:ref={amountEl}
					bind:value={dialog.amount}
					inputmode="decimal"
					autocomplete="off"
					placeholder="0"
					required
					class="h-12 text-2xl font-semibold tabular md:text-2xl"
				/>
			</div>

			{#if dialog.type !== 'TRANSFER'}
				<fieldset class="grid gap-2">
					<legend class="mb-2 text-sm font-medium">Категория</legend>
					{#if dialog.categoryId && !visibleCategories.some((c) => c.id === dialog.categoryId)}
						<!-- категория операции в архиве: сохраняем её, пока не выбрали другую -->
						<input type="hidden" name="categoryId" value={dialog.categoryId} />
						<p class="text-xs text-muted-foreground">Категория этой операции в архиве.</p>
					{/if}
					<div class="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
						{#each visibleCategories as c (c.id)}
							<label class="cursor-pointer">
								<input
									type="radio"
									name="categoryId"
									value={c.id}
									bind:group={dialog.categoryId}
									class="peer sr-only"
								/>
								<span
									class="inline-flex items-center gap-1.5 rounded-full border border-border py-1 pr-2.5 pl-2 text-xs text-muted-foreground transition-colors peer-checked:border-transparent peer-checked:bg-violet/15 peer-checked:font-medium peer-checked:text-violet peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:text-foreground"
								>
									<FinIcon icon={c.icon} size={16} tile={false} />{c.name}
								</span>
							</label>
						{/each}
					</div>
				</fieldset>
			{/if}

			<div class="grid gap-3 sm:grid-cols-2">
				<div class="grid gap-2">
					<Label for="tx-account">{dialog.type === 'TRANSFER' ? 'Со счёта' : 'Счёт'}</Label>
					<NativeSelect id="tx-account" name="accountId" bind:value={dialog.accountId} required>
						{#each accounts as a (a.id)}
							<option value={a.id}>{a.name}</option>
						{/each}
					</NativeSelect>
				</div>

				{#if dialog.type === 'TRANSFER'}
					<div class="grid gap-2">
						<Label for="tx-to">На счёт</Label>
						<NativeSelect id="tx-to" name="toAccountId" bind:value={dialog.toAccountId} required>
							{#each accounts.filter((a) => a.id !== dialog.accountId) as a (a.id)}
								<option value={a.id}>{a.name}</option>
							{/each}
						</NativeSelect>
					</div>
				{/if}

				<div class="grid gap-2">
					<Label for="tx-when">Дата и время</Label>
					<Input
						id="tx-when"
						name="occurredAt"
						type="datetime-local"
						bind:value={dialog.occurredAt}
						required
					/>
				</div>
			</div>

			<div class="grid gap-2">
				<Label for="tx-note">Комментарий</Label>
				<Input
					id="tx-note"
					name="note"
					bind:value={dialog.note}
					maxlength={500}
					placeholder="Например: АТБ, хлеб и молоко"
				/>
			</div>

			{#if error}
				<p class="text-sm text-destructive" role="alert">{error}</p>
			{/if}

			<div class="flex flex-wrap items-center gap-2 pt-1">
				<Button type="submit" disabled={saving} class="min-w-28">
					{saving ? 'Сохраняем…' : 'Сохранить'}
				</Button>
				{#if !dialog.id}
					<Button type="submit" variant="outline" disabled={saving} data-again="true">
						Сохранить и ещё
					</Button>
				{/if}
				{#if dialog.id}
					<Button
						type="submit"
						variant="destructive"
						class="ml-auto"
						disabled={saving}
						formaction="/transactions?/delete"
						formnovalidate
						onclick={(e) => {
							if (!confirm('Удалить операцию? Это нельзя отменить.')) e.preventDefault();
						}}
					>
						Удалить
					</Button>
				{/if}
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
