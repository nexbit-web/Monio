<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import { navigating, page } from '$app/state';
	import Toaster from '$lib/components/toaster/toaster.svelte';
	import AppRail from '$lib/components/app-rail.svelte';
	import NavProgress from '$lib/components/nav-progress.svelte';
	import TxDialog from '$lib/components/tx-dialog.svelte';
	import { provideTxDialog } from '$lib/tx-dialog.svelte';
	import { accentCookie, accentCss, provideAccent } from '$lib/accent';
	import Plus from '@lucide/svelte/icons/plus';

	let { children, data } = $props();

	const txDialog = provideTxDialog(() => ({
		tz: data.tz,
		defaultAccountId: (data.accounts.find((a) => a.isDefault) ?? data.accounts[0])?.id
	}));

	/** Страницы-формы — по центру, 1010 px. Остальные (списки, карточки, графики) —
	 *  на всю ширину панели, с узкими отступами, как таблицы в ClickUp. */
	const CENTERED = ['/settings'];
	/** Страницы с карточками — на чёрной подложке в тёмной теме, чтобы карточки
	 *  #111 читались контрастно. */
	const CANVAS = ['/', '/reports', '/accounts'];

	// Пока грузится следующая страница, отступы уже как у неё — без прыжка.
	const shownPath = $derived(navigating.to?.url.pathname ?? page.url.pathname);
	const centered = $derived(CENTERED.some((p) => shownPath === p || shownPath.startsWith(`${p}/`)));
	const canvas = $derived(CANVAS.includes(shownPath));

	// Цвет темы: из cookie (сервер), а после выбора в настройках — сразу тут,
	// без перезагрузки.
	let picked = $state<string | null>(null);
	const accent = $derived(picked ?? data.accent);
	const accentStyle = $derived(`<style>${accentCss(accent)}</style>`);

	provideAccent({
		get current() {
			return accent;
		},
		set(id) {
			picked = id;
			if (data.user) {
				document.cookie = `${accentCookie(data.user.id)}=${id}; path=/; max-age=31536000; samesite=lax`;
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- Переменные цвета темы. Содержимое — только из фиксированного списка
	     ACCENTS, ввод пользователя сюда не попадает. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html accentStyle}
</svelte:head>

<ModeWatcher defaultMode="system" />
<NavProgress />

{#if data.user}
	<!-- Оболочка как в ClickUp: серое полотно, на нём колонка разделов и белая
	     рабочая панель. Шапки нет — 6 px от краёв окна и между колонкой и панелью. -->
	<div class="flex h-svh gap-1.5 bg-shell p-1.5 max-md:pb-19">
		<div class="hidden md:block"><AppRail /></div>

		<div
			class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-border bg-panel"
		>
			<main
				class="min-h-0 flex-1 overflow-auto {centered
					? 'p-4 md:p-6'
					: 'pt-2 pr-2 pb-2 pl-3'} {canvas ? 'bg-canvas' : ''}"
			>
				<div class="w-full {centered ? 'mx-auto max-w-252.5' : ''}">
					{@render children()}
				</div>
			</main>
		</div>
	</div>

	<!-- телефон: навигация снизу и кнопка быстрого добавления -->
	<div class="md:hidden"><AppRail variant="bottom" /></div>
	<button
		class="fixed right-4 bottom-22 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
		aria-label="Добавить операцию"
		onclick={() => txDialog.show()}
	>
		<Plus class="size-6" />
	</button>

	<TxDialog categories={data.categories} accounts={data.accounts} />
	<!-- Тосты — в левом нижнем углу рабочей панели (колонка 52 px + отступы). -->
	<Toaster class="bottom-21 left-3 md:bottom-4.5 md:left-19" />
{:else}
	{@render children()}
	<Toaster class="bottom-4 left-4" />
{/if}
