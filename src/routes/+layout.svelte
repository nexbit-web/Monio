<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { Toaster } from '$lib/components/ui/sonner';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Gavel from '@lucide/svelte/icons/gavel';
	import Settings from '@lucide/svelte/icons/settings';
	import LogOut from '@lucide/svelte/icons/log-out';

	let { children, data } = $props();

	const nav = [
		{ href: '/today', label: 'Дневник', icon: NotebookPen },
		{ href: '/workout', label: 'Тренировка', icon: Dumbbell },
		{ href: '/dashboard', label: 'Дашборд', icon: ChartLine },
		{ href: '/progress', label: 'Прогресс', icon: TrendingUp },
		{ href: '/verdict', label: 'Вердикт', icon: Gavel }
	];

	const isActive = (href: string) => page.url.pathname.startsWith(href);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Toaster position="top-center" richColors />

{#if data.user}
	<div class="min-h-svh pb-20 md:pb-0">
		<header class="border-border/60 bg-background/70 sticky top-0 z-30 border-b backdrop-blur-xl">
			<div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
				<a href="/today" class="flex items-center gap-2">
					<span class="bg-primary neon-ring size-2.5 rounded-full"></span>
					<span class="neon-text text-sm font-semibold tracking-[0.2em] uppercase">Gymtrack</span>
				</a>

				{#if data.deload}
					<span
						class="ml-1 rounded-full border px-2 py-0.5 text-[11px] tabular
							{data.deload.isDeloadWeek
							? 'border-signal-yellow/50 text-signal-yellow bg-signal-yellow/10'
							: 'border-border text-muted-foreground'}"
					>
						{#if data.deload.isDeloadWeek}
							Неделя {data.deload.weekIndex} · разгрузка
						{:else}
							Неделя {data.deload.weekIndex}
						{/if}
					</span>
				{/if}

				<nav class="ml-auto hidden items-center gap-1 md:flex">
					{#each nav as item (item.href)}
						<a
							href={item.href}
							class="rounded-md px-3 py-1.5 text-sm transition-colors
								{isActive(item.href)
								? 'bg-primary/10 text-primary'
								: 'text-muted-foreground hover:text-foreground'}"
						>
							{item.label}
						</a>
					{/each}
				</nav>

				<div class="ml-auto flex items-center gap-1 md:ml-2">
					<a
						href="/settings"
						class="text-muted-foreground hover:text-foreground rounded-md p-2 transition-colors"
						aria-label="Настройки"
					>
						<Settings class="size-4" />
					</a>
					<form method="POST" action="/logout">
						<button
							class="text-muted-foreground hover:text-foreground rounded-md p-2 transition-colors"
							aria-label="Выйти"
						>
							<LogOut class="size-4" />
						</button>
					</form>
				</div>
			</div>
		</header>

		<main class="mx-auto max-w-5xl px-4 py-6">
			{@render children()}
		</main>

		<nav
			class="border-border/60 bg-background/85 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-xl md:hidden"
		>
			<div class="mx-auto grid max-w-5xl grid-cols-5">
				{#each nav as item (item.href)}
					{@const Icon = item.icon}
					<a
						href={item.href}
						class="flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors
							{isActive(item.href) ? 'text-primary' : 'text-muted-foreground'}"
					>
						<Icon class="size-5" />
						{item.label}
					</a>
				{/each}
			</div>
		</nav>
	</div>
{:else}
	{@render children()}
{/if}
