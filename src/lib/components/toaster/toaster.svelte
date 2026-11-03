<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	// Иконки по одной: импорт всего @lucide/svelte в dev грузит тысячи модулей.
	import Check from '@lucide/svelte/icons/check';
	import Info from '@lucide/svelte/icons/info';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import X from '@lucide/svelte/icons/x';
	import { toasts, type ToastAction, type ToastItem, type ToastTone } from '$lib/toast.svelte';

	/**
	 * Стос тостів у стилі ClickUp. Місце задає батько (`class`): у CRM —
	 * лівий нижній кут робочої панелі, на сторінці входу — кут вікна.
	 *
	 * Клавіші, поки тост на екрані (і фокус не в полі вводу):
	 * 1, 2, 3 — дії найсвіжішого тосту (1 — головна, праворуч);
	 * Ctrl Z / ⌘Z — «Скасувати».
	 */
	let { class: className = '' }: { class?: string } = $props();

	const TONE_ICONS: Record<Exclude<ToastTone, 'neutral' | 'loading'>, typeof Check> = {
		success: Check,
		error: X,
		info: Info,
		warning: TriangleAlert
	};

	/** Кружечок під значком: зелений, червоний, синій, бурштиновий. */
	const TONE_DOTS: Record<Exclude<ToastTone, 'neutral' | 'loading'>, string> = {
		success: 'bg-[#2ea56d]',
		error: 'bg-[#e5484d]',
		info: 'bg-[#0090ff]',
		warning: 'bg-[#f5a524]'
	};

	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
	const undoKeys = isMac ? '⌘Z' : 'Ctrl Z';

	/** Гарячі клавіші не перехоплюємо, поки людина друкує. */
	function typing(target: EventTarget | null): boolean {
		return (
			target instanceof HTMLElement &&
			(target.isContentEditable || target.closest('input, textarea, select') !== null)
		);
	}

	function runAction(item: ToastItem, action: ToastAction) {
		toasts.dismiss(item.id);
		action.run();
	}

	function runUndo(item: ToastItem) {
		toasts.dismiss(item.id);
		item.undo?.();
	}

	function onkeydown(event: KeyboardEvent) {
		if (toasts.items.length === 0 || event.altKey || typing(event.target)) return;
		const newest = [...toasts.items].reverse();

		if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
			const item = newest.find((candidate) => candidate.undo);
			if (!item) return;
			event.preventDefault();
			runUndo(item);
			return;
		}

		if (event.ctrlKey || event.metaKey || !/^[1-9]$/.test(event.key)) return;
		const item = newest.find((candidate) => candidate.actions?.length);
		const actions = item?.actions ?? [];
		const action = actions[actions.length - Number(event.key)];
		if (!item || !action) return;
		event.preventDefault();
		runAction(item, action);
	}

	/** Кнопки картки: невисокі, з тонкою рамкою; головна — залита. */
	const button =
		'flex h-7 shrink-0 items-center gap-2 rounded-[7px] px-2.5 text-[12.5px] font-medium transition-colors';
	const secondary =
		'border border-[#e2e2e2] bg-white text-[#3a3a3a] hover:bg-[#f5f5f5] dark:border-white/10 dark:bg-transparent dark:text-[#dddddd] dark:hover:bg-white/6';
	const main =
		'bg-[#202020] text-white hover:bg-[#333] dark:bg-[#eeeeee] dark:text-[#111] dark:hover:bg-white';
	const hint = 'text-[#9a9a9a] dark:text-[#7c7c7c]';

	const rich = (item: ToastItem) =>
		Boolean(item.subject || item.description || item.actions?.length);
</script>

<svelte:window {onkeydown} />

{#snippet icon(item: ToastItem)}
	{#if item.tone === 'loading'}
		<LoaderCircle size={15} class="shrink-0 animate-spin text-muted-foreground" />
	{:else if item.icon}
		<span
			class="flex size-4 shrink-0 items-center justify-center rounded-full text-white {item.iconClass ??
				'bg-foreground/40'}"
		>
			<item.icon size={10} strokeWidth={2.75} />
		</span>
	{:else if item.tone !== 'neutral'}
		{@const Icon = TONE_ICONS[item.tone]}
		<span
			class="flex size-4 shrink-0 items-center justify-center rounded-full text-white {TONE_DOTS[
				item.tone
			]}"
		>
			<Icon size={10} strokeWidth={3.5} />
		</span>
	{/if}
{/snippet}

