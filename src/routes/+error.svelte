<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import Mascot from '$lib/components/mascot.svelte';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head><title>{page.status} · Monio</title></svelte:head>

<div class="grid min-h-[60svh] place-items-center px-4 text-center">
	<div class="flex max-w-sm flex-col items-center">
		<Mascot size={88} mood="wow" />
		<p class="mt-4 font-display text-5xl font-semibold tracking-[-0.04em] tabular">{page.status}</p>
		<p class="mt-2 font-display text-lg font-semibold">
			{notFound ? 'Такой страницы нет' : 'Что-то пошло не так'}
		</p>
		<p class="mt-1 text-sm text-muted-foreground">
			{#if notFound}
				Мони поискал везде — пусто. Проверь адрес или вернись на обзор.
			{:else}
				Обнови страницу через пару секунд. Если ошибка повторяется — подробности в терминале, где
				запущен <code>npm run dev</code>.
			{/if}
		</p>
		<Button href="/" class="mt-5">На обзор</Button>
	</div>
</div>
