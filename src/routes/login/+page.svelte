<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Вход · Gymtrack</title></svelte:head>

<div class="grid min-h-svh place-items-center px-4 py-10">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-3 flex items-center justify-center gap-2">
				<span class="bg-primary neon-ring size-3 rounded-full"></span>
				<span class="neon-text text-lg font-semibold tracking-[0.25em] uppercase">Gymtrack</span>
			</div>
			<p class="text-muted-foreground text-sm">Растёшь или нет — покажут цифры, а не ощущения.</p>
		</div>

		<Card.Root class="border-border/70">
			<Card.Header>
				<Card.Title>Вход</Card.Title>
				<Card.Description>Почта и пароль</Card.Description>
			</Card.Header>
			<Card.Content>
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
						<Input
							id="password"
							name="password"
							type="password"
							autocomplete="current-password"
							required
						/>
					</div>

					{#if form?.message}
						<p class="text-destructive text-sm">{form.message}</p>
					{/if}

					<Button type="submit" disabled={loading} class="w-full">
						{loading ? 'Входим…' : 'Войти'}
					</Button>
				</form>
			</Card.Content>
			<Card.Footer>
				<p class="text-muted-foreground text-sm">
					Нет аккаунта? <a href="/register" class="text-primary hover:underline">Регистрация</a>
				</p>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
