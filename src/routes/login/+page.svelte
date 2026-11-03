<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import AuthShell from '$lib/components/auth-shell.svelte';

	let { data, form } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Вход · Monio</title></svelte:head>

<AuthShell title="Вход" subtitle="Почта и пароль">
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
		<input type="hidden" name="redirectTo" value={data.redirectTo} />

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
			<Input id="password" name="password" type="password" autocomplete="current-password" required />
		</div>

		{#if form?.message}
			<p class="text-sm text-destructive" role="alert">{form.message}</p>
		{/if}

		<Button type="submit" size="lg" disabled={loading} class="w-full">
			{loading ? 'Входим…' : 'Войти'}
		</Button>
	</form>

	{#snippet footer()}
		Нет аккаунта? <a href="/register" class="font-medium text-link hover:underline">Регистрация</a>
	{/snippet}
</AuthShell>
