<script lang="ts">
	/**
	 * Боковая колонка как в ClickUp (из CRM LILY LOOK): узкая, иконки с короткими
	 * подписями, полное название раздела — в подсказке сбоку. Цвет — из темы
	 * (настройки): чёрный или градиент выбранного цвета.
	 *
	 * Выбранный раздел — белая плитка, а иконка на ней «выжжена» цветом колонки.
	 * Шапки у Monio нет, поэтому сверху — логотип и кнопка новой операции,
	 * внизу — настройки.
	 *
	 * На телефоне те же разделы уезжают в нижнюю панель.
	 */
	import { page } from '$app/state';
	import { NAV, isActive, type NavItem } from '$lib/nav';
	import { useTxDialog } from '$lib/tx-dialog.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import Mascot from './mascot.svelte';
	import NavIcon from './nav-icon.svelte';
	import Plus from '@lucide/svelte/icons/plus';

	let { variant = 'side' }: { variant?: 'side' | 'bottom' } = $props();

	const dialog = useTxDialog();
	const main = NAV.filter((item) => !item.system);
	const system = NAV.filter((item) => item.system);
	const pathname = $derived(page.url.pathname);
</script>

{#snippet tile(item: NavItem, active: boolean)}
	<span
		class="relative flex size-8 items-center justify-center rounded-[10px] transition-colors {active
			? 'bg-white text-rail'
			: 'text-white group-hover:bg-white/10'}"
	>
		<NavIcon name={item.glyph} size={22} />
	</span>
	<!-- Подпись короткая и мелкая — только ориентир; полное название в подсказке. -->
	<span
		class="max-w-full truncate text-[10px] leading-[13px] tracking-[-0.02em] text-white {active
			? 'font-semibold'
			: ''}"
	>
		{item.short}
	</span>
{/snippet}

{#snippet navLink(item: NavItem)}
	{@const active = isActive(pathname, item.href)}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<a
					{...props}
					href={item.href}
					aria-current={active ? 'page' : undefined}
					aria-label={item.label}
					class="group flex w-full flex-col items-center gap-1 rounded-[10px] py-1 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
				>
					{@render tile(item, active)}
				</a>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content side="right" sideOffset={10}>{item.label}</Tooltip.Content>
	</Tooltip.Root>
{/snippet}

{#if variant === 'side'}
	<Tooltip.Provider delayDuration={150}>
		<nav
			aria-label="Навигация Monio"
			class="flex h-full w-13 shrink-0 flex-col items-center gap-1 rounded-[8px] px-1 py-1.5"
			style="background: var(--rail-bg, var(--rail))"
		>
			<a
				href="/"
				aria-label="Monio — обзор"
				class="mt-0.5 rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-white/40"
			>
				<Mascot size={30} tone="light" />
			</a>

			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							aria-label="Новая операция"
							class="mt-1 flex size-8 items-center justify-center rounded-[10px] bg-white/15 text-white transition-colors outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/40"
							onclick={() => dialog.show()}
						>
							<Plus size={18} />
						</button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content side="right" sideOffset={10}>Новая операция</Tooltip.Content>
			</Tooltip.Root>

			<span class="my-1 h-px w-6 bg-white/15" aria-hidden="true"></span>

			<div class="scrollbar-none flex w-full flex-col items-center gap-0.5 overflow-y-auto">
				{#each main as item (item.href)}
					{@render navLink(item)}
				{/each}
			</div>

			<div class="mt-auto flex w-full flex-col items-center gap-0.5">
				{#each system as item (item.href)}
					{@render navLink(item)}
				{/each}
			</div>
		</nav>
	</Tooltip.Provider>
{:else}
	<nav
		aria-label="Навигация Monio"
		class="fixed inset-x-1.5 bottom-1.5 z-30 flex rounded-[8px] px-1 py-1.5 shadow-lg"
		style="background: var(--rail-bg, var(--rail))"
	>
		{#each NAV as item (item.href)}
			{@const active = isActive(pathname, item.href)}
			<a
				href={item.href}
				aria-current={active ? 'page' : undefined}
				aria-label={item.label}
				class="group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[10px] py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
			>
				{@render tile(item, active)}
			</a>
		{/each}
	</nav>
{/if}
