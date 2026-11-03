<!-- src/lib/components/sidebar/Sidebar.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import { isActive, navFor, type NavItem } from '$lib/nav';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import NavIcon from './nav-icon.svelte';

	/**
	 * Бічна колонка як у ClickUp: вузька, іконки з короткими підписами, повна
	 * назва розділу — у підказці збоку. Колір — з теми (налаштування).
	 *
	 * Вибраний розділ — біла плитка, а іконка на ній «випалена» кольором
	 * сайдбару. Угорі — продажі й сайт, унизу — службове самої CRM (команда,
	 * бот). Налаштування тут немає: вони в меню профілю в шапці.
	 */
	let {
		user,
		newOrders = 0
	}: {
		user: { role: string };
		newOrders?: number;
	} = $props();

	const items = $derived(navFor(user.role));
	const main = $derived(items.filter((item) => !item.system));
	const system = $derived(items.filter((item) => item.system));
	const pathname = $derived(page.url.pathname);
</script>

{#snippet navLink(item: NavItem)}
	{@const active = isActive(pathname, item.href)}
	{@const badge = item.href === '/orders' ? newOrders : 0}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<a
					{...props}
					href={item.href}
					aria-current={active ? 'page' : undefined}
					aria-label={badge > 0 ? `${item.label} — ${badge} нових` : item.label}
					class="group flex w-full flex-col items-center gap-1 rounded-[10px] py-1 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
				>
					<span
						class="relative flex size-8 items-center justify-center rounded-[10px] transition-colors {active
							? 'bg-white text-rail'
							: 'text-white group-hover:bg-white/10'}"
					>
						<NavIcon name={item.glyph} size={22} />

						{#if badge > 0}
							<span
								class="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white ring-2 ring-rail"
								aria-hidden="true"
							>
								{badge > 9 ? '9+' : badge}
							</span>
						{/if}
					</span>
					<!-- Підпис короткий і дрібний — лише орієнтир; повна назва в підказці. -->
					<span
						class="max-w-full truncate text-[10px] leading-[13px] tracking-[-0.02em] text-white {active
							? 'font-semibold'
							: ''}"
					>
						{item.short}
					</span>
				</a>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content side="right" sideOffset={10}>
			{item.label}{#if badge > 0}&nbsp;· {badge} нових{/if}
		</Tooltip.Content>
	</Tooltip.Root>
{/snippet}

<Tooltip.Provider delayDuration={150}>
	<nav
		aria-label="Навігація CRM"
		class="flex h-full w-13 shrink-0 flex-col items-center gap-1 rounded-[8px] px-1 py-1.5"
		style="background: var(--rail-bg, var(--rail))"
	>
		<div class="flex w-full scrollbar-none flex-col items-center gap-0.5 overflow-y-auto">
			{#each main as item (item.href)}
				{@render navLink(item)}
			{/each}
		</div>

		{#if system.length > 0}
			<div class="mt-auto flex w-full flex-col items-center gap-0.5">
				{#each system as item (item.href)}
					{@render navLink(item)}
				{/each}
			</div>
		{/if}
	</nav>
</Tooltip.Provider>
