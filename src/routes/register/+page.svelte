<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import AuthShell from '$lib/components/auth-shell.svelte';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Регистрация · Monio</title></svelte:head>

<AuthShell title="Регистрация" subtitle="Стартовые счета и категории создадим сами">
	<form
		method="POST"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
		class="grid gap-4"
	>
		<div class="grid gap-2">
			<Label for="name">Имя <span class="text-muted-foreground">(не обязательно)</span></Label>
			<Input id="name" name="name" autocomplete="given-name" value={form?.name ?? ''} />
		</div>

		<div class="grid gap-2">
			<Label for="email">Почта</Label>
			<Input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				required
				value={form?.email ?? ''}
			/>
		</div>

		<div class="grid gap-2">
			<Label for="password">Пароль</Label>
			<Input
				id="password"
				name="password"
				type="password"
				autocomplete="new-password"
				minlength={8}
				required
			/>
		</div>

		{#if form?.message}
			<p class="text-sm text-destructive" role="alert">{form.message}</p>
		{/if}

		<Button type="submit" size="lg" disabled={loading} class="w-full">
			{loading ? 'Создаём…' : 'Создать аккаунт'}
		</Button>
	</form>

	{#snippet footer()}
		Уже есть аккаунт? <a href="/login" class="font-medium text-link hover:underline">Войти</a>
	{/snippet}
</AuthShell>