{#snippet undoButton(item: ToastItem)}
	<button type="button" class="{button} {secondary}" onclick={() => runUndo(item)}>
		Скасувати
		<span class={hint}>{undoKeys}</span>
	</button>
{/snippet}

<section
	aria-label="Сповіщення"
	class="pointer-events-none fixed z-100 flex flex-col items-start gap-2.5 {className}"
>
	{#each toasts.items as item (item.id)}
		<!-- Картка як у ClickUp: у світлій темі біла, у темній — графітова,
		     тонка рамка й мʼяка тінь. Хрестик завжди на куті. -->
		<div
			animate:flip={{ duration: 200 }}
			in:fly={{ y: 12, duration: 200 }}
			out:fly={{ x: -20, duration: 150 }}
			role={item.tone === 'error' ? 'alert' : 'status'}
			class="group pointer-events-auto relative w-max max-w-[min(384px,calc(100vw-32px))] rounded-[12px] border border-[#e6e6e6] bg-white text-[#202020] shadow-[0_6px_24px_-6px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-[#1b1b1b] dark:text-[#eeeeee] dark:shadow-[0_8px_28px_-6px_rgba(0,0,0,0.6)] {rich(
				item
			)
				? 'min-w-64 px-3.5 pt-3 pb-3.5'
				: 'py-2.5 pr-2.5 pl-3.5'}"
			onmouseenter={() => toasts.pause()}
			onmouseleave={() => toasts.resume()}
		>
			{#if rich(item)}
				<div class="flex items-center gap-1.5 pr-5">
					{@render icon(item)}
					<p class="text-[13px] leading-5 font-semibold">{item.title}</p>
				</div>
				{#if item.subject || item.description}
					<p
						class="mt-0.5 truncate pr-5 text-[12.5px] leading-5 text-[#6b6b6b] dark:text-[#a8a8a8]"
					>
						{#if item.subject}
							<span class="font-semibold text-[#202020] dark:text-[#eeeeee]">{item.subject}</span>
						{/if}{item.description ?? ''}
					</p>
				{/if}
				{#if item.actions?.length || item.undo}
					<div class="mt-2.5 flex flex-wrap items-center gap-1.5">
						{#if item.undo}{@render undoButton(item)}{/if}
						{#each item.actions ?? [] as action, index (action.label)}
							{@const primary = index === (item.actions?.length ?? 0) - 1}
							{@const key = (item.actions?.length ?? 0) - index}
							<button
								type="button"
								class="{button} {primary ? main : secondary}"
								onclick={() => runAction(item, action)}
							>
								{action.label}
								{#if key <= 9}
									<span class="tabular-nums {primary ? 'opacity-55' : hint}">{key}</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			{:else}
				<div class="flex min-h-7 items-center gap-2 pr-1">
					{@render icon(item)}
					<p class="min-w-0 flex-1 text-[13px] leading-5 font-medium">{item.title}</p>
					{#if item.undo}<span class="ml-3">{@render undoButton(item)}</span>{/if}
				</div>
			{/if}

			<!-- Хрестик — лише під курсором (і з клавіатури; на сенсорних екранах видно завжди). -->
			<button
				type="button"
				aria-label="Закрити"
				class="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border border-[#e2e2e2] bg-white text-[#555] opacity-0 transition-[opacity,background-color,color] group-hover:opacity-100 hover:bg-[#f2f2f2] hover:text-[#111] focus-visible:opacity-100 dark:border-white/15 dark:bg-[#1b1b1b] dark:text-[#cfcfcf] dark:hover:bg-[#2a2a2a] dark:hover:text-white [@media(hover:none)]:opacity-100"
				onclick={() => toasts.dismiss(item.id)}
			>
				<X size={13} strokeWidth={2.25} />
			</button>
		</div>
	{/each}
</section>
