<script lang="ts">
	/**
	 * Маленькая форма с одной кнопкой для действий вида «архивировать», «сделать основным».
	 * Работает и без JS; с JS — показывает тост и обновляет данные страницы.
	 */
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import toast from '$lib/toast.svelte';
	import { Button, type ButtonVariant } from '$lib/components/ui/button';

	let {
		action,
		id,
		label,
		success,
		confirmText,
		variant = 'ghost',
		size = 'sm',
		children
	}: {
		action: string;
		id: string;
		/** aria-label для кнопок-иконок */
		label?: string;
		success?: string;
		confirmText?: string;
		variant?: ButtonVariant;
		size?: 'sm' | 'icon-sm' | 'default';
		children: Snippet;
	} = $props();
</script>

<form
	method="POST"
	{action}
	use:enhance={({ cancel }) => {
		if (confirmText && !confirm(confirmText)) {
			cancel();
			return;
		}
		return async ({ result, update }) => {
			if (result.type === 'failure') toast.error(String(result.data?.message ?? 'Не получилось'));
			else if (result.type === 'success' && success) toast.success(success);
			await update({ reset: false });
		};
	}}
>
	<input type="hidden" name="id" value={id} />
	<Button type="submit" {variant} {size} aria-label={label} title={label}>
		{@render children()}
	</Button>
</form>
