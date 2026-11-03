<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { todayISO } from '$lib/date';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Регистрация · Gymtrack</title></svelte:head>

<div class="grid min-h-svh place-items-center px-4 py-10">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-3 flex items-center justify-center gap-2">
				<span class="bg-primary neon-ring size-3 rounded-full"></span>
				<span class="neon-text text-lg font-semibold tracking-[0.25em] uppercase">Gymtrack</span>
			</div>
			<p class="text-muted-foreground text-sm">4 дня в неделю, верх/низ, двойная прогрессия.</p>
		</div>

		<Card.Root class="border-border/70">
			<Card.Header>
				<Card.Title>Регистрация</Card.Title>
				<Card.Description>Займёт минуту</Card.Description>
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

					<div class="grid gap-2">
						<Label for="name">Имя <span class="text-muted-foreground">(не обязательно)</span></Label
						>
						<Input id="name" name="name" value={form?.name ?? ''} />
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div class="grid gap-2">
							<Label for="heightCm">Рост, см</Label>
							<Input id="heightCm" name="heightCm" type="number" step="0.5" inputmode="decimal" />
						</div>
						<div class="grid gap-2">
							<Label for="programStart">Старт программы</Label>
							<Input id="programStart" name="programStart" type="date" value={todayISO()} />
						</div>
					</div>

					{#if form?.message}
						<p class="text-destructive text-sm">{form.message}</p>
					{/if}

					<Button type="submit" disabled={loading} class="w-full">
						{loading ? 'Создаём…' : 'Создать аккаунт'}
					</Button>
				</form>
			</Card.Content>
			<Card.Footer>
				<p class="text-muted-foreground text-sm">
					Уже есть аккаунт? <a href="/login" class="text-primary hover:underline">Войти</a>
				</p>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
